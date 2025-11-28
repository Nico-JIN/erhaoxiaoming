# Google & GitHub OAuth 快速配置指南

## 1. Google OAuth 配置

### 步骤1：创建Google Cloud项目
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部的项目下拉菜单，选择"新建项目"
3. 输入项目名称（如：erhaoxiaoming），点击"创建"

### 步骤2：启用Google+ API
1. 在左侧菜单选择"API和服务" > "库"
2. 搜索"Google+ API"
3. 点击启用

### 步骤3：创建OAuth 2.0凭据
1. 在左侧菜单选择"API和服务" > "凭据"
2. 点击"创建凭据" > "OAuth 2.0 客户端ID"
3. 如果是第一次，需要先配置OAuth同意屏幕：
   - 用户类型：选择"外部"
   - 填写应用名称、用户支持电子邮件
   - 添加授权域（如果本地测试可以跳过）
   - 保存并继续
4. 返回创建OAuth客户端ID：
   - 应用类型：Web应用
   - 名称：erhaoxiaoming-web
   - 授权的重定向URI：`http://localhost:5173/auth/callback/google`
   - 点击"创建"

### 步骤4：获取凭据
1. 创建成功后会显示"客户端ID"和"客户端密钥"
2. **复制这两个值，稍后配置到.env文件**

### 步骤5：配置环境变量
在 `backend/.env` 文件中添加：
```env
GOOGLE_CLIENT_ID=你的客户端ID（类似：123456789-abc.apps.googleusercontent.com）
GOOGLE_CLIENT_SECRET=你的客户端密钥（类似：GOCSPX-xxxxxxxxxxxxx）
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google
```

---

## 2. GitHub OAuth 配置

### 步骤1：创建OAuth App
1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击"OAuth Apps"标签
3. 点击"New OAuth App"

### 步骤2：填写应用信息
- **Application name**: erhaoxiaoming（或你的应用名称）
- **Homepage URL**: `http://localhost:5173`
- **Application description**: （可选）二哈小明知识分享平台
- **Authorization callback URL**: `http://localhost:5173/auth/callback/github`
- 点击"Register application"

### 步骤3：生成Client Secret
1. 创建成功后，页面会显示"Client ID"
2. 点击"Generate a new client secret"
3. **立即复制Client Secret（只显示一次！）**

### 步骤4：配置环境变量
在 `backend/.env` 文件中添加：
```env
GITHUB_CLIENT_ID=你的Client_ID（类似：Iv1.1234567890abcdef）
GITHUB_CLIENT_SECRET=你的Client_Secret（类似：abc123def456...）
GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback/github
```

---

## 3. 测试OAuth登录

### 步骤1：重启后端服务
```bash
cd backend
# 确保虚拟环境已激活
uvicorn app.main:app --reload
```

### 步骤2：测试登录
1. 打开浏览器访问 `http://localhost:5173`
2. 点击登录按钮
3. 点击Google或GitHub图标
4. 应该会跳转到对应平台的授权页面
5. 授权后自动跳转回网站并完成登录

### 常见问题排查

**问题1：重定向URI不匹配**
- 确保OAuth平台配置的回调地址与.env中的完全一致
- 包括协议(http/https)、端口号等

**问题2：授权后跳转失败**
- 检查前端是否正确处理回调路由
- 查看浏览器控制台是否有错误
- 检查后端日志

**问题3：无法获取用户信息**
- 确保API已启用（Google需要启用Google+ API）
- 检查Client ID和Secret是否正确
- 查看后端日志中的详细错误信息

---

## 4. 生产环境部署

部署到生产环境时，需要修改配置：

### Google Cloud Console
1. 在OAuth 2.0客户端ID中添加生产环境的重定向URI
2. 例如：`https://yourdomain.com/auth/callback/google`

### GitHub OAuth App
1. 编辑OAuth App设置
2. 更新Homepage URL和Authorization callback URL为生产域名
3. 例如：`https://yourdomain.com/auth/callback/github`

### .env配置
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback/google
GITHUB_REDIRECT_URI=https://yourdomain.com/auth/callback/github
```

**⚠️ 重要提示**：
- 生产环境必须使用HTTPS
- 妥善保管Client Secret，不要提交到版本控制系统
- 定期更新密钥以提高安全性

---

## 5. 用户体验说明

### Google/GitHub登录的优势
- ✅ 自动获取用户信息（用户名、邮箱、头像）
- ✅ 无需填写注册表单
- ✅ 首次登录自动获得300积分奖励
- ✅ 安全可靠，无需记住额外密码

### 登录流程
1. 用户点击Google或GitHub图标
2. 跳转到对应平台授权页面
3. 用户授权后自动跳转回网站
4. 系统自动创建账号或登录已有账号
5. 完成！

---

## 附录：完整的.env配置示例

```env
# Database Configuration
DATABASE_URL=mysql+pymysql://erhaoxiaoming:erhaoxiaoming123@127.0.0.1:3306/erhaoxiaoming

# JWT Configuration
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=resources
MINIO_SECURE=False

# System Configuration
REGISTER_REWARD_POINTS=300

# Google OAuth
GOOGLE_CLIENT_ID=你的Google客户端ID
GOOGLE_CLIENT_SECRET=你的Google客户端密钥
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google

# GitHub OAuth
GITHUB_CLIENT_ID=你的GitHub_Client_ID
GITHUB_CLIENT_SECRET=你的GitHub_Client_Secret
GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback/github

# QQ OAuth (可选)
QQ_APP_ID=your_qq_app_id
QQ_APP_KEY=your_qq_app_key
QQ_REDIRECT_URI=http://localhost:5173/auth/callback/qq

# WeChat OAuth (可选)
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_REDIRECT_URI=http://localhost:5173/auth/callback/wechat
```

---

**需要帮助？**
- Google OAuth文档：https://developers.google.com/identity/protocols/oauth2
- GitHub OAuth文档：https://docs.github.com/en/developers/apps/building-oauth-apps
