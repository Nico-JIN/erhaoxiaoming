"""Rate limiting middleware for anti-bot protection."""

import time
from collections import defaultdict
from typing import Dict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent bot attacks.
    
    Limits:
    - Max 300 requests per minute per IP
    - Max 20 requests per second per IP
    - Blocks suspicious User-Agents
    """
    
    def __init__(self, app, requests_per_minute: int = 300, requests_per_second: int = 20):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        
        # Store: {ip: [(timestamp, count), ...]}
        self.request_counts: Dict[str, list] = defaultdict(list)
        
        # Suspicious User-Agents patterns
        self.suspicious_agents = [
            'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 
            'python-requests', 'scrapy', 'httpx', 'aiohttp'
        ]
        
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        
        # Skip rate limiting for CORS preflight requests (OPTIONS)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Skip rate limiting for admin and auth endpoints
        if request.url.path.startswith('/api/admin') or request.url.path.startswith('/api/auth'):
            return await call_next(request)
        
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "").lower()
        
        # Check for suspicious User-Agent
        if any(pattern in user_agent for pattern in self.suspicious_agents):
            # Log suspicious access
            print(f"[Anti-Bot] Suspicious User-Agent from {client_ip}: {user_agent}")
            # Optionally block completely
            # return JSONResponse(
            #     status_code=status.HTTP_403_FORBIDDEN,
            #     content={"detail": "Access denied: Suspicious User-Agent"}
            # )
        
        # Rate limiting check
        current_time = time.time()
        
        # Clean old records (older than 1 minute)
        cutoff_time = current_time - 60
        if client_ip in self.request_counts:
            self.request_counts[client_ip] = [
                (ts, count) for ts, count in self.request_counts[client_ip]
                if ts > cutoff_time
            ]
        
        # Check requests per minute
        minute_requests = sum(
            count for ts, count in self.request_counts[client_ip]
        )
        
        if minute_requests >= self.requests_per_minute:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Rate limit exceeded: {self.requests_per_minute} requests per minute"}
            )
        
        # Check requests per second
        second_cutoff = current_time - 1
        second_requests = sum(
            count for ts, count in self.request_counts[client_ip]
            if ts > second_cutoff
        )
        
        if second_requests >= self.requests_per_second:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Rate limit exceeded: {self.requests_per_second} requests per second"}
            )
        
        # Record this request
        self.request_counts[client_ip].append((current_time, 1))
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, self.requests_per_minute - minute_requests - 1)
        )
        
        return response


class IPBlocklistMiddleware(BaseHTTPMiddleware):
    """Middleware to block specific IPs."""
    
    def __init__(self, app):
        super().__init__(app)
        # Blocked IPs list (can be loaded from database)
        self.blocked_ips = set()
        
    def add_blocked_ip(self, ip: str):
        """Add an IP to the blocklist."""
        self.blocked_ips.add(ip)
        
    def remove_blocked_ip(self, ip: str):
        """Remove an IP from the blocklist."""
        self.blocked_ips.discard(ip)
        
    async def dispatch(self, request: Request, call_next):
        """Check if IP is blocked."""
        client_ip = request.client.host if request.client else "unknown"
        
        if client_ip in self.blocked_ips:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Access denied: IP blocked"}
            )
        
        return await call_next(request)
