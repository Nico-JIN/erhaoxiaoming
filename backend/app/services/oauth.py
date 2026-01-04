"""OAuth integration service for QQ, WeChat, Google, GitHub."""

import httpx
from typing import Optional, Dict, Any
from backend.app.core.config import get_settings

settings = get_settings()

# SOCKS5 proxy for accessing Google/GitHub from China
PROXY_URL = "socks5://127.0.0.1:10808"

def get_proxy_client(timeout: float = 30.0) -> httpx.AsyncClient:
    """Create an httpx client with SOCKS5 proxy support."""
    try:
        from httpx_socks import AsyncProxyTransport
        transport = AsyncProxyTransport.from_url(PROXY_URL)
        return httpx.AsyncClient(transport=transport, timeout=timeout)
    except ImportError:
        # Fallback to direct connection if httpx_socks is not installed
        print("[OAuth] Warning: httpx_socks not installed, using direct connection")
        return httpx.AsyncClient(timeout=timeout)


class OAuthService:
    """Base OAuth service class."""
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user info from OAuth provider."""
        raise NotImplementedError


class QQOAuthService(OAuthService):
    """QQ OAuth service."""
    
    AUTHORIZE_URL = "https://graph.qq.com/oauth2.0/authorize"
    TOKEN_URL = "https://graph.qq.com/oauth2.0/token"
    OPENID_URL = "https://graph.qq.com/oauth2.0/me"
    USER_INFO_URL = "https://graph.qq.com/user/get_user_info"
    
    def get_authorization_url(self, state: str) -> str:
        """Get QQ authorization URL."""
        params = {
            "response_type": "code",
            "client_id": settings.QQ_APP_ID,
            "redirect_uri": settings.QQ_REDIRECT_URI,
            "state": state,
            "scope": "get_user_info"
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.AUTHORIZE_URL}?{query_string}"
    
    async def get_access_token(self, code: str) -> Optional[str]:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.TOKEN_URL,
                    params={
                        "grant_type": "authorization_code",
                        "client_id": settings.QQ_APP_ID,
                        "client_secret": settings.QQ_APP_KEY,
                        "code": code,
                        "redirect_uri": settings.QQ_REDIRECT_URI,
                    }
                )
                result = response.text
                # Parse access_token from response
                if "access_token=" in result:
                    params = dict(param.split("=") for param in result.split("&"))
                    return params.get("access_token")
            except Exception as e:
                print(f"Error getting QQ access token: {e}")
                return None
    
    async def get_openid(self, access_token: str) -> Optional[str]:
        """Get QQ OpenID."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.OPENID_URL,
                    params={"access_token": access_token}
                )
                result = response.text
                # Parse openid from JSONP callback
                if "openid" in result:
                    import json
                    import re
                    match = re.search(r'callback\((.*)\)', result)
                    if match:
                        data = json.loads(match.group(1))
                        return data.get("openid")
            except Exception as e:
                print(f"Error getting QQ openid: {e}")
                return None
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get QQ user info."""
        openid = await self.get_openid(access_token)
        if not openid:
            return {}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.USER_INFO_URL,
                    params={
                        "access_token": access_token,
                        "oauth_consumer_key": settings.QQ_APP_ID,
                        "openid": openid
                    }
                )
                data = response.json()
                return {
                    "provider_user_id": openid,
                    "username": data.get("nickname", f"qq_{openid[:8]}"),
                    "full_name": data.get("nickname", ""),
                    "avatar_url": data.get("figureurl_qq_2") or data.get("figureurl_qq_1"),
                    "raw_data": data
                }
            except Exception as e:
                print(f"Error getting QQ user info: {e}")
                return {}


class WeChatOAuthService(OAuthService):
    """WeChat OAuth service."""
    
    AUTHORIZE_URL = "https://open.weixin.qq.com/connect/qrconnect"
    TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
    USER_INFO_URL = "https://api.weixin.qq.com/sns/userinfo"
    
    def get_authorization_url(self, state: str) -> str:
        """Get WeChat authorization URL."""
        params = {
            "appid": settings.WECHAT_APP_ID,
            "redirect_uri": settings.WECHAT_REDIRECT_URI,
            "response_type": "code",
            "scope": "snsapi_login",
            "state": state
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.AUTHORIZE_URL}?{query_string}#wechat_redirect"
    
    async def get_access_token(self, code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.TOKEN_URL,
                    params={
                        "appid": settings.WECHAT_APP_ID,
                        "secret": settings.WECHAT_APP_SECRET,
                        "code": code,
                        "grant_type": "authorization_code"
                    }
                )
                data = response.json()
                if "access_token" in data:
                    return data
            except Exception as e:
                print(f"Error getting WeChat access token: {e}")
                return None
    
    async def get_user_info(self, access_token: str, openid: str = None) -> Dict[str, Any]:
        """Get WeChat user info."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.USER_INFO_URL,
                    params={
                        "access_token": access_token,
                        "openid": openid
                    }
                )
                data = response.json()
                return {
                    "provider_user_id": data.get("unionid") or data.get("openid"),
                    "username": data.get("nickname", f"wechat_{data.get('openid', '')[:8]}"),
                    "full_name": data.get("nickname", ""),
                    "avatar_url": data.get("headimgurl"),
                    "raw_data": data
                }
            except Exception as e:
                print(f"Error getting WeChat user info: {e}")
                return {}


class GoogleOAuthService(OAuthService):
    """Google OAuth service."""
    
    AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def get_authorization_url(self, state: str) -> str:
        """Get Google authorization URL."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent"
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.AUTHORIZE_URL}?{query_string}"
    
    async def get_access_token(self, code: str) -> Optional[str]:
        """Exchange authorization code for access token."""
        async with get_proxy_client() as client:
            try:
                print(f"[Google OAuth] Exchanging code for token...")
                print(f"[Google OAuth] Client ID: {settings.GOOGLE_CLIENT_ID[:20]}...")
                print(f"[Google OAuth] Redirect URI: {settings.GOOGLE_REDIRECT_URI}")
                print(f"[Google OAuth] Using proxy: {PROXY_URL}")
                
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": settings.GOOGLE_REDIRECT_URI
                    }
                )
                
                print(f"[Google OAuth] Response status: {response.status_code}")
                data = response.json()
                print(f"[Google OAuth] Response data: {data}")
                
                if "error" in data:
                    print(f"[Google OAuth] Error: {data.get('error_description', data.get('error'))}")
                    return None
                    
                access_token = data.get("access_token")
                if access_token:
                    print(f"[Google OAuth] Access token obtained successfully")
                return access_token
            except Exception as e:
                print(f"[Google OAuth] Error getting access token: {e}")
                import traceback
                traceback.print_exc()
                return None
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get Google user info."""
        async with get_proxy_client() as client:
            try:
                print(f"[Google OAuth] Getting user info...")
                response = await client.get(
                    self.USER_INFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                print(f"[Google OAuth] User info response status: {response.status_code}")
                data = response.json()
                print(f"[Google OAuth] User info: {data.get('email', 'no email')}")
                
                return {
                    "provider_user_id": data.get("id"),
                    "username": data.get("email", "").split("@")[0],
                    "email": data.get("email"),
                    "full_name": data.get("name", ""),
                    "avatar_url": data.get("picture"),
                    "is_verified": data.get("verified_email", False),
                    "raw_data": data
                }
            except Exception as e:
                print(f"[Google OAuth] Error getting user info: {e}")
                import traceback
                traceback.print_exc()
                return {}


class GitHubOAuthService(OAuthService):
    """GitHub OAuth service."""
    
    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_INFO_URL = "https://api.github.com/user"
    USER_EMAIL_URL = "https://api.github.com/user/emails"
    
    def get_authorization_url(self, state: str) -> str:
        """Get GitHub authorization URL."""
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "read:user user:email",
            "state": state
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.AUTHORIZE_URL}?{query_string}"
    
    async def get_access_token(self, code: str) -> Optional[str]:
        """Exchange authorization code for access token."""
        async with get_proxy_client() as client:
            try:
                print(f"[GitHub OAuth] Using proxy: {PROXY_URL}")
                response = await client.post(
                    self.TOKEN_URL,
                    headers={"Accept": "application/json"},
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": code,
                        "redirect_uri": settings.GITHUB_REDIRECT_URI
                    }
                )
                data = response.json()
                return data.get("access_token")
            except Exception as e:
                print(f"Error getting GitHub access token: {e}")
                return None
    
    async def get_user_email(self, access_token: str) -> Optional[str]:
        """Get user's primary email from GitHub."""
        async with get_proxy_client() as client:
            try:
                response = await client.get(
                    self.USER_EMAIL_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                emails = response.json()
                # Find primary verified email
                for email_data in emails:
                    if email_data.get("primary") and email_data.get("verified"):
                        return email_data.get("email")
                # Fallback to first verified email
                for email_data in emails:
                    if email_data.get("verified"):
                        return email_data.get("email")
            except Exception as e:
                print(f"Error getting GitHub user email: {e}")
                return None
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get GitHub user info."""
        async with get_proxy_client() as client:
            try:
                response = await client.get(
                    self.USER_INFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                data = response.json()
                
                # Get user email
                email = data.get("email")
                if not email:
                    email = await self.get_user_email(access_token)
                
                return {
                    "provider_user_id": str(data.get("id")),
                    "username": data.get("login", f"github_{data.get('id')}"),
                    "email": email,
                    "full_name": data.get("name") or data.get("login", ""),
                    "avatar_url": data.get("avatar_url"),
                    "raw_data": data
                }
            except Exception as e:
                print(f"Error getting GitHub user info: {e}")
                return {}


# Service instances
qq_oauth = QQOAuthService()
wechat_oauth = WeChatOAuthService()
google_oauth = GoogleOAuthService()
github_oauth = GitHubOAuthService()
