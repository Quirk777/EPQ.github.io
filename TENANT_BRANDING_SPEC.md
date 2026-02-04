# Tenant Branding System Specification

## System Architecture Overview

### Core Principles
- **Restrained**: Branding enhances professionalism without overwhelming the interface
- **Secure**: All uploads sanitized, validated, and access-controlled
- **Accessible**: WCAG 2.1 AA compliant, maintains readability
- **Auditable**: All branding changes logged with timestamp and user

---

## 1. Database Schema

### New Table: `company_branding`
```sql
CREATE TABLE company_branding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id TEXT NOT NULL UNIQUE,  -- Links to employer account
    
    -- Logo variants (file keys/paths)
    logo_original TEXT,           -- Original uploaded file
    logo_transparent TEXT,        -- Auto-generated transparent version
    logo_monochrome TEXT,         -- Black/white version for dark mode
    logo_favicon TEXT,            -- 32x32 favicon variant
    
    -- Active selections
    active_logo_variant TEXT DEFAULT 'transparent',  -- 'original', 'transparent', 'monochrome'
    
    -- Metadata
    original_filename TEXT,
    mime_type TEXT,
    file_size_bytes INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Theme tokens (optional color extraction)
    accent_color TEXT,            -- Hex color extracted from logo
    use_accent_color BOOLEAN DEFAULT 0,
    
    -- Watermark settings
    show_watermark BOOLEAN DEFAULT 0,
    watermark_opacity REAL DEFAULT 0.03,  -- Very subtle
    watermark_position TEXT DEFAULT 'center',  -- 'center', 'bottom-right'
    
    -- Audit trail
    updated_by TEXT,
    updated_at TIMESTAMP,
    
    FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE
);

CREATE INDEX idx_branding_employer ON company_branding(employer_id);
```

### Extend `employers` table
```sql
ALTER TABLE employers ADD COLUMN is_admin BOOLEAN DEFAULT 0;
ALTER TABLE employers ADD COLUMN company_name TEXT;
```

### New Table: `branding_audit_log`
```sql
CREATE TABLE branding_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'upload', 'change_variant', 'update_settings', 'delete'
    changed_fields TEXT,   -- JSON of what changed
    user_email TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    
    FOREIGN KEY (employer_id) REFERENCES employers(id)
);
```

---

## 2. API Design

### Endpoints

#### **POST /api/employer/branding/upload**
Upload a new company logo.

**Request:**
```typescript
FormData {
  logo: File  // PNG, JPG, SVG (max 5MB)
}
```

**Response:**
```json
{
  "success": true,
  "variants": {
    "original": "/uploads/branding/E-abc123/original.png",
    "transparent": "/uploads/branding/E-abc123/transparent.png",
    "monochrome": "/uploads/branding/E-abc123/monochrome.png",
    "favicon": "/uploads/branding/E-abc123/favicon.png"
  },
  "metadata": {
    "filename": "company-logo.png",
    "size_bytes": 128450,
    "dimensions": { "width": 800, "height": 200 },
    "has_transparency": false,
    "extracted_color": "#10b981"
  },
  "preview_urls": {
    "original": "https://...",
    "transparent": "https://...",
    "monochrome": "https://..."
  }
}
```

**Processing Pipeline:**
1. Validate file type, size, dimensions
2. Sanitize filename and SVG content
3. Generate transparent variant (rembg or similar)
4. Generate monochrome variant
5. Generate favicon (32x32)
6. Extract dominant color
7. Store all variants
8. Create audit log entry

---

#### **GET /api/employer/branding**
Fetch current branding settings.

**Response:**
```json
{
  "branding": {
    "has_logo": true,
    "active_variant": "transparent",
    "logo_url": "https://.../transparent.png",
    "accent_color": "#10b981",
    "use_accent_color": false,
    "watermark": {
      "enabled": false,
      "opacity": 0.03,
      "position": "center"
    },
    "uploaded_at": "2026-02-01T10:30:00Z",
    "company_name": "Holland Systems"
  },
  "variants_available": {
    "original": "https://...",
    "transparent": "https://...",
    "monochrome": "https://..."
  }
}
```

---

#### **PATCH /api/employer/branding/settings**
Update branding preferences.

**Request:**
```json
{
  "active_variant": "transparent",
  "use_accent_color": false,
  "watermark_enabled": false,
  "watermark_opacity": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "updated_fields": ["active_variant", "watermark_enabled"]
}
```

---

#### **DELETE /api/employer/branding**
Remove all branding (admin only).

**Response:**
```json
{
  "success": true,
  "message": "All branding assets deleted"
}
```

---

#### **GET /api/employer/branding/preview**
Generate preview of branding across different contexts.

**Query params:** `?variant=transparent&context=header`

**Response:**
```json
{
  "preview_html": "<div>...</div>",
  "preview_image_url": "https://.../preview.png"
}
```

---

## 3. Image Processing Pipeline

### Libraries & Tools

**Python (Backend):**
```python
# requirements.txt additions
Pillow==10.2.0           # Core image processing
rembg==2.0.50           # AI background removal
colorthief==0.2.1       # Dominant color extraction
python-magic==0.4.27    # MIME type validation
cairosvg==2.7.1        # SVG to PNG conversion (if needed)
```

**Processing Steps:**

```python
# app/services/branding_processor.py
from PIL import Image
from rembg import remove
from colorthief import ColorThief
import io
import magic

class BrandingProcessor:
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_MIMES = {'image/png', 'image/jpeg', 'image/svg+xml'}
    MAX_DIMENSIONS = (2000, 2000)
    
    async def process_upload(self, file_bytes: bytes, filename: str):
        # 1. Validate MIME type
        mime = magic.from_buffer(file_bytes, mime=True)
        if mime not in self.ALLOWED_MIMES:
            raise ValueError(f"Unsupported file type: {mime}")
        
        # 2. Validate size
        if len(file_bytes) > self.MAX_FILE_SIZE:
            raise ValueError("File too large")
        
        # 3. Open and validate image
        img = Image.open(io.BytesIO(file_bytes))
        
        # Validate dimensions
        if img.width > self.MAX_DIMENSIONS[0] or img.height > self.MAX_DIMENSIONS[1]:
            # Resize while maintaining aspect ratio
            img.thumbnail(self.MAX_DIMENSIONS, Image.Resampling.LANCZOS)
        
        # 4. Generate variants
        variants = {}
        
        # Original (optimized)
        original = self._optimize_image(img)
        variants['original'] = original
        
        # Transparent (remove background)
        if not self._has_transparency(img):
            transparent = self._remove_background(file_bytes)
            variants['transparent'] = transparent
        else:
            variants['transparent'] = original
        
        # Monochrome
        monochrome = self._create_monochrome(img)
        variants['monochrome'] = monochrome
        
        # Favicon
        favicon = self._create_favicon(img)
        variants['favicon'] = favicon
        
        # 5. Extract dominant color
        color = self._extract_color(file_bytes)
        
        # 6. Metadata
        metadata = {
            'dimensions': {'width': img.width, 'height': img.height},
            'has_transparency': self._has_transparency(img),
            'dominant_color': color
        }
        
        return variants, metadata
    
    def _remove_background(self, file_bytes: bytes) -> bytes:
        """Use rembg to remove background"""
        output = remove(file_bytes, alpha_matting=True)
        return output
    
    def _create_monochrome(self, img: Image.Image) -> bytes:
        """Convert to grayscale with transparency preserved"""
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Convert to grayscale but keep alpha
        gray = img.convert('LA').convert('RGBA')
        
        output = io.BytesIO()
        gray.save(output, format='PNG', optimize=True)
        return output.getvalue()
    
    def _create_favicon(self, img: Image.Image) -> bytes:
        """Generate 32x32 favicon"""
        favicon = img.copy()
        favicon.thumbnail((32, 32), Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        favicon.save(output, format='PNG', optimize=True)
        return output.getvalue()
    
    def _extract_color(self, file_bytes: bytes) -> str:
        """Extract dominant color and desaturate for accessibility"""
        color_thief = ColorThief(io.BytesIO(file_bytes))
        dominant = color_thief.get_color(quality=1)
        
        # Desaturate for subtle accent
        r, g, b = dominant
        h, s, v = self._rgb_to_hsv(r, g, b)
        s = min(s, 0.4)  # Cap saturation at 40%
        v = max(v, 0.6)  # Ensure minimum brightness
        
        r, g, b = self._hsv_to_rgb(h, s, v)
        return f"#{r:02x}{g:02x}{b:02x}"
    
    def _has_transparency(self, img: Image.Image) -> bool:
        """Check if image has transparent pixels"""
        if img.mode in ('RGBA', 'LA', 'PA'):
            alpha = img.getchannel('A')
            return alpha.getextrema()[0] < 255
        return False
    
    def _optimize_image(self, img: Image.Image) -> bytes:
        """Optimize image for web"""
        output = io.BytesIO()
        
        if img.mode == 'RGBA':
            img.save(output, format='PNG', optimize=True, compress_level=9)
        else:
            img.save(output, format='JPEG', quality=85, optimize=True)
        
        return output.getvalue()
    
    @staticmethod
    def _rgb_to_hsv(r, g, b):
        # Standard RGB to HSV conversion
        r, g, b = r/255.0, g/255.0, b/255.0
        mx = max(r, g, b)
        mn = min(r, g, b)
        df = mx-mn
        if mx == mn:
            h = 0
        elif mx == r:
            h = (60 * ((g-b)/df) + 360) % 360
        elif mx == g:
            h = (60 * ((b-r)/df) + 120) % 360
        elif mx == b:
            h = (60 * ((r-g)/df) + 240) % 360
        s = 0 if mx == 0 else (df/mx)
        v = mx
        return h, s, v
    
    @staticmethod
    def _hsv_to_rgb(h, s, v):
        # Standard HSV to RGB conversion
        c = v * s
        x = c * (1 - abs((h / 60) % 2 - 1))
        m = v - c
        
        if 0 <= h < 60:
            r, g, b = c, x, 0
        elif 60 <= h < 120:
            r, g, b = x, c, 0
        elif 120 <= h < 180:
            r, g, b = 0, c, x
        elif 180 <= h < 240:
            r, g, b = 0, x, c
        elif 240 <= h < 300:
            r, g, b = x, 0, c
        else:
            r, g, b = c, 0, x
        
        return int((r+m)*255), int((g+m)*255), int((b+m)*255)
```

### SVG Sanitization

```python
# app/services/svg_sanitizer.py
import xml.etree.ElementTree as ET
from defusedxml import ElementTree as DefusedET

class SVGSanitizer:
    ALLOWED_TAGS = {
        'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 
        'line', 'polyline', 'polygon', 'text', 'tspan',
        'defs', 'linearGradient', 'radialGradient', 'stop',
        'use', 'clipPath', 'mask'
    }
    
    FORBIDDEN_ATTRS = {
        'onclick', 'onload', 'onerror', 'onmouseover',
        'href', 'xlink:href'  # Prevent external resource loading
    }
    
    def sanitize(self, svg_bytes: bytes) -> bytes:
        """Remove dangerous elements from SVG"""
        tree = DefusedET.fromstring(svg_bytes)
        
        # Remove forbidden tags
        self._remove_forbidden_elements(tree)
        
        # Remove forbidden attributes
        self._remove_forbidden_attributes(tree)
        
        return ET.tostring(tree, encoding='utf-8')
    
    def _remove_forbidden_elements(self, element):
        for child in list(element):
            if child.tag.split('}')[-1] not in self.ALLOWED_TAGS:
                element.remove(child)
            else:
                self._remove_forbidden_elements(child)
    
    def _remove_forbidden_attributes(self, element):
        for attr in list(element.attrib.keys()):
            if any(forbidden in attr.lower() for forbidden in self.FORBIDDEN_ATTRS):
                del element.attrib[attr]
        
        for child in element:
            self._remove_forbidden_attributes(child)
```

---

## 4. Storage Structure

```
uploads/
  branding/
    E-abc123/  # employer_id
      original.png
      transparent.png
      monochrome.png
      favicon.png
      metadata.json
    E-xyz789/
      ...
```

### S3-Compatible Storage (Production)

```python
# app/services/storage.py
import boto3
from pathlib import Path

class BrandingStorage:
    def __init__(self, use_s3: bool = False):
        self.use_s3 = use_s3
        if use_s3:
            self.s3 = boto3.client('s3')
            self.bucket = os.getenv('S3_BUCKET_NAME')
    
    async def save_variant(self, employer_id: str, variant_name: str, data: bytes) -> str:
        """Save a logo variant and return its path/URL"""
        if self.use_s3:
            key = f"branding/{employer_id}/{variant_name}.png"
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType='image/png',
                ACL='private'  # Not publicly accessible
            )
            return key
        else:
            # Local storage
            path = Path(f"uploads/branding/{employer_id}")
            path.mkdir(parents=True, exist_ok=True)
            
            file_path = path / f"{variant_name}.png"
            file_path.write_bytes(data)
            
            return str(file_path)
    
    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        """Generate signed URL for private access"""
        if self.use_s3:
            return self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': path},
                ExpiresIn=expires_in
            )
        else:
            # For local, return a protected route
            return f"/api/employer/branding/asset/{path}"
    
    async def delete_all(self, employer_id: str):
        """Delete all branding assets for an employer"""
        if self.use_s3:
            prefix = f"branding/{employer_id}/"
            objects = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
            if 'Contents' in objects:
                delete_keys = [{'Key': obj['Key']} for obj in objects['Contents']]
                self.s3.delete_objects(
                    Bucket=self.bucket,
                    Delete={'Objects': delete_keys}
                )
        else:
            path = Path(f"uploads/branding/{employer_id}")
            if path.exists():
                shutil.rmtree(path)
```

---

## 5. Frontend Components

### Branding Settings Page

```typescript
// frontend/app/employer/settings/branding/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BrandingSettings {
  has_logo: boolean;
  active_variant: 'original' | 'transparent' | 'monochrome';
  logo_url: string;
  accent_color: string;
  use_accent_color: boolean;
  watermark: {
    enabled: boolean;
    opacity: number;
    position: string;
  };
  company_name: string;
}

export default function BrandingPage() {
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
      const res = await fetch('/api/employer/branding/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 40 }}>
      <h1>Company Branding</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>
        Customize your workspace with your company logo. It will appear in the dashboard,
        reports, and navigation.
      </p>

      {/* Upload Section */}
      <section style={cardStyle}>
        <h2>Company Logo</h2>
        
        {!settings?.has_logo ? (
          <div style={uploadZoneStyle}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              style={{ display: 'none' }}
              id="logo-upload"
            />
            <label htmlFor="logo-upload" style={uploadButtonStyle}>
              Upload Logo
            </label>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 12 }}>
              PNG, JPG, or SVG • Max 5MB • Recommended: 800×200px
            </p>
          </div>
        ) : (
          <div>
            <Image 
              src={settings.logo_url} 
              alt="Company logo" 
              width={300} 
              height={75} 
              style={{ border: '1px solid #e5e7eb', padding: 20, borderRadius: 8 }}
            />
            <button onClick={() => {/* delete */}} style={{ marginTop: 16 }}>
              Remove Logo
            </button>
          </div>
        )}
      </section>

      {/* Preview Variants */}
      {preview && (
        <section style={cardStyle}>
          <h2>Choose Logo Variant</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
            We've automatically generated variations of your logo. Select which one to use.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {['original', 'transparent', 'monochrome'].map(variant => (
              <div key={variant} style={variantCardStyle}>
                <Image 
                  src={preview.preview_urls[variant]} 
                  alt={variant}
                  width={200}
                  height={50}
                  style={{ background: '#f9fafb', padding: 20, borderRadius: 4 }}
                />
                <h3>{variant.charAt(0).toUpperCase() + variant.slice(1)}</h3>
                <button onClick={() => {/* select variant */}}>
                  Use This
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Advanced Settings */}
      {settings?.has_logo && (
        <section style={cardStyle}>
          <h2>Advanced Options</h2>
          
          <label style={labelStyle}>
            <input 
              type="checkbox" 
              checked={settings.use_accent_color}
              onChange={(e) => {/* update */}}
            />
            Use extracted accent color ({settings.accent_color})
          </label>
          
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
          
          <label style={labelStyle}>
            <input 
              type="checkbox"
              checked={settings.watermark.enabled}
              onChange={(e) => {/* update */}}
            />
            Show subtle watermark in PDFs
          </label>
          
          {settings.watermark.enabled && (
            <div style={{ marginTop: 12, marginLeft: 24 }}>
              <label style={labelStyle}>
                Opacity: {settings.watermark.opacity}
                <input 
                  type="range"
                  min="0.01"
                  max="0.1"
                  step="0.01"
                  value={settings.watermark.opacity}
                  onChange={(e) => {/* update */}}
                  style={{ marginLeft: 12, width: 200 }}
                />
              </label>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 32,
  marginBottom: 24
};

const uploadZoneStyle = {
  border: '2px dashed #cbd5e1',
  borderRadius: 8,
  padding: 60,
  textAlign: 'center' as const
};

const uploadButtonStyle = {
  display: 'inline-block',
  padding: '12px 24px',
  background: '#6366f1',
  color: '#fff',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600
};

const variantCardStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
  textAlign: 'center' as const
};

const labelStyle = {
  display: 'block',
  marginBottom: 12,
  fontSize: 14
};
```

### Logo Component (Reusable)

```typescript
// frontend/components/CompanyLogo.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CompanyLogoProps {
  variant?: 'original' | 'transparent' | 'monochrome';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { width: 120, height: 30 },
  md: { width: 200, height: 50 },
  lg: { width: 300, height: 75 }
};

export default function CompanyLogo({ 
  variant = 'transparent', 
  size = 'md',
  className = ''
}: CompanyLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetch('/api/employer/branding', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.branding?.has_logo) {
          setLogoUrl(data.branding.logo_url);
          setCompanyName(data.branding.company_name);
        }
      });
  }, []);

  if (!logoUrl) {
    // Fallback to company name
    return (
      <div className={className} style={{ fontWeight: 700, fontSize: 18 }}>
        {companyName || 'Holland Systems'}
      </div>
    );
  }

  const dimensions = SIZES[size];

  return (
    <Image
      src={logoUrl}
      alt={companyName}
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      style={{ width: 'auto', height: dimensions.height }}
      priority
    />
  );
}
```

### Integration into Existing Components

```typescript
// frontend/app/employer/_components/EmployerTopBar.tsx
import CompanyLogo from '@/components/CompanyLogo';

// Replace hardcoded logo with:
<Link href="/employer/dashboard" style={{ textDecoration: "none" }}>
  <CompanyLogo size="md" variant="transparent" />
</Link>
```

---

## 6. Backend Routes Implementation

```python
# app/routes/branding.py
from fastapi import APIRouter, UploadFile, HTTPException, Depends, Request
from app.services.branding_processor import BrandingProcessor
from app.services.storage import BrandingStorage
from app.services.svg_sanitizer import SVGSanitizer
from app.services import db
import json

router = APIRouter(prefix="/api/employer/branding", tags=["branding"])

processor = BrandingProcessor()
storage = BrandingStorage(use_s3=False)  # Set to True for production
svg_sanitizer = SVGSanitizer()


@router.post("/upload")
async def upload_logo(logo: UploadFile, request: Request):
    """Upload and process company logo"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401, "Not authenticated")
    
    # Check if user is admin
    employer = db.get_employer(employer_id)
    if not employer.get("is_admin"):
        raise HTTPException(403, "Only admins can upload branding")
    
    # Read file
    file_bytes = await logo.read()
    
    # Sanitize SVG if needed
    if logo.content_type == 'image/svg+xml':
        file_bytes = svg_sanitizer.sanitize(file_bytes)
    
    # Process upload
    try:
        variants, metadata = await processor.process_upload(file_bytes, logo.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))
    
    # Save variants
    saved_paths = {}
    for variant_name, variant_data in variants.items():
        path = await storage.save_variant(employer_id, variant_name, variant_data)
        saved_paths[variant_name] = path
    
    # Generate preview URLs
    preview_urls = {}
    for variant_name, path in saved_paths.items():
        preview_urls[variant_name] = await storage.get_signed_url(path)
    
    # Save to database
    db.execute("""
        INSERT OR REPLACE INTO company_branding 
        (employer_id, logo_original, logo_transparent, logo_monochrome, logo_favicon,
         original_filename, mime_type, file_size_bytes, accent_color, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        employer_id,
        saved_paths['original'],
        saved_paths['transparent'],
        saved_paths['monochrome'],
        saved_paths['favicon'],
        logo.filename,
        logo.content_type,
        len(file_bytes),
        metadata['dominant_color'],
        employer.get('email')
    ))
    
    # Audit log
    db.execute("""
        INSERT INTO branding_audit_log (employer_id, action, user_email, ip_address)
        VALUES (?, 'upload', ?, ?)
    """, (employer_id, employer.get('email'), request.client.host))
    
    return {
        "success": True,
        "variants": saved_paths,
        "metadata": metadata,
        "preview_urls": preview_urls
    }


@router.get("")
async def get_branding(request: Request):
    """Get current branding settings"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401, "Not authenticated")
    
    branding = db.query_one("""
        SELECT * FROM company_branding WHERE employer_id = ?
    """, (employer_id,))
    
    if not branding:
        return {"branding": {"has_logo": False}}
    
    # Get active variant URL
    variant_field = f"logo_{branding['active_logo_variant']}"
    logo_path = branding[variant_field]
    logo_url = await storage.get_signed_url(logo_path) if logo_path else None
    
    # Get all variant URLs
    variants = {}
    for var in ['original', 'transparent', 'monochrome']:
        path = branding[f'logo_{var}']
        if path:
            variants[var] = await storage.get_signed_url(path)
    
    employer = db.get_employer(employer_id)
    
    return {
        "branding": {
            "has_logo": True,
            "active_variant": branding['active_logo_variant'],
            "logo_url": logo_url,
            "accent_color": branding['accent_color'],
            "use_accent_color": bool(branding['use_accent_color']),
            "watermark": {
                "enabled": bool(branding['show_watermark']),
                "opacity": branding['watermark_opacity'],
                "position": branding['watermark_position']
            },
            "uploaded_at": branding['upload_date'],
            "company_name": employer.get('company_name', '')
        },
        "variants_available": variants
    }


@router.patch("/settings")
async def update_settings(settings: dict, request: Request):
    """Update branding preferences"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401)
    
    employer = db.get_employer(employer_id)
    if not employer.get("is_admin"):
        raise HTTPException(403, "Only admins can update branding")
    
    # Build update query dynamically
    allowed_fields = {
        'active_logo_variant': 'active_variant',
        'use_accent_color': 'use_accent_color',
        'show_watermark': 'watermark_enabled',
        'watermark_opacity': 'watermark_opacity',
        'watermark_position': 'watermark_position'
    }
    
    updates = []
    values = []
    for db_field, api_field in allowed_fields.items():
        if api_field in settings:
            updates.append(f"{db_field} = ?")
            values.append(settings[api_field])
    
    if updates:
        values.append(employer_id)
        db.execute(f"""
            UPDATE company_branding 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP, updated_by = ?
            WHERE employer_id = ?
        """, values + [employer.get('email'), employer_id])
        
        # Audit log
        db.execute("""
            INSERT INTO branding_audit_log 
            (employer_id, action, changed_fields, user_email, ip_address)
            VALUES (?, 'update_settings', ?, ?, ?)
        """, (employer_id, json.dumps(list(settings.keys())), 
              employer.get('email'), request.client.host))
    
    return {"success": True, "updated_fields": list(settings.keys())}


@router.delete("")
async def delete_branding(request: Request):
    """Delete all branding"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401)
    
    employer = db.get_employer(employer_id)
    if not employer.get("is_admin"):
        raise HTTPException(403)
    
    # Delete files
    await storage.delete_all(employer_id)
    
    # Delete from DB
    db.execute("DELETE FROM company_branding WHERE employer_id = ?", (employer_id,))
    
    # Audit log
    db.execute("""
        INSERT INTO branding_audit_log (employer_id, action, user_email)
        VALUES (?, 'delete', ?)
    """, (employer_id, employer.get('email')))
    
    return {"success": True, "message": "All branding assets deleted"}


@router.get("/asset/{path:path}")
async def get_asset(path: str, request: Request):
    """Serve branding assets (for local storage)"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401)
    
    # Verify path belongs to this employer
    if not path.startswith(f"uploads/branding/{employer_id}/"):
        raise HTTPException(403)
    
    from fastapi.responses import FileResponse
    return FileResponse(path)
```

---

## 7. UX Flow

### User Journey

1. **Access Settings**
   - Employer logs in → Dashboard → Settings → "Branding" tab
   - Only visible to admin users

2. **Upload Logo**
   - Drag & drop or click to upload
   - Real-time validation (size, type)
   - Progress indicator during processing
   - Show error messages clearly

3. **Choose Variant**
   - Display 3 previews side-by-side:
     - Original (as uploaded)
     - Transparent (background removed)
     - Monochrome (for dark themes)
   - Each preview shows the logo on different backgrounds (white, dark, colored)
   - Radio buttons to select active variant

4. **Optional Configuration**
   - Toggle extracted accent color
   - Preview accent color in UI elements
   - Watermark settings with live preview slider

5. **Apply & Preview**
   - "Save Changes" button
   - Show confirmation: "Branding updated. Refresh to see changes."
   - Preview button opens modal showing logo in:
     - Header
     - Sidebar
     - PDF header mockup

6. **Manage**
   - View current logo with upload date
   - "Replace Logo" → repeats upload flow
   - "Remove Logo" → confirmation dialog → reverts to text

---

## 8. Edge Cases & Failure Modes

### Image Quality Issues

| Issue | Detection | Solution |
|-------|-----------|----------|
| Logo too small | Check dimensions < 100px | Warn: "Logo may appear pixelated. Recommended minimum: 400px wide" |
| Logo too wide | Aspect ratio > 5:1 | Warn: "Very wide logos may not fit. Consider a square or 3:1 ratio" |
| Low contrast | Analyze color variance | Suggest monochrome variant |
| Transparent already | Check alpha channel | Skip transparent generation, use original |

### Processing Failures

```python
# Graceful fallbacks
try:
    transparent = remove_background(img)
except Exception:
    # Fallback: just copy original
    transparent = original
    metadata['background_removal_failed'] = True
```

### Upload Errors

- **File too large**: Show before upload starts
- **Invalid MIME**: Reject with clear message
- **Corrupted file**: Catch Pillow exceptions, show "File appears corrupted"
- **Timeout**: Set 30s limit, show progress, allow retry

### Watermark Readability

```python
def validate_watermark(logo_img, opacity):
    """Ensure watermark doesn't reduce readability"""
    # Calculate luminance variance
    gray = logo_img.convert('L')
    variance = np.var(np.array(gray))
    
    # If logo is mostly white/light, reject watermark
    if variance < 500:  # Low contrast
        return False, "Logo too light for watermark"
    
    # Cap opacity
    if opacity > 0.1:
        return False, "Opacity too high, max 0.1"
    
    return True, ""
```

### Security Failures

- **Malicious SVG**: Sanitizer removes scripts, external refs
- **MIME spoofing**: Use python-magic to verify actual type
- **Path traversal**: Validate employer_id in paths
- **Unauthorized access**: Session + admin check on all routes

### Database Edge Cases

- **Concurrent uploads**: Use `INSERT OR REPLACE` to handle race conditions
- **Orphaned files**: Periodic cleanup job to delete files not in DB
- **Missing files**: Catch FileNotFound, mark branding as invalid, prompt re-upload

---

## 9. Accessibility Compliance

### WCAG 2.1 AA Requirements

1. **Color Contrast**
   - If using accent color, ensure min 4.5:1 ratio against white
   - Provide contrast checker in settings
   - Auto-adjust if below threshold

2. **Alt Text**
   - All logo images must have company name as alt text
   - Screen readers announce: "Holland Systems logo"

3. **Keyboard Navigation**
   - Upload zone keyboard accessible
   - Preview selection via keyboard
   - Focus indicators visible

4. **Screen Reader Support**
   ```html
   <div role="region" aria-label="Company branding settings">
     <img src="..." alt="Holland Systems company logo" />
   </div>
   ```

---

## 10. Performance Optimization

### Image Delivery

- **Next.js Image component**: Automatic optimization, lazy loading
- **Signed URLs**: Short expiration (1 hour), cached client-side
- **CDN**: Use CloudFront or similar for S3 assets
- **Format selection**: Serve WebP where supported, fallback to PNG

### Caching Strategy

```typescript
// Frontend: Cache branding response
const CACHE_KEY = 'employer_branding_v1';
const CACHE_TTL = 3600 * 1000; // 1 hour

async function getBranding() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  }
  
  const data = await fetch('/api/employer/branding').then(r => r.json());
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
}
```

---

## 11. Deployment Checklist

### Phase 1: MVP (Local Storage)
- [  ] Database migrations
- [  ] Backend routes
- [  ] Image processing service
- [  ] Settings UI page
- [  ] Logo component
- [  ] Integration into TopBar/Sidebar
- [  ] Basic security (admin-only)

### Phase 2: Production (S3)
- [  ] S3 bucket setup
- [  ] Signed URL generation
- [  ] CDN configuration
- [  ] Environment variables
- [  ] Virus scanning (ClamAV or similar)

### Phase 3: Advanced Features
- [  ] PDF watermark integration
- [  ] Accent color theming
- [  ] Dark mode logo variant
- [  ] Audit log viewer UI
- [  ] Batch upload (multiple logos for different contexts)

---

## 12. Testing Plan

### Unit Tests
```python
# test_branding_processor.py
def test_background_removal():
    img = Image.open('test_logo_white_bg.png')
    result = processor._remove_background(img)
    assert processor._has_transparency(Image.open(BytesIO(result)))

def test_dimension_validation():
    with pytest.raises(ValueError):
        processor.process_upload(huge_image_bytes, 'huge.png')
```

### Integration Tests
```python
def test_upload_flow():
    # Upload logo
    response = client.post('/api/employer/branding/upload', 
                          files={'logo': test_image})
    assert response.status_code == 200
    
    # Verify variants created
    data = response.json()
    assert 'transparent' in data['variants']
    
    # Verify in database
    branding = db.query_one("SELECT * FROM company_branding WHERE employer_id = ?")
    assert branding is not None
```

### E2E Tests
```typescript
// cypress/e2e/branding.cy.ts
describe('Branding Upload', () => {
  it('uploads and applies logo', () => {
    cy.login('admin@company.com');
    cy.visit('/employer/settings/branding');
    
    cy.get('input[type="file"]').selectFile('test-logo.png');
    cy.contains('Choose Logo Variant');
    cy.contains('Transparent').click();
    cy.contains('Save Changes').click();
    
    cy.visit('/employer/dashboard');
    cy.get('img[alt*="company logo"]').should('be.visible');
  });
});
```

---

## Summary

This system provides:
✅ Secure, validated uploads with automatic variant generation  
✅ Professional, restrained branding placement  
✅ Accessibility-first design  
✅ Admin-only access with full audit trail  
✅ Production-ready storage with S3 support  
✅ Graceful fallbacks for edge cases  

**Next Steps:**
1. Run database migrations
2. Implement backend routes
3. Build settings UI
4. Integrate CompanyLogo component
5. Test with real logos
6. Deploy to production with S3

Let me know which part you'd like to implement first!
