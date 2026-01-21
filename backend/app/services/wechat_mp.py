import hashlib
import time
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any
from backend.app.core.config import get_settings

settings = get_settings()

class WeChatMPService:
    """Service for WeChat Official Account (MP) integration."""
    
    def check_signature(self, signature: str, timestamp: str, nonce: str) -> bool:
        """Verify the signature from WeChat."""
        token = getattr(settings, "WECHAT_MP_TOKEN", "lemind_wechat_token")
        tmp_list = [token, timestamp, nonce]
        tmp_list.sort()
        tmp_str = "".join(tmp_list)
        sha1 = hashlib.sha1(tmp_str.encode('utf-8')).hexdigest()
        return sha1 == signature

    def parse_xml(self, xml_data: str) -> Dict[str, str]:
        """Parse XML message from WeChat."""
        root = ET.fromstring(xml_data)
        msg = {}
        for child in root:
            msg[child.tag] = child.text
        return msg

    def build_text_response(self, to_user: str, from_user: str, content: str) -> str:
        """Build a text response XML."""
        xml_template = """
        <ToUserName><![CDATA[{to_user}]]></ToUserName>
        <FromUserName><![CDATA[{from_user}]]></FromUserName>
        <CreateTime>{create_time}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[{content}]]></Content>
        </xml>
        """
        # Note: The root <xml> tag is often added by the caller or included in a wrapper
        return f"<xml>{xml_template.format(to_user=to_user, from_user=from_user, create_time=int(time.time()), content=content)}</xml>"

wechat_mp_service = WeChatMPService()
