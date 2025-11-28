# OAuth登录配置指南

本指南将帮助您配置QQ、微信、Google和GitHub的第三方登录功能。

## 功能特性

✅ **支持的OAuth提供商**：
- QQ登录
- 微信扫码登录
- Google登录
- GitHub登录

✅ **用户体验优化**：
- Google和GitHub注册时无需填写额外信息（自动使用OAuth提供的信息）
- 自动创建用户并绑定OAuth账号
- 首次登录自动获得注册奖励积分

## 配置步骤

### 1. QQ互联配置

1. 访问 [QQ互联开放平台](https://connect.qq.com/)
2. 注册成为开发者并创建网站应用
3. 获取 `APP ID` 和 `APP KEY`
4. 设置回调地址：`http://localhost:5173/auth/callback/qq`
5. 在 `backend/.env` 中配置：
   ```
   QQ_APP_ID=你的APP_ID
   QQ_APP_KEY=你的APP_KEY
   QQ_REDIRECT_URI=http://localhost:5173/auth/callback/qq
   ```

### 2. 微信开放平台配置

1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册成为开发者并创建网站应用
3. 获取 `AppID` 和 `AppSecret`
4. 设置授权回调域：`localhost:5173`
5. 在 `backend/.env` 中配置：
   ```
   WECHAT_APP_ID=你的AppID
   WECHAT_APP_SECRET=你的AppSecret
   WECHAT_REDIRECT_URI=http://localhost:5173/auth/callback/wechat
   ```

### 3. Google OAuth配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端ID（Web应用）
5. 设置授权重定向URI：`http://localhost:5173/auth/callback/google`
6. 在 `backend/.env` 中配置：
   ```
   GOOGLE_CLIENT_ID=你的客户端ID
   GOOGLE_CLIENT_SECRET=你的客户端密钥
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google
   ```

### 4. GitHub OAuth配置

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - Application name: 你的应用名称
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/auth/callback/github`
4. 获取 `Client ID` 和生成 `Client Secret`
5. 在 `backend/.env` 中配置：
   ```
   GITHUB_CLIENT_ID=你的Client_ID
   GITHUB_CLIENT_SECRET=你的Client_Secret
   GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback/github
   ```

## 生产环境配置

在生产环境中，需要将所有的 `http://localhost:5173` 替换为你的实际域名，例如：

```
QQ_REDIRECT_URI=https://yourdomain.com/auth/callback/qq
WECHAT_REDIRECT_URI=https://yourdomain.com/auth/callback/wechat
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback/google
GITHUB_REDIRECT_URI=https://yourdomain.com/auth/callback/github
```

同时在各OAuth平台更新回调地址配置。

## 使用说明

### 前端使用

用户点击登录按钮后，选择任意OAuth提供商，系统会：

1. 获取OAuth授权URL
2. 重定向到OAuth提供商的授权页面
3. 用户授权后，重定向回 `/auth/callback/{provider}`
4. 自动完成登录或注册流程

### 后端API

1. **获取OAuth授权URL**
   ```
   GET /api/auth/oauth/{provider}/url
   ```
   返回：`{ url: string, state: string }`

2. **处理OAuth回调**
   ```
   POST /api/auth/oauth/{provider}/callback?code={code}
   ```
   返回：`{ access_token, refresh_token, token_type }`

## 注意事项

1. **安全性**：
   - 生产环境务必使用HTTPS
   - 妥善保管各平台的密钥信息
   - 定期更新密钥

2. **用户隐私**：
   - OAuth登录获取的用户信息仅用于创建账号
   - 不会存储OAuth access_token的敏感信息（可根据需求调整）

3. **错误处理**：
   - 用户取消授权会跳转回首页
   - 授权失败会显示错误提示

4. **开发调试**：
   - 确保前后端端口配置正确
   - 检查防火墙是否允许OAuth回调
   - 查看浏览器控制台和后端日志排查问题

## 技术实现

### 后端实现

- **OAuth服务**：`backend/app/services/oauth.py`
  - QQOAuthService：QQ登录
  - WeChatOAuthService：微信登录
  - GoogleOAuthService：Google登录
  - GitHubOAuthService：GitHub登录

- **认证路由**：`backend/app/api/routers/auth.py`
  - `/api/auth/oauth/{provider}/url`：获取授权URL
  - `/api/auth/oauth/{provider}/callback`：处理回调

### 前端实现

- **OAuth回调页面**：`pages/OAuthCallback.tsx`
  - 处理OAuth回调
  - 显示加载状态
  - 错误处理

- **认证模态框**：`components/AuthModal.tsx`
  - 四个OAuth登录按钮
  - 加载状态显示

- **认证服务**：`services/authService.ts`
  - `getOAuthUrl()`：获取授权URL
  - `oauthCallback()`：处理回调

## 数据库模型

系统会自动创建以下数据：

1. **User表**：存储用户基本信息
   - OAuth用户的 `hashed_password` 为 `null`
   - `is_verified` 标记邮箱是否已验证

2. **OAuthAccount表**：存储OAuth绑定关系
   - `provider`：OAuth提供商
   - `provider_user_id`：提供商的用户ID
   - `access_token`：访问令牌（可用于调用提供商API）

## 常见问题

**Q: OAuth登录失败怎么办？**
A: 检查以下几点：
- 配置的密钥是否正确
- 回调地址是否匹配
- 网络是否可以访问OAuth平台
- 查看浏览器控制台和后端日志

**Q: 可以绑定多个OAuth账号吗？**
A: 当前版本一个OAuth账号只能绑定一个用户。如需支持多账号绑定，需要修改 `oauth_callback` 的逻辑。

**Q: 如何测试OAuth功能？**
A: 建议先配置GitHub或Google（国内可访问），测试完整流程后再配置QQ和微信。

## 更新日志

- 2024-01: 初始版本，支持QQ、微信、Google、GitHub登录
- Google和GitHub用户注册时自动使用OAuth信息，无需额外填写
