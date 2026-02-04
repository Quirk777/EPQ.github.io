# app/routes/branding.py
"""Tenant branding API routes"""
from fastapi import APIRouter, UploadFile, HTTPException, Request, File
from fastapi.responses import FileResponse
from app.services.branding_processor import BrandingProcessor
from app.services.branding_storage import BrandingStorage
from app.services import db
import json
from datetime import datetime

router = APIRouter(prefix="/api/employer/branding", tags=["branding"])

processor = BrandingProcessor()
storage = BrandingStorage()


@router.post("/upload")
async def upload_logo(request: Request, logo: UploadFile = File(...)):
    """Upload and process company logo"""
    import logging
    logger = logging.getLogger("epq")
    
    employer_id = request.session.get("employer_id")
    logger.info(f"Upload attempt - employer_id: {employer_id}")
    if not employer_id:
        raise HTTPException(401, "Not authenticated")
    
    # Check if user is admin (for now, all employers are admins)
    employer = db.get_employer(employer_id)
    if not employer:
        raise HTTPException(404, "Employer not found")
    
    # Validate file
    logger.info(f"File received - filename: {logo.filename}, content_type: {logo.content_type}")
    if not logo.filename:
        logger.error("No filename provided")
        raise HTTPException(400, "No file provided")
    
    # Read file
    file_bytes = await logo.read()
    logger.info(f"File size: {len(file_bytes)} bytes")
    
    if len(file_bytes) == 0:
        logger.error("Empty file received")
        raise HTTPException(400, "Empty file")
    
    # Process upload
    try:
        logger.info("Starting image processing...")
        variants, metadata = await processor.process_upload(
            file_bytes, 
            logo.filename,
            logo.content_type or "image/png"
        )
        logger.info(f"Processing complete - variants: {list(variants.keys())}")
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(400, str(e))
    except Exception as e:
        import traceback
        logger.error(f"Processing error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"Processing failed: {str(e)}")
    
    # Save variants
    saved_paths = {}
    for variant_name, variant_data in variants.items():
        path = await storage.save_variant(employer_id, variant_name, variant_data)
        saved_paths[variant_name] = path
    
    # Generate preview URLs
    preview_urls = {}
    for variant_name, path in saved_paths.items():
        preview_urls[variant_name] = await storage.get_url(path)
    
    # Save to database
    conn = db.connect()
    conn.execute("""
        INSERT OR REPLACE INTO company_branding 
        (employer_id, logo_original, logo_transparent, logo_monochrome, logo_favicon,
         original_filename, mime_type, file_size_bytes, accent_color, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        employer.get('email', ''),
        datetime.now().isoformat()
    ))
    conn.commit()
    
    # Audit log
    conn.execute("""
        INSERT INTO branding_audit_log (employer_id, action, user_email, ip_address)
        VALUES (?, 'upload', ?, ?)
    """, (employer_id, employer.get('email', ''), request.client.host if request.client else ''))
    conn.commit()
    
    return {
        "success": True,
        "variants": saved_paths,
        "metadata": metadata,
        "preview_urls": preview_urls
    }


@router.get("")
async def get_branding(request: Request):
    """Get current branding settings"""
    import logging
    logger = logging.getLogger("epq")
    
    employer_id = request.session.get("employer_id")
    logger.info(f"Branding request - employer_id: {employer_id}")
    
    if not employer_id:
        raise HTTPException(401, "Not authenticated")
    
    conn = db.connect()
    branding = conn.execute("""
        SELECT * FROM company_branding WHERE employer_id = ?
    """, (employer_id,)).fetchone()
    
    if not branding:
        logger.info("No branding found for employer")
        employer = db.get_employer(employer_id)
        return {
            "branding": {
                "has_logo": False,
                "company_name": employer.get('company_name', '') if employer else ''
            }
        }
    
    # Convert Row to dict for easier access
    branding = dict(branding)
    logger.info(f"Raw branding data: {branding}")
    
    # Get active variant URL
    variant_field = f"logo_{branding.get('active_logo_variant', 'original')}"
    logo_path = branding.get(variant_field)
    logger.info(f"Logo path from DB: {logo_path}")
    
    logo_url = await storage.get_url(logo_path) if logo_path else None
    logger.info(f"Generated logo URL: {logo_url}")
    
    # Get all variant URLs
    variants = {}
    for var in ['original', 'transparent', 'monochrome']:
        path = branding.get(f'logo_{var}')
        if path:
            variants[var] = await storage.get_url(path)
    
    employer = db.get_employer(employer_id)
    
    result = {
        "branding": {
            "has_logo": True,
            "active_variant": branding.get('active_logo_variant', 'original'),
            "logo_url": logo_url,
            "accent_color": branding.get('accent_color'),
            "use_accent_color": bool(branding.get('use_accent_color')),
            "watermark": {
                "enabled": bool(branding.get('show_watermark')),
                "opacity": branding.get('watermark_opacity', 0.03),
                "position": branding.get('watermark_position', 'center')
            },
            "uploaded_at": branding.get('upload_date'),
            "company_name": employer.get('company_name', '') if employer else ''
        },
        "variants_available": variants
    }
    
    logger.info(f"Returning branding response: {result}")
    return result


@router.patch("/settings")
async def update_settings(request: Request):
    """Update branding preferences"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401, "Not authenticated")
    
    employer = db.get_employer(employer_id)
    if not employer:
        raise HTTPException(404, "Employer not found")
    
    settings = await request.json()
    
    # Build update query dynamically
    field_mapping = {
        'active_variant': 'active_logo_variant',
        'use_accent_color': 'use_accent_color',
        'watermark_enabled': 'show_watermark',
        'watermark_opacity': 'watermark_opacity',
        'watermark_position': 'watermark_position'
    }
    
    updates = []
    values = []
    changed = []
    
    for api_field, db_field in field_mapping.items():
        if api_field in settings:
            updates.append(f"{db_field} = ?")
            values.append(settings[api_field])
            changed.append(api_field)
    
    if updates:
        values.extend([employer.get('email', ''), datetime.now().isoformat(), employer_id])
        conn = db.connect()
        conn.execute(f"""
            UPDATE company_branding 
            SET {', '.join(updates)}, updated_by = ?, updated_at = ?
            WHERE employer_id = ?
        """, values)
        conn.commit()
        
        # Audit log
        conn.execute("""
            INSERT INTO branding_audit_log 
            (employer_id, action, changed_fields, user_email, ip_address)
            VALUES (?, 'update_settings', ?, ?, ?)
        """, (employer_id, json.dumps(changed), 
              employer.get('email', ''), request.client.host if request.client else ''))
        conn.commit()
    
    return {"success": True, "updated_fields": changed}


@router.delete("")
async def delete_branding(request: Request):
    """Delete all branding"""
    employer_id = request.session.get("employer_id")
    if not employer_id:
        raise HTTPException(401, "Not authenticated")
    
    employer = db.get_employer(employer_id)
    if not employer:
        raise HTTPException(404, "Employer not found")
    
    # Delete files
    await storage.delete_all(employer_id)
    
    # Delete from DB
    conn = db.connect()
    conn.execute("DELETE FROM company_branding WHERE employer_id = ?", (employer_id,))
    conn.commit()
    
    # Audit log
    conn.execute("""
        INSERT INTO branding_audit_log (employer_id, action, user_email)
        VALUES (?, 'delete', ?)
    """, (employer_id, employer.get('email', '')))
    conn.commit()
    
    return {"success": True, "message": "All branding assets deleted"}


@router.get("/asset/{path:path}")
async def get_asset(path: str, request: Request):
    """Serve branding assets (protected route)"""
    print(f"=== ASSET REQUEST DEBUG ===")
    print(f"Path: {path}")
    print(f"Session keys: {list(request.session.keys()) if request.session else 'No session'}")
    
    employer_id = request.session.get("employer_id") if request.session else None
    print(f"Employer ID from session: {employer_id}")
    
    # Try to get employer_id from path if not in session
    if not employer_id:
        print("No employer_id in session, trying to extract from path...")
        # Extract employer_id from path: uploads/branding/{employer_id}/...
        path_parts = path.replace("\\", "/").split("/")
        if len(path_parts) >= 3 and path_parts[0] == "uploads" and path_parts[1] == "branding":
            path_employer_id = path_parts[2]
            print(f"Extracted employer_id from path: {path_employer_id}")
            employer_id = path_employer_id
        
    if not employer_id:
        print("ERROR: Not authenticated and couldn't extract employer_id from path")
        raise HTTPException(401, "Not authenticated")
    
    # Normalize path to use forward slashes for comparison
    normalized_path = path.replace("\\", "/")
    print(f"Normalized path: {normalized_path}")
    
    # Verify path belongs to this employer
    expected_prefix = f"uploads/branding/{employer_id}/"
    print(f"Expected prefix: {expected_prefix}")
    
    if not normalized_path.startswith(expected_prefix):
        print(f"ERROR: Access denied - path doesn't start with expected prefix")
        raise HTTPException(403, "Access denied")
    
    file_path = storage.get_file_path(normalized_path)
    print(f"Full file path: {file_path}")
    print(f"File exists: {file_path.exists()}")
    
    if not file_path.exists():
        print(f"ERROR: File not found at {file_path}")
        raise HTTPException(404, "File not found")
    
    print("SUCCESS: Serving file")
    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )
