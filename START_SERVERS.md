# 启动前后端服务器

## 方式一：分别启动（推荐）

### 1. 启动后端（Terminal 1）
```bash
python backend/run.py
```
或者
```bash
python.exe backend/run.py
```

后端将运行在: **http://localhost:8000**
API文档: **http://localhost:8000/docs**

### 2. 启动前端（Terminal 2）
```bash
npm run dev
```

前端将运行在: **http://localhost:5173**

## 测试步骤

### 1. 验证后端运行
打开浏览器访问: http://localhost:8000/docs
- 应该能看到Swagger API文档
- 测试 GET `/health` 端点，应该返回 `{"status": "healthy"}`

### 2. 验证前端运行
打开浏览器访问: http://localhost:5173
- 应该能看到Lemind主页
- 点击"Get Started"或"Login"按钮

### 3. 测试注册功能
1. 在登录弹窗中，点击下方的"Sign Up"链接
2. 填写注册信息：
   - Username: `testuser` (必填)
   - Password: `password123` (必填)
   - Full Name, Email, Phone (选填)
3. 点击"Create Account"
4. 注册成功后会自动登录，右上角应显示用户头像和积分（默认300积分）

### 4. 测试登录功能
1. 如果登出了，点击"Login"
2. 输入之前注册的用户名和密码
3. 点击"Sign In"
4. 登录成功后应该看到用户信息

### 5. 检查浏览器控制台
- 打开浏览器开发者工具（F12）
- 查看Console是否有错误
- 查看Network标签，检查API请求是否成功：
  - `/api/auth/register` - 注册请求
  - `/api/auth/login` - 登录请求
  - `/api/users/me` - 获取用户信息请求

## 常见问题排查

### 问题1: 后端无法启动
**错误**: `ModuleNotFoundError: No module named 'backend'`

**解决**: 确保使用 `python backend/run.py` 而不是在backend目录内运行

---

### 问题2: 前端连接不到后端
**错误**: Network Error 或 `ERR_CONNECTION_REFUSED`

**检查**:
1. 后端是否正在运行（访问 http://localhost:8000）
2. 检查 `.env.local` 文件是否存在并配置正确：
   ```
   VITE_API_URL=http://localhost:8000
   ```
3. 重启前端开发服务器

---

### 问题3: CORS错误
**错误**: `Access-Control-Allow-Origin` 相关错误

**检查**:
1. 确保 `backend/config.py` 中的 CORS_ORIGINS 包含前端URL：
   ```python
   CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
   ```
2. 重启后端服务器

---

### 问题4: 401 Unauthorized
**原因**: Token过期或无效

**解决**:
1. 清除浏览器localStorage
2. 重新登录

---

### 问题5: 数据库连接失败
**错误**: `Can't connect to MySQL server`

**检查**:
1. MySQL服务是否正在运行
2. `backend/.env` 中的数据库配置是否正确
3. 数据库是否已创建：
   ```bash
   python backend/init_db.py
   ```

## API端点快速参考

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 用户相关
- `GET /api/users/me` - 获取当前用户信息

### 资源相关
- `GET /api/resources/` - 获取资源列表
- `GET /api/resources/{id}` - 获取资源详情

### 分类相关
- `GET /api/categories/` - 获取所有分类

## 开发提示

1. **热重载**: 前后端都支持热重载，修改代码后会自动刷新
2. **API文档**: 使用 http://localhost:8000/docs 测试API
3. **调试**: 使用浏览器开发者工具的Network标签查看API请求
4. **日志**: 后端日志会在Terminal中显示

## 下一步开发

现在基础设施已经搭建完成，可以继续开发：
1. 更新Home页面显示真实资源数据
2. 更新Resources页面从后端加载资源
3. 实现资源下载功能
4. 实现积分充值功能
5. 完善管理员面板功能
