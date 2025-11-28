# QQ与微信OAuth登录配置指南

## 📋 概述

本项目已完整实现QQ和微信的OAuth第三方登录功能,与Google、GitHub登录方式一致。用户只需配置相应的应用密钥即可启用。

## ✅ 已实现功能

### 后端功能
- ✅ QQ OAuth 2.0 授权流程
- ✅ 微信开放平台扫码登录
- ✅ 自动创建用户账号
- ✅ 关联OAuth账号到系统用户
- ✅ 发放注册奖励积分(300积分)
- ✅ 记录登录操作日志

### 前端功能
- ✅ QQ登录按钮(蓝色QQ图标)
- ✅ 微信登录按钮(绿色微信图标)
- ✅ OAuth授权流程处理
- ✅ 登录成功/失败页面

## 🔧 配置步骤

### 一、申请QQ互联应用

#### 1. 注册QQ互联开放平台
- 访问: https://connect.qq.com/
- 使用QQ号登录并完成开发者认证

#### 2. 创建网站应用
1. 进入"应用管理" → "创建应用" → "网站应用"
2. 填写应用信息:
   - **应用名称**: Lemind知识平台 (或你的平台名称)
   - **应用简介**: 知识分享与变现平台
   - **应用网站**: https://ai.dxin.store
   - **应用LOGO**: 上传平台LOGO

3. 设置回调地址:
   ```
   https://api.dxin.store/api/auth/oauth/qq/callback
   ```

#### 3. 获取应用凭证
- 创建成功后,在"应用管理"中查看:
  - **APP ID**: 10位数字
  - **APP KEY**: 32位字符串

#### 4. 更新环境变量
编辑 `backend/.env`:
```bash
QQ_APP_ID=你的QQ_APP_ID
QQ_APP_KEY=你的QQ_APP_KEY
QQ_REDIRECT_URI=https://api.dxin.store/api/auth/oauth/qq/callback
```

---

### 二、申请微信开放平台应用

#### 1. 注册微信开放平台
- 访问: https://open.weixin.qq.com/
- 使用微信扫码登录
- 完成开发者资质认证(需300元认证费,企业主体)

#### 2. 创建网站应用
1. 进入"管理中心" → "网站应用" → "创建网站应用"
2. 填写应用信息:
   - **应用名称**: Lemind知识平台
   - **应用简介**: 提供知识分享与变现服务
   - **应用官网**: https://ai.dxin.store
   - **应用LOGO**: 上传平台LOGO (120x120px)

3. 设置授权回调域:
   ```
   api.dxin.store
   ```
   **注意**: 只填写域名,不包含 `https://` 和路径

#### 3. 获取应用凭证
- 审核通过后,在"网站应用"详情页查看:
  - **AppID**: `wx` 开头的字符串
  - **AppSecret**: 32位字符串

#### 4. 更新环境变量
编辑 `backend/.env`:
```bash
WECHAT_APP_ID=你的WECHAT_APP_ID
WECHAT_APP_SECRET=你的WECHAT_APP_SECRET
WECHAT_REDIRECT_URI=https://api.dxin.store/api/auth/oauth/wechat/callback
```

---

## 🚀 启用登录功能

### 1. 重启后端服务
配置完环境变量后,重启后端服务:
```bash
cd backend
# 停止旧服务
# 启动新服务
python run.py
```

### 2. 测试登录流程

#### QQ登录测试
1. 打开前端页面: https://ai.dxin.store
2. 点击登录按钮,在登录弹窗中点击"QQ图标"
3. 跳转到QQ授权页面
4. 使用QQ扫码或账号密码授权
5. 授权成功后自动返回平台并完成登录

#### 微信登录测试
1. 打开前端页面: https://ai.dxin.store
2. 点击登录按钮,在登录弹窗中点击"微信图标"
3. 页面显示微信扫码二维码
4. 使用微信扫码授权
5. 授权成功后自动返回平台并完成登录

---

## 📊 OAuth登录流程

### 完整流程图
```
用户点击QQ/微信登录
    ↓
前端调用 /api/auth/oauth/{provider}/url
    ↓
后端生成授权URL并返回
    ↓
前端重定向到QQ/微信授权页面
    ↓
用户扫码/授权
    ↓
QQ/微信回调到后端 /api/auth/oauth/{provider}/callback?code=xxx
    ↓
后端用code换取access_token
    ↓
后端用access_token获取用户信息
    ↓
检查用户是否已存在
    ├─ 已存在: 直接登录
    └─ 不存在: 创建新用户 + 发放300积分
    ↓
生成JWT token
    ↓
重定向到前端成功页面,携带token
    ↓
前端保存token并跳转到首页
```

### 技术实现要点

1. **OAuth 2.0标准流程**
   - Authorization Code Grant模式
   - 使用state参数防CSRF攻击
   - 后端处理回调以保护密钥安全

2. **用户数据映射**
   ```python
   # QQ用户信息
   {
       "provider_user_id": openid,           # QQ唯一标识
       "username": nickname,                  # 用户昵称
       "full_name": nickname,                 # 全名
       "avatar_url": figureurl_qq_2          # 头像URL
   }
   
   # 微信用户信息
   {
       "provider_user_id": unionid/openid,   # 微信唯一标识
       "username": nickname,                  # 用户昵称
       "full_name": nickname,                 # 全名
       "avatar_url": headimgurl              # 头像URL
   }
   ```

3. **安全机制**
   - OAuth账号与系统用户关联存储
   - access_token加密保存
   - 用户名冲突自动添加随机后缀
   - 操作日志完整记录

---

## 🔐 安全注意事项

### 1. 环境变量保护
- ❌ **绝不要**将 `.env` 文件提交到Git仓库
- ✅ 已在 `.gitignore` 中配置忽略
- ✅ 生产环境使用独立的密钥配置

### 2. 回调地址配置
- ✅ 生产环境使用HTTPS: `https://api.dxin.store`
- ✅ 回调地址必须与平台配置完全一致
- ✅ 不要在回调地址中添加额外参数

### 3. 密钥管理
- 🔒 APP_KEY/AppSecret绝不能暴露在前端
- 🔒 定期轮换密钥(建议每6个月)
- 🔒 如果密钥泄露,立即在开放平台重置

---

## 🐛 常见问题排查

### 问题1: 点击登录后无响应
**原因**: 环境变量未配置或配置错误
**解决**:
1. 检查 `backend/.env` 中的QQ/微信配置
2. 确认APP_ID、APP_KEY/AppSecret正确
3. 重启后端服务

### 问题2: 授权后跳转到错误页面
**原因**: 回调地址配置不一致
**解决**:
1. 检查开放平台配置的回调地址
2. 确认 `.env` 中的 `REDIRECT_URI` 配置
3. 两者必须完全一致(包括协议、域名、路径)

### 问题3: 获取用户信息失败
**原因**: access_token过期或权限不足
**解决**:
1. 检查应用权限范围(scope)设置
2. QQ需要 `get_user_info` 权限
3. 微信需要 `snsapi_login` 权限

### 问题4: 用户信息为空
**原因**: 用户未同意授权或取消授权
**解决**:
- 用户需要同意授权才能获取信息
- 引导用户重新授权

---

## 📝 数据库表结构

### OAuthAccount表
存储OAuth账号关联信息:
```sql
CREATE TABLE oauth_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                    -- 关联的系统用户ID
    provider ENUM('QQ','WECHAT',...),        -- OAuth提供商
    provider_user_id VARCHAR(255),           -- 提供商的用户ID
    access_token TEXT,                       -- 访问令牌(加密存储)
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE KEY (provider, provider_user_id)
);
```

### 用户注册流程
1. OAuth登录成功后获取用户信息
2. 查询 `oauth_accounts` 表检查是否已注册
3. 如果未注册:
   - 创建新 `User` 记录
   - 创建 `OAuthAccount` 关联记录
   - 发放300积分注册奖励
4. 如果已注册:
   - 更新 `last_login` 时间
   - 刷新 `access_token`

---

## 🎯 下一步优化建议

### 1. 手机号绑定
- 首次OAuth登录后引导绑定手机号
- 提升账号安全性
- 便于找回密码

### 2. 多账号合并
- 允许用户绑定多个OAuth账号
- 支持QQ、微信、Google、GitHub同时登录

### 3. 登录历史记录
- 展示最近登录设备和IP
- 异常登录提醒

### 4. 快捷登录
- 记住用户最后使用的登录方式
- 下次访问优先显示

---

## 📞 技术支持

如遇到配置问题,请检查:
1. 后端日志: 查看OAuth回调的详细错误信息
2. 浏览器控制台: 查看前端请求是否正常
3. 开放平台后台: 确认应用状态正常

相关文件:
- 后端OAuth服务: `backend/app/services/oauth.py`
- 后端认证路由: `backend/app/api/routers/auth.py`
- 前端登录组件: `components/AuthModal.tsx`
- 环境变量配置: `backend/.env`

---

**注意**: 微信开放平台需要企业主体认证(300元认证费),个人开发者建议先使用QQ互联进行测试。
