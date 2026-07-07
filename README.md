# Interview App — 面试题库 API

> Fastify + MongoDB + JWT 构建的面试题目练习平台后端服务

## 功能概览

- **题目管理**：CRUD、全文搜索、分类/难度过滤、浏览统计
- **用户系统**：注册 / 登录（JWT）、收藏题目
- **练习会话**：随机抽题、逐题作答、完成结算

## 快速开始

### 前提

- Node.js >= 18
- MongoDB >= 6（本地 `mongod` 或 Atlas）

### 安装依赖

```bash
cd interview_app
npm install
```

### 配置环境变量

```bash
cp .env.example .env
# 按需修改 MONGODB_URI、JWT_SECRET
```

### 写入初始数据

```bash
npm run seed
```

默认管理员：`admin` / `Admin@123`（可在 `.env` 中修改）

### 启动开发服务器

```bash
npm run dev
```

服务默认监听 `http://localhost:3000`

---

## API 文档

所有响应格式：`{ data: ... }` 或 `{ error: '...' }`

### 认证

需要认证的接口，请在 Header 中携带：

```
Authorization: Bearer <token>
```

### 接口列表

#### Auth

| Method | Path | 说明 | 认证 |
|--------|------|------|------|
| POST | `/api/auth/register` | 注册 | ❌ |
| POST | `/api/auth/login` | 登录，返回 JWT token | ❌ |
| GET | `/api/auth/me` | 获取当前登录用户信息 | ✅ |

**注册请求体：**
```json
{ "username": "alice", "email": "alice@example.com", "password": "Secret123" }
```

**登录请求体：**
```json
{ "email": "alice@example.com", "password": "Secret123" }
```

#### Questions

| Method | Path | 说明 | 认证 |
|--------|------|------|------|
| GET | `/api/questions` | 分页列表（支持过滤/搜索）| ❌ |
| GET | `/api/questions/:id` | 题目详情 | ❌ |
| POST | `/api/questions` | 新建题目 | ✅ |
| PUT | `/api/questions/:id` | 更新题目（创建者/管理员）| ✅ |
| DELETE | `/api/questions/:id` | 删除题目（创建者/管理员）| ✅ |
| POST | `/api/questions/:id/favorite` | 收藏/取消收藏 | ✅ |

**列表查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `category` | string | `javascript` \| `typescript` \| `css` \| `html` \| `react` \| `vue` \| `node` \| `network` \| `algorithm` \| `other` |
| `difficulty` | string | `easy` \| `medium` \| `hard` |
| `tag` | string | 标签过滤 |
| `keyword` | string | 全文搜索 |
| `page` | number | 页码（默认 1）|
| `limit` | number | 每页数量（默认 20，最大 100）|
| `sort` | string | `createdAt` \| `viewCount` \| `favoriteCount` |

#### Sessions

| Method | Path | 说明 | 认证 |
|--------|------|------|------|
| POST | `/api/sessions` | 创建练习会话（随机抽题）| ✅ |
| GET | `/api/sessions/me` | 我的历史会话列表 | ✅ |
| GET | `/api/sessions/:id` | 会话详情 | ✅ |
| POST | `/api/sessions/:id/answers` | 提交单题作答 | ✅ |
| POST | `/api/sessions/:id/finish` | 结束会话，获取统计结果 | ✅ |

**创建会话请求体：**
```json
{ "category": "javascript", "difficulty": "medium", "count": 10 }
```

**提交答案请求体：**
```json
{
  "questionId": "<ObjectId>",
  "userAnswer": "我的回答...",
  "mastered": true,
  "timeSpent": 120
}
```

---

## 项目结构

```
src/
├── app.js              # Fastify 实例构建，插件注册，错误处理
├── server.js           # 启动入口
├── config/index.js     # 环境变量统一读取
├── db/mongoose.js      # MongoDB 连接
├── models/
│   ├── User.js         # 用户模型（含 bcrypt hook）
│   ├── Question.js     # 题目模型（全文索引）
│   └── Session.js      # 答题会话模型
├── services/
│   ├── UserService.js      # 注册/登录/收藏业务逻辑
│   ├── QuestionService.js  # 题目 CRUD + 随机抽题
│   └── SessionService.js   # 会话生命周期管理
├── plugins/auth.js     # JWT authenticate/optionalAuth/requireAdmin 装饰器
├── routes/
│   ├── auth.js         # /api/auth
│   ├── questions.js    # /api/questions
│   └── sessions.js     # /api/sessions
└── utils/errors.js     # AppError 体系

seed/questions.js       # 初始化管理员 + 8 道示例题目
```
