# 前后端联调指南

## 已完成的工作

### 1. 后端API服务
- ✅ 所有API端点已实现（auth, users, resources, categories, points, admin）
- ✅ 数据库模型和Schema已配置
- ✅ CORS已配置支持前端
- ✅ 修复了backend启动问题

### 2. 前端API服务层
创建了完整的API服务层：
- ✅ `services/api.ts` - Axios实例和拦截器
- ✅ `services/authService.ts` - 认证服务（登录、注册、登出）
- ✅ `services/userService.ts` - 用户服务（获取用户信息、更新资料）
- ✅ `services/resourceService.ts` - 资源服务（CRUD、上传、下载）
- ✅ `services/categoryService.ts` - 分类服务
- ✅ `services/pointsService.ts` - 积分服务
- ✅ `services/adminService.ts` - 管理员服务

### 3. 认证上下文
- ✅ `contexts/AuthContext.tsx` - 全局认证状态管理
- ✅ 集成到App.tsx中
- ✅ AuthModal支持真实登录/注册

### 4. 前端更新
- ✅ App.tsx集成AuthContext
- ✅ Navbar显示用户信息和登出功能
- ✅ AuthModal支持真实的登录和注册

## 如何测试

### 1. 启动后端服务器

```bash
# 在项目根目录
python backend/run.py
```

后端将运行在: http://localhost:8000
API文档: http://localhost:8000/docs

### 2. 启动前端应用

```bash
# 在项目根目录
npm run dev
```

前端将运行在: http://localhost:5173

### 3. 测试流程

#### A. 测试注册和登录
1. 打开浏览器访问 http://localhost:5173
2. 点击"Get Started"或"Login"按钮
3. 在弹窗中点击"Sign Up"切换到注册
4. 填写表单：
   - Username: test123
   - Password: password123
   - Full Name, Email, Phone（可选）
5. 点击"Create Account"注册
6. 注册成功后会自动登录
7. 检查右上角是否显示用户信息和积分（默认300积分）

#### B. 测试资源列表
1. 导航到Resources页面
2. 应该能看到从后端获取的资源列表
3. 可以按分类筛选
4. 可以搜索资源

#### C. 测试管理员功能
1. 需要先创建管理员用户（在后端数据库中或通过API）
2. 管理员登录后应该看到"Admin"按钮
3. 点击进入管理面板
4. 可以管理用户、资源、分类等

## API端点概览

### 认证 (Auth)
- POST `/api/auth/register` - 注册新用户
- POST `/api/auth/login` - 登录
- POST `/api/auth/refresh` - 刷新token

### 用户 (Users)
- GET `/api/users/me` - 获取当前用户信息
- PUT `/api/users/me` - 更新用户信息
- POST `/api/users/me/avatar` - 上传头像

### 资源 (Resources)
- GET `/api/resources/` - 获取资源列表
- GET `/api/resources/{id}` - 获取单个资源
- POST `/api/resources/` - 创建资源（需要VIP或Admin权限）
- PUT `/api/resources/{id}` - 更新资源
- DELETE `/api/resources/{id}` - 删除资源
- POST `/api/resources/{id}/upload` - 上传资源文件
- GET `/api/resources/{id}/download` - 下载资源

### 分类 (Categories)
- GET `/api/categories/` - 获取所有分类
- GET `/api/categories/{id}` - 获取单个分类
- POST `/api/categories/` - 创建分类（Admin only）
- PUT `/api/categories/{id}` - 更新分类（Admin only）
- DELETE `/api/categories/{id}` - 删除分类（Admin only）

### 积分 (Points)
- GET `/api/points/transactions` - 获取积分交易记录
- GET `/api/points/balance` - 获取当前积分
- POST `/api/points/recharge` - 充值积分

### 管理员 (Admin)
- GET `/api/admin/stats` - 获取统计信息
- GET `/api/admin/users` - 获取所有用户
- PUT `/api/admin/users/{id}/role` - 更新用户角色
- POST `/api/admin/users/{id}/ban` - 封禁用户
- POST `/api/admin/users/{id}/unban` - 解封用户

## 环境配置

### 前端环境变量
`.env.local`:
```
VITE_API_URL=http://localhost:8000
```

### 后端环境变量
`backend/.env`:
```
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/erhaoxiaoming
SECRET_KEY=your-secret-key
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

## 常见问题

### 1. CORS错误
确保后端的CORS设置包含了前端URL：
```python
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]
```

### 2. 401 Unauthorized
- 检查token是否正确保存在localStorage
- 尝试重新登录
- 检查token是否过期

### 3. 数据库连接失败
- 确保MySQL服务正在运行
- 检查backend/.env中的数据库配置
- 运行 `python backend/init_db.py` 初始化数据库

### 4. 端口被占用
- 后端: 修改backend/run.py中的端口号
- 前端: 修改vite.config.ts中的server.port

## 下一步工作

- [ ] Home页面集成真实API（显示热门资源）
- [ ] Resources页面集成真实API（资源列表和筛选）
- [ ] AdminPanel集成真实API（统计数据和管理功能）
- [ ] ArticleView页面集成真实API（资源详情和下载）
- [ ] Pricing页面集成真实API（积分充值）
- [ ] 添加错误处理和加载状态
- [ ] 添加更多的API功能（搜索、排序等）
