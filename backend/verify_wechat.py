import httpx
import sys
import hashlib
import time

def mock_wechat_reply(code, openid="test_user_openai_123"):
    url = "http://localhost:8000/api/auth/wechat-mp/webhook"
    token = "lemind_wechat_token"
    timestamp = str(int(time.time()))
    nonce = "random_nonce"
    
    # Generate signature
    tmp_list = [token, timestamp, nonce]
    tmp_list.sort()
    tmp_str = "".join(tmp_list)
    signature = hashlib.sha1(tmp_str.encode('utf-8')).hexdigest()
    
    xml_data = f"""<xml>
        <ToUserName><![CDATA[gh_test]]></ToUserName>
        <FromUserName><![CDATA[o{openid}]]></FromUserName>
        <CreateTime>{timestamp}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[{code}]]></Content>
        <MsgId>1234567890123456</MsgId>
    </xml>"""
    
    params = {
        "signature": signature,
        "timestamp": timestamp,
        "nonce": nonce
    }
    
    print(f"Sending code {code} to {url}...")
    response = httpx.post(url, params=params, content=xml_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_wechat.py <code>")
    else:
        mock_wechat_reply(sys.argv[1])
