# app/services/branding_storage.py
"""Storage service for branding assets"""
from pathlib import Path
import shutil
import os

class BrandingStorage:
    def __init__(self, base_path: str = "uploads/branding"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def save_variant(self, employer_id: str, variant_name: str, data: bytes) -> str:
        """Save a logo variant and return its path"""
        employer_dir = self.base_path / employer_id
        employer_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = employer_dir / f"{variant_name}.png"
        file_path.write_bytes(data)
        
        # Return path with forward slashes for URLs
        return f"uploads/branding/{employer_id}/{variant_name}.png"
    
    async def get_url(self, path: str) -> str:
        """Get URL for accessing the asset"""
        # Ensure path uses forward slashes for URLs
        url_path = path.replace("\\", "/")
        # For local storage, return a protected API route
        return f"/api/employer/branding/asset/{url_path}"
    
    async def delete_all(self, employer_id: str):
        """Delete all branding assets for an employer"""
        employer_dir = self.base_path / employer_id
        if employer_dir.exists():
            shutil.rmtree(employer_dir)
    
    def get_file_path(self, relative_path: str) -> Path:
        """Convert a branding URL path to an absolute on-disk path.

        Security: callers should prefer `get_employer_file_path()` which pins access
        to a specific employer directory.
        """
        normalized_path = (relative_path or "").replace("\\", "/").lstrip("/")
        absolute_path = (Path.cwd() / normalized_path).resolve()
        allowed_root = (Path.cwd() / self.base_path).resolve()

        try:
            absolute_path.relative_to(allowed_root)
        except Exception:
            raise ValueError("Invalid branding asset path")

        return absolute_path

    def get_employer_file_path(self, employer_id: str, url_path: str) -> Path:
        """Resolve an employer-scoped branding asset path safely.

        `url_path` is expected to look like: uploads/branding/{employer_id}/.../file.png
        """
        employer_id = (employer_id or "").strip()
        if not employer_id:
            raise ValueError("Missing employer_id")

        normalized = (url_path or "").replace("\\", "/").lstrip("/")
        prefix = f"uploads/branding/{employer_id}/"
        if not normalized.startswith(prefix):
            raise ValueError("Access denied")

        remainder = normalized[len(prefix):]

        employer_root = (Path.cwd() / self.base_path / employer_id).resolve()
        asset_path = (employer_root / remainder).resolve()

        try:
            asset_path.relative_to(employer_root)
        except Exception:
            raise ValueError("Invalid branding asset path")

        return asset_path
