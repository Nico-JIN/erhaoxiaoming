import requests

# 测试登录
login_data = {
    'username': 'admin',
    'password': 'admin123'
}

try:
    response = requests.post('http://localhost:8000/api/auth/login', data=login_data)
    print(f"登录响应状态: {response.status_code}")
    print(f"登录响应内容: {response.json()}")
    
    if response.status_code == 200:
        token = response.json()['access_token']
        print(f"\n获取到 token: {token[:20]}...")
        
        # 测试访问管理面板数据
        headers = {
            'Authorization': f'Bearer {token}'
        }
        dashboard_response = requests.get('http://localhost:8000/api/admin/dashboard', headers=headers)
        print(f"\n管理面板响应状态: {dashboard_response.status_code}")
        print(f"管理面板响应内容: {dashboard_response.json()}")
    else:
        print("登录失败")
except Exception as e:
    print(f"发生错误: {e}")