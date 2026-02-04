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
        """Convert relative path to absolute file path"""
        # Ensure we use forward slashes for consistency, then convert to absolute path
        normalized_path = relative_path.replace("\\", "/")
        # Use Path.cwd() to get current working directory and join with the relative path
        absolute_path = Path.cwd() / normalized_path
        return absolute_path
