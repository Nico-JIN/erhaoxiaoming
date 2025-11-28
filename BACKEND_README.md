# 后端系统说明

## 快速启动

### 1. 安装Python依赖
```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动MySQL和MinIO（使用Docker）
```bash
cd backend
docker-compose up -d mysql minio
```

### 3. 配置环境变量
```bash
cd backend
copy .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

默认配置：
```env
DATABASE_URL=mysql+pymysql://root:root123@localhost:3306/erhaoxiaoming
MINIO_ENDPOINT=localhost:9000
```

### 4. 初始化数据库
```bash
cd backend
python init_db.py
```

这将创建：
- 所有数据库表
- 管理员账号（admin/admin123）
- 示例栏目
- 系统配置

### 5. 启动后端服务
```bash
cd backend
python run.py
```

服务将在 http://localhost:8000 启动

### 6. 访问API文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 7. 测试API（可选）
```bash
cd backend
python test_api.py
```

## 默认账号

**管理员账号**：
- 用户名: admin
- 密码: admin123
- 初始积分: 10000

## 主要功能

### 用户管理
- 用户注册（邮箱/手机号/用户名）
- 用户登录（JWT认证）
- OAuth登录支持（框架已完成）
- 三级权限（USER/VIP/ADMIN）
- 用户操作日志

### 资料管理
- 资料CRUD操作
- 文件上传下载（MinIO）
- 付费/免费设置
- 浏览和下载统计
- 分类管理

### 积分系统
- 注册奖励（300积分）
- 积分充值
- 积分消费（下载付费资料）
- 交易记录
- 管理员调整

### 栏目管理
- 栏目增删改查
- 栏目排序
- 启用/禁用

### 管理员功能
- 数据统计面板
- 用户管理
- 操作日志查看
- 系统配置管理

## 技术栈

- FastAPI - Web框架
- MySQL - 数据库
- MinIO - 对象存储
- SQLAlchemy - ORM
- JWT - 认证
- Bcrypt - 密码加密

## API端点（共36个）

### 认证
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录

### 用户
- GET /api/users/me - 当前用户
- PUT /api/users/me - 更新信息
- GET /api/users/ - 用户列表（管理员）

### 资料
- GET /api/resources/ - 资料列表
- POST /api/resources/ - 创建资料
- GET /api/resources/{id}/download - 下载

### 栏目
- GET /api/categories/ - 栏目列表
- POST /api/categories/ - 创建栏目（管理员）

### 积分
- POST /api/points/recharge - 充值
- GET /api/points/balance - 余额

### 管理
- GET /api/admin/dashboard - 统计
- GET /api/admin/logs - 日志

详细API文档请访问：http://localhost:8000/docs

## 数据库表结构

1. **users** - 用户信息
2. **oauth_accounts** - OAuth绑定
3. **categories** - 栏目分类
4. **resources** - 资料内容
5. **point_transactions** - 积分交易
6. **operation_logs** - 操作日志
7. **system_config** - 系统配置

## 目录结构

```
backend/
├── routers/           # API路由
├── main.py           # 应用入口
├── config.py         # 配置
├── models.py         # 数据模型
├── schemas.py        # 验证模型
├── auth.py           # 认证
├── utils.py          # 工具
├── storage.py        # 文件存储
├── database.py       # 数据库
├── init_db.py        # 初始化
├── run.py            # 启动脚本
└── requirements.txt  # 依赖
```

## 详细文档

- [backend/README.md](backend/README.md) - 完整文档
- [backend/QUICKSTART.md](backend/QUICKSTART.md) - 快速启动
- [backend/PROJECT_STRUCTURE.md](backend/PROJECT_STRUCTURE.md) - 项目结构
- [BACKEND_COMPLETED.md](BACKEND_COMPLETED.md) - 完成总结

## 故障排除

### 数据库连接失败
```bash
# 检查MySQL是否启动
docker ps | findstr mysql

# 查看日志
docker logs erhaoxiaoming-mysql
```

### MinIO连接失败
```bash
# 检查MinIO是否启动
docker ps | findstr minio

# 访问控制台
http://localhost:9001
```

### 导入错误
```bash
# 重新安装依赖
pip install -r requirements.txt
```

## 生产部署

### 使用Docker
```bash
cd backend
docker build -t erhaoxiaoming-backend .
docker run -p 8000:8000 erhaoxiaoming-backend
```

### 使用Gunicorn
```bash
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 注意事项

1. **修改密钥**: 生产环境务必修改 `.env` 中的 `SECRET_KEY`
2. **修改密码**: 修改数据库和MinIO的默认密码
3. **HTTPS**: 生产环境使用Nginx等反向代理配置HTTPS
4. **备份**: 定期备份数据库

## 下一步

1. 配置OAuth（需要各平台应用ID）
2. 集成支付网关
3. 添加邮件验证
4. 添加手机验证码
5. 部署到生产环境

## 支持

如有问题，请查看：
- API文档：http://localhost:8000/docs
- 详细文档：backend/README.md
- 项目结构：backend/PROJECT_STRUCTURE.md
