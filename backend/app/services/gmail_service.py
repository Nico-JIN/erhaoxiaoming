"""Gmail API service for sending emails."""

import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict, Any
from datetime import datetime

import httpx
from backend.app.core.config import get_settings

settings = get_settings()

# Gmail API endpoints
GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

# Proxy for accessing Google API from China
PROXY_URL = "socks5://127.0.0.1:10808"


def get_proxy_client(timeout: float = 30.0):
    """Create an httpx client with optional proxy support."""
    try:
        import httpx_socks
        transport = httpx_socks.SyncProxyTransport.from_url(PROXY_URL)
        return httpx.Client(transport=transport, timeout=timeout)
    except ImportError:
        return httpx.Client(timeout=timeout)


class GmailService:
    """Gmail API service for sending emails."""
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.refresh_token = settings.GMAIL_ADMIN_REFRESH_TOKEN
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None
    
    async def _get_access_token(self) -> Optional[str]:
        """Get or refresh the access token."""
        if not self.refresh_token:
            print("[Gmail] No refresh token configured")
            return None
        
        # Check if current token is still valid
        if self._access_token and self._token_expires:
            if datetime.now() < self._token_expires:
                return self._access_token
        
        try:
            print(f"[Gmail] Refreshing token with client_id: {self.client_id[:20]}...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    GMAIL_TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "refresh_token": self.refresh_token,
                        "grant_type": "refresh_token"
                    }
                )
                
                if response.status_code != 200:
                    print(f"[Gmail] Token refresh failed (status {response.status_code}): {response.text}")
                    return None
                
                data = response.json()
                self._access_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                self._token_expires = datetime.now()
                
                print(f"[Gmail] Access token refreshed, expires in {expires_in}s")
                return self._access_token
                
        except httpx.ConnectError as e:
            print(f"[Gmail] Network connection error (可能需要代理): {e}")
            return None
        except httpx.TimeoutException as e:
            print(f"[Gmail] Request timeout (网络超时): {e}")
            return None
        except Exception as e:
            import traceback
            print(f"[Gmail] Error refreshing token: {type(e).__name__}: {e}")
            traceback.print_exc()
            return None
    
    def _create_message(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = True
    ) -> str:
        """Create a base64url encoded email message."""
        if html:
            message = MIMEMultipart("alternative")
            message["to"] = to
            message["subject"] = subject
            
            # Add both plain text and HTML versions
            text_part = MIMEText(body.replace("<br>", "\n").replace("<p>", "").replace("</p>", "\n"), "plain")
            html_part = MIMEText(body, "html")
            message.attach(text_part)
            message.attach(html_part)
        else:
            message = MIMEText(body)
            message["to"] = to
            message["subject"] = subject
        
        # Encode to base64url
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        return raw
    
    def replace_variables(self, template: str, variables: Dict[str, Any]) -> str:
        """Replace template variables like {{username}} with actual values."""
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result
    
    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send a single email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body (HTML supported)
            variables: Optional dict for template variable replacement
            
        Returns:
            Dict with 'success' bool and 'message_id' or 'error'
        """
        if not settings.GMAIL_ENABLED:
            return {"success": False, "error": "Gmail sending is not enabled"}
        
        access_token = await self._get_access_token()
        if not access_token:
            return {"success": False, "error": "Failed to get access token"}
        
        # Replace variables if provided
        if variables:
            subject = self.replace_variables(subject, variables)
            body = self.replace_variables(body, variables)
        
        try:
            raw_message = self._create_message(to, subject, body)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    GMAIL_SEND_URL,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json={"raw": raw_message}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"[Gmail] Email sent to {to}, message_id: {data.get('id')}")
                    return {"success": True, "message_id": data.get("id")}
                else:
                    error = response.text
                    print(f"[Gmail] Send failed to {to}: {error}")
                    return {"success": False, "error": error}
                    
        except Exception as e:
            print(f"[Gmail] Error sending email to {to}: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_bulk_emails(
        self,
        recipients: List[Dict[str, Any]],
        subject: str,
        body: str
    ) -> Dict[str, Any]:
        """Send emails to multiple recipients.
        
        Args:
            recipients: List of dicts with 'email' and optional variable fields
            subject: Email subject template
            body: Email body template (HTML supported)
            
        Returns:
            Dict with 'sent', 'failed' counts and 'results' list
        """
        results = []
        sent_count = 0
        failed_count = 0
        
        for recipient in recipients:
            email = recipient.get("email")
            if not email:
                continue
            
            # Use recipient data as variables
            variables = {k: v for k, v in recipient.items() if k != "email"}
            
            result = await self.send_email(email, subject, body, variables)
            result["email"] = email
            results.append(result)
            
            if result["success"]:
                sent_count += 1
            else:
                failed_count += 1
        
        return {
            "sent": sent_count,
            "failed": failed_count,
            "total": len(recipients),
            "results": results
        }


# Singleton instance
gmail_service = GmailService()
