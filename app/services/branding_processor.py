# app/services/branding_processor.py
"""Image processing service for tenant branding"""
from PIL import Image
import io
import colorsys

class BrandingProcessor:
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_MIMES = {'image/png', 'image/jpeg', 'image/jpg'}
    MAX_DIMENSIONS = (2000, 2000)
    
    async def process_upload(self, file_bytes: bytes, filename: str, mime_type: str):
        """Process uploaded logo and generate variants"""
        
        # 1. Validate MIME type
        if mime_type not in self.ALLOWED_MIMES:
            raise ValueError(f"Unsupported file type: {mime_type}. Use PNG or JPEG.")
        
        # 2. Validate size
        if len(file_bytes) > self.MAX_FILE_SIZE:
            raise ValueError("File too large. Maximum size is 5MB.")
        
        # 3. Open and validate image
        try:
            # Create BytesIO from bytes
            img_buffer = io.BytesIO(file_bytes)
            img_buffer.seek(0)  # Ensure we're at the start
            
            # Debug: check file header
            header = file_bytes[:16]
            print(f"File header (first 16 bytes): {header.hex()}")
            
            img = Image.open(img_buffer)
            img.load()  # Force load to verify it's a valid image
            print(f"Image format: {img.format}, size: {img.size}, mode: {img.mode}")
        except Exception as e:
            print(f"Full error: {repr(e)}")
            raise ValueError(f"Invalid image file: {str(e)}")
        
        # Validate dimensions and resize if needed
        if img.width > self.MAX_DIMENSIONS[0] or img.height > self.MAX_DIMENSIONS[1]:
            img.thumbnail(self.MAX_DIMENSIONS, Image.Resampling.LANCZOS)
        
        # 4. Generate variants
        variants = {}
        
        # Original (optimized)
        variants['original'] = self._optimize_image(img)
        
        # Transparent (already done for current logo)
        if self._has_transparency(img):
            variants['transparent'] = variants['original']
        else:
            variants['transparent'] = self._simple_transparent(img)
        
        # Monochrome
        variants['monochrome'] = self._create_monochrome(img)
        
        # Favicon
        variants['favicon'] = self._create_favicon(img)
        
        # 5. Extract dominant color
        color = self._extract_color(img)
        
        # 6. Metadata
        metadata = {
            'dimensions': {'width': img.width, 'height': img.height},
            'has_transparency': self._has_transparency(img),
            'dominant_color': color
        }
        
        return variants, metadata
    
    def _simple_transparent(self, img: Image.Image) -> bytes:
        """Simple transparency: make white areas transparent"""
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        data = img.load()
        width, height = img.size
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = data[x, y]
                # Make white/near-white pixels transparent
                if r > 240 and g > 240 and b > 240:
                    data[x, y] = (255, 255, 255, 0)
        
        output = io.BytesIO()
        img.save(output, format='PNG', optimize=True)
        return output.getvalue()
    
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
    
    def _extract_color(self, img: Image.Image) -> str:
        """Extract dominant color and desaturate for accessibility"""
        # Simple approach: get color from center of image
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Sample center region
        width, height = img.size
        center_x, center_y = width // 2, height // 2
        sample_size = min(width, height) // 4
        
        # Get average color in center region
        region = img.crop((
            center_x - sample_size,
            center_y - sample_size,
            center_x + sample_size,
            center_y + sample_size
        ))
        
        # Get average RGB
        pixels = list(region.getdata())
        avg_r = sum(p[0] for p in pixels) // len(pixels)
        avg_g = sum(p[1] for p in pixels) // len(pixels)
        avg_b = sum(p[2] for p in pixels) // len(pixels)
        
        # Desaturate for subtle accent
        h, s, v = colorsys.rgb_to_hsv(avg_r/255, avg_g/255, avg_b/255)
        s = min(s, 0.4)  # Cap saturation
        v = max(v, 0.6)  # Ensure brightness
        
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
    
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
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(output, format='JPEG', quality=85, optimize=True)
        
        return output.getvalue()
