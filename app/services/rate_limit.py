"""
Rate limiting middleware to prevent abuse
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


def get_limiter():
    """Create and configure rate limiter"""
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["200/day", "50/hour"],
        storage_uri="memory://",  # Use in-memory storage
        headers_enabled=True,
    )
    return limiter
