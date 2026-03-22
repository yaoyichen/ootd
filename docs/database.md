# 数据库参考文档

**技术栈**：Prisma 7 + SQLite + better-sqlite3 adapter
**更新日期**：2026-03-23（v9：新增 OotdCheckin model + ShowcasePost.realPhotoPath 字段，支持 OOTD 打卡和真实穿搭对比）

---

## 一、技术栈说明

| 组件 | 版本 | 说明 |
|------|------|------|
| Prisma | 7.x | ORM，提供类型安全的数据库操作 |
| SQLite | — | 轻量级文件数据库，零配置 |
| @prisma/adapter-better-sqlite3 | 7.x | Prisma 7 要求的驱动适配器 |
| bcryptjs | — | 密码哈希（salt rounds 12） |
| jose | — | JWT 签发/验证（HS256，7天过期） |

### Prisma 7 与旧版本的关键区别

Prisma 7 移除了 `schema.prisma` 中的 `datasource.url` 配置，改为在 `prisma.config.ts` 中单独管理连接 URL。同时，`PrismaClient` 构造函数必须传入 `adapter` 参数，不再支持无参构造。

---

## 二、文件结构

```
web/
├── prisma.config.ts              # Prisma CLI 配置（数据库 URL）
├── middleware.ts                  # 路由保护（JWT 验证，未登录重定向）
├── prisma/
│   ├── schema.prisma             # 数据模型定义 + 生成器配置
│   └── generated/prisma/         # 自动生成的客户端代码（gitignore）
│       ├── client.ts             # PrismaClient 入口
│       ├── models.ts             # 类型定义
│       └── ...
├── lib/
│   ├── prisma.ts                 # 运行时客户端单例
│   ├── auth.ts                   # 认证核心（JWT签发/验证、密码哈希、Cookie管理）
│   ├── api-auth.ts               # API 路由认证守卫（requireAuth）
│   ├── qwen.ts                   # DashScope Qwen API 封装（评分 + 搭配推荐）
│   └── tryon.ts                  # 虚拟试穿生成逻辑（含缓存）
├── dev.db                        # SQLite 数据库文件（gitignore）
└── .gitignore                    # 排除 dev.db、generated/、uploads/
```

### 各文件职责

**`prisma.config.ts`** — Prisma CLI 工具（db push / generate / studio）读取此文件获取数据库连接地址：

```typescript
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: "file:./dev.db",   // 相对于 prisma.config.ts 所在目录（即 web/）
  },
});
```

**`lib/prisma.ts`** — 应用运行时的 Prisma 客户端单例。使用 `globalThis` 缓存防止 dev 热重载时创建多个连接：

```typescript
import { PrismaClient } from "@/prisma/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

> **注意**：`prisma.config.ts` 和 `lib/prisma.ts` 中的数据库路径必须指向同一个文件（`web/dev.db`），否则会出现「数据写入了但读不到」的问题。

**`lib/auth.ts`** — 用户认证核心库：

- `hashPassword(plain)` — bcryptjs 哈希，salt rounds 12
- `verifyPassword(plain, hash)` — bcryptjs 比对
- `signToken({ userId, email })` — jose SignJWT，HS256，7 天过期
- `verifyToken(token)` — jose jwtVerify，返回 `{ userId, email }` 或 null
- `getCurrentUser(request)` — 从 Cookie 读取 token → verifyToken → 返回 payload
- `setAuthCookie(response, token)` — 设置 httpOnly, sameSite=lax, 7 天 maxAge
- `clearAuthCookie(response)` — 清除 cookie

**`lib/api-auth.ts`** — API 路由认证守卫：

```typescript
import { requireAuth } from "@/lib/api-auth";

// 每个受保护 API route 开头调用
const { user, error } = await requireAuth(req);
if (error) return error; // 401 未登录
// user.userId, user.email 可用
```

**`middleware.ts`** — Next.js 路由中间件，保护所有非公开路由：

- **公开路径**：`/`, `/login`, `/register`, `/api/auth/*`, `/api/weather`, `/_next/*`, `/fonts/*`, `/uploads/*`, `/favicon.ico`
- **半公开**：`GET /api/showcase`、`GET/POST /api/showcase/[id]/like` 公开
- **其余路径**：无 token → API 返回 401 / 页面重定向 `/login?from=原路径`

**`lib/qwen.ts`** — DashScope Qwen API 封装，包含两个核心函数：

- `scoreOutfit(imagePath)` — 调用 Qwen-VL-Max 对穿搭效果图进行五维评分，返回 `{ score, dims, evaluation }`
- `suggestCombinations(items)` — 调用 Qwen-Max 根据衣橱单品列表推荐 5 组最佳搭配

**`lib/tryon.ts`** — 虚拟试穿生成逻辑：

- `generateTryon(input)` — 调用 DashScope qwen-image-2.0-pro 生成试穿图。内置缓存机制，同一搭配组合（人像 + 上衣 + 下装）不重复生成。`input.userId` 必传，用于关联 Outfit 记录
- `resolveImage(input)` — 将本地图片路径转换为 Base64 Data URL

---

## 三、数据模型

### User（用户）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| email | String | 是 | — | 邮箱（唯一） |
| passwordHash | String | 是 | — | bcryptjs 哈希后的密码 |
| nickname | String? | 否 | — | 昵称 |
| avatarPath | String? | 否 | — | 头像图片路径 |
| createdAt | DateTime | 是 | now() | 注册时间 |
| updatedAt | DateTime | 是 | 自动更新 | 更新时间 |

**唯一索引**：`email`

**关系**：User 拥有 items、personImages、outfits、showcasePosts、dailyRecommendations、ootdCheckins（级联删除）

### Item（衣物单品）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| userId | String | 是 | — | 所属用户 ID（外键） |
| name | String | 是 | — | 单品名称 |
| category | String | 是 | — | 分类，见下方枚举 |
| subcategory | String? | 否 | — | 子分类 |
| color | String? | 否 | — | 颜色 |
| style | String? | 否 | — | 风格 |
| season | String? | 否 | — | 季节（春/夏/秋/冬/四季） |
| occasion | String? | 否 | — | 场合（日常/上班/约会/运动/正式/出行） |
| material | String? | 否 | — | 材质（棉/牛仔/丝绸/羊毛/涤纶/皮革/麻/雪纺/针织/灯芯绒） |
| fit | String? | 否 | — | 版型（修身/宽松/常规/oversize） |
| pattern | String? | 否 | — | 图案（纯色/条纹/格纹/印花/碎花/波点/拼接） |
| thickness | String? | 否 | — | 厚度（薄/适中/厚） |
| description | String? | 否 | — | 简短描述（如"V领开衫，金属纽扣"） |
| imagePath | String | 是 | — | 抠图后的图片路径（如 `/uploads/items/xxx.png`） |
| originalImagePath | String? | 否 | — | 原始上传图片路径（如 `/uploads/items-original/xxx.jpg`） |
| imageHash | String? | 否 | — | 原始图片 SHA-256 哈希，用于检测重复上传 |
| createdAt | DateTime | 是 | now() | 创建时间 |
| updatedAt | DateTime | 是 | 自动更新 | 更新时间 |

**索引**：`@@index([userId])`

**category 枚举值**：

| 值 | 含义 |
|----|------|
| TOP | 上衣（T恤/衬衫/针织/卫衣/背心） |
| BOTTOM | 下装（裤子/裙子/短裤） |
| OUTERWEAR | 外套（夹克/大衣/风衣/西装） |
| ONEPIECE | 连体（连衣裙/连体裤/套装） |
| SHOES | 鞋子 |
| ACCESSORY | 配饰（包袋/帽子/围巾/首饰） |

### PersonImage（人像照片）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| userId | String | 是 | — | 所属用户 ID（外键） |
| name | String | 是 | — | 人像名称 |
| imagePath | String | 是 | — | 图片路径（如 `/uploads/persons/xxx.jpg`） |
| enhancedImagePath | String? | 否 | — | AI 美化后的图片路径（如 `/uploads/persons-enhanced/xxx.png`） |
| description | String? | 否 | — | AI 分析的结构化描述 JSON（见下方说明） |
| isDefault | Boolean | 是 | false | 是否为默认人像（试穿时自动选中） |
| createdAt | DateTime | 是 | now() | 创建时间 |

**索引**：`@@index([userId])`

**description 字段格式**：

JSON 字符串，包含 AI 分析的人像特征：

```json
{
  "gender": "女",
  "bodyType": "偏瘦",
  "skinTone": "暖白皮",
  "hairStyle": "长发微卷",
  "vibe": "温柔知性",
  "background": "室内白墙",
  "summary": "暖白皮偏瘦女生，长发微卷，气质温柔知性，适合柔和色系和修身剪裁"
}
```

| 键 | 含义 |
|----|------|
| gender | 性别 |
| bodyType | 体型（偏瘦/匀称/微胖/健壮） |
| skinTone | 肤色（冷白皮/暖白皮/自然肤色/小麦色/深肤色） |
| hairStyle | 发型简述 |
| vibe | 气质风格（甜美/温柔知性/酷帅/优雅大气/阳光运动/文艺清新） |
| background | 拍摄场景简述 |
| summary | 一句话穿搭建议导向总结 |

### Outfit（穿搭记录）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| userId | String | 是 | — | 所属用户 ID（外键） |
| personImageId | String | 是 | — | 关联的人像 ID |
| topItemId | String? | 否 | — | 关联的上衣 ID |
| bottomItemId | String? | 否 | — | 关联的下装 ID |
| resultImagePath | String | 是 | — | 生成结果图片本地路径（如 `/uploads/outfits/xxx.jpg`） |
| isFavorite | Boolean | 是 | false | 是否被收藏 |
| score | Float? | 否 | — | AI 综合评分（五维均值，0–100） |
| scoreDims | String? | 否 | — | 五维评分 JSON（见下方说明） |
| evaluation | String? | 否 | — | AI 搭配评语（2–3 句） |
| scoredAt | DateTime? | 否 | — | 最近一次评分时间 |
| createdAt | DateTime | 是 | now() | 创建时间 |
| updatedAt | DateTime | 是 | 自动更新 | 更新时间 |

**联合唯一索引**：`@@unique([personImageId, topItemId, bottomItemId])`
**索引**：`@@index([userId])`

同一组搭配（人像 + 上衣 + 下装）只会保存一条记录，重新生成时通过 `upsert` 更新 `resultImagePath`。

**scoreDims 字段格式**：

JSON 字符串，包含五个评分维度（每项 1–100 分）：

```json
{
  "colorHarmony": 82,
  "styleCohesion": 76,
  "trendiness": 71,
  "practicality": 88,
  "creativity": 65
}
```

| 键 | 含义 |
|----|------|
| colorHarmony | 色彩和谐 |
| styleCohesion | 风格统一 |
| trendiness | 时尚度 |
| practicality | 实穿性 |
| creativity | 创意度 |

### DailyRecommendation（每日推荐）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| userId | String | 是 | — | 所属用户 ID（外键） |
| date | String | 是 | — | 推荐日期，格式 `YYYY-MM-DD` |
| rank | Int | 是 | — | 排名（1, 2, 3） |
| outfitId | String | 是 | — | 关联的 Outfit ID |
| reason | String? | 否 | — | LLM 给出的推荐搭配理由 |
| createdAt | DateTime | 是 | now() | 创建时间 |

**联合唯一索引**：`@@unique([userId, date, rank])`

每天每个用户保存 Top 5 推荐记录。重新生成推荐时，先删除当天该用户的已有记录再写入新数据。

### WeatherCache（天气缓存）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| locationId | String | 是 | — | 城市 Location ID，如 `"101210101"` |
| hourKey | String | 是 | — | 小时级缓存键，格式 `YYYYMMDDHH`，如 `"2026031714"` |
| data | String | 是 | — | 完整 WeatherData JSON（含 now + 3天预报 + 3天穿衣指数） |
| createdAt | DateTime | 是 | now() | 创建时间 |
| expiresAt | DateTime | 是 | — | 过期时间（createdAt + 30 天） |

**联合唯一索引**：`@@unique([locationId, hourKey])`
**过期索引**：`@@index([expiresAt])`

**缓存策略**：
- 同一城市同一小时内只调一次 QWeather API，后续请求直接读 DB（毫秒级响应）
- 写入新缓存时自动清理所有 `expiresAt < now()` 的过期记录
- 30 天 TTL，表不会无限膨胀
- WeatherCache 不绑定用户，全局共享

### ShowcasePost（穿搭广场帖子）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| userId | String | 是 | — | 发布者用户 ID（外键） |
| outfitId | String | 是 | — | 关联的 Outfit ID（外键，级联删除） |
| caption | String? | 否 | — | 用户配文 |
| likes | Int | 是 | 0 | 点赞数 |
| tryonCount | Int | 是 | 0 | 被试穿次数 |
| isPublic | Boolean | 是 | true | 是否公开（撤回时设为 false） |
| realPhotoPath | String? | 否 | — | 真实穿搭照片路径（OOTD 打卡时附带） |
| createdAt | DateTime | 是 | now() | 创建时间 |
| updatedAt | DateTime | 是 | 自动更新 | 更新时间 |

**关系**：`outfit Outfit @relation(fields: [outfitId], references: [id], onDelete: Cascade)`
**Outfit 反向关系**：`showcasePosts ShowcasePost[]`

**索引**：
- `@@index([userId])` — 按用户查询
- `@@index([isPublic, createdAt])` — 最新排序查询
- `@@index([isPublic, likes])` — 最热排序查询

**隐私保护**：只分享试穿效果图（AI 生成图），不暴露用户原始人像照片。分享后可随时撤回（设 `isPublic = false`），不影响自己的收藏。仅帖子所有者可撤回。

### OotdCheckin（OOTD 每日打卡）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| userId | String | 是 | — | 所属用户 ID（外键） |
| outfitId | String? | 否 | — | 关联的 Outfit ID（外键，可选） |
| realPhotoPath | String | 是 | — | 真实穿搭照片路径（如 `/uploads/ootd/checkin-xxx.png`） |
| caption | String? | 否 | — | 打卡配文 |
| isPublic | Boolean | 是 | false | 是否公开（发布到广场时设为 true） |
| createdAt | DateTime | 是 | now() | 打卡时间 |

**关系**：
- `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- `outfit Outfit? @relation(fields: [outfitId], references: [id])`

**索引**：
- `@@index([userId])` — 按用户查询
- `@@index([userId, createdAt])` — 按月查询打卡记录

---

## 四、认证系统

### 认证方案

自定义 JWT 认证：`bcryptjs` 哈希密码 + `jose` 签发/验证 JWT + HTTP-only Cookie 存 token。

- Token 有效期 7 天，HS256 签名
- Cookie：`auth-token`，httpOnly + sameSite=lax + secure(prod)
- 环境变量：`JWT_SECRET`（至少 32 字符）

### 认证 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 无需 |
| POST | `/api/auth/login` | 登录 | 无需 |
| POST | `/api/auth/logout` | 登出（清除 cookie） | 无需 |
| GET | `/api/auth/me` | 获取当前用户信息 | 需要 |

**POST /api/auth/register** 请求体：

```json
{
  "email": "user@example.com",
  "password": "123456",
  "nickname": "可选昵称"
}
```

校验：邮箱格式、密码 ≥ 6 位、邮箱唯一。成功后自动设置 cookie 并返回用户信息。

**POST /api/auth/login** 请求体：

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**GET /api/auth/me** 返回：

```json
{
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "nickname": "昵称",
    "avatarPath": null,
    "createdAt": "2026-03-22T..."
  }
}
```

### 数据隔离

所有业务查询自动按 `userId` 过滤：

```typescript
const { user, error } = await requireAuth(req);
if (error) return error;

const items = await prisma.item.findMany({
  where: { userId: user.userId },
});
```

单条记录的增删改需验证所有权：

```typescript
const item = await prisma.item.findUnique({ where: { id } });
if (!item || item.userId !== user.userId) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

---

## 五、API 路由参考

> 除特别标注外，所有 API 均需登录（由 middleware 和 requireAuth 双重保护）。

### 图片上传

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传 Base64 图片到本地文件系统 |

请求体：

```json
{
  "image": "data:image/jpeg;base64,...",
  "folder": "items"     // "items" 或 "persons"
}
```

返回：

```json
{
  "path": "/uploads/items/xxxxxxxx.png",
  "processedImage": "data:image/png;base64,...",
  "originalPath": "/uploads/items-original/xxxxxxxx.jpg"
}
```

> `processedImage` 和 `originalPath` 仅在 `folder="items"` 时返回。

### 单品 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items` | 获取当前用户的单品列表 |
| POST | `/api/items` | 创建单品（自动关联当前用户） |
| POST | `/api/items/check-duplicate` | 根据 imageHash 检测当前用户是否重复上传 |
| GET | `/api/items/[id]` | 获取单品详情（需所有权） |
| PUT | `/api/items/[id]` | 更新单品（需所有权） |
| DELETE | `/api/items/[id]` | 删除单品（需所有权，同时删除图片文件） |

**GET /api/items** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 按分类筛选，如 `?category=TOP` |
| q | string | 按名称/描述模糊搜索，如 `?q=V领` |

**POST /api/items** 请求体：

```json
{
  "name": "白色圆领T恤",       // 必填
  "category": "TOP",           // 必填
  "imagePath": "/uploads/items/xxx.jpg",  // 必填
  "color": "白色",             // 可选
  "season": "夏",              // 可选
  "occasion": "日常",          // 可选
  "material": "棉",            // 可选
  "fit": "常规",               // 可选
  "pattern": "纯色",           // 可选
  "thickness": "薄",           // 可选
  "description": "圆领短袖"    // 可选
}
```

> userId 由后端从 JWT 自动注入，前端无需传递。

### 人像 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/persons` | 获取当前用户的人像列表（默认人像排在最前） |
| POST | `/api/persons` | 创建人像（该用户的首张自动设为默认） |
| GET | `/api/persons/[id]` | 获取人像详情（需所有权） |
| PUT | `/api/persons/[id]` | 更新人像（需所有权，支持设为默认） |
| DELETE | `/api/persons/[id]` | 删除人像（需所有权，同时删除图片文件） |

**PUT /api/persons/[id]** 设为默认人像：

```json
{ "isDefault": true }
```

该操作会先将该用户所有已有人像的 `isDefault` 置为 `false`，再将目标人像设为 `true`。

### 穿搭记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/outfits` | 查询当前用户的穿搭（支持缓存查询和收藏列表） |
| PUT | `/api/outfits/[id]` | 更新穿搭（需所有权，收藏/取消收藏） |
| DELETE | `/api/outfits/[id]` | 删除穿搭（需所有权，同时删除结果图片） |

**GET /api/outfits** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| favorites | string | `?favorites=true` 获取当前用户所有收藏穿搭列表 |
| personImageId | string | 按搭配组合查缓存（必填，与下方参数配合使用） |
| topItemId | string | 上衣 ID（可选） |
| bottomItemId | string | 下装 ID（可选） |

**PUT /api/outfits/[id]** 切换收藏状态：

```json
{ "isFavorite": true }
```

> 穿搭记录由 `/api/tryon` 在生成成功后自动创建/更新（upsert），自动关联当前用户，无需手动 POST。

### AI 评分

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/outfits/[id]/evaluate` | 对单套穿搭进行 AI 五维评分（需所有权） |

无请求体。返回：

```json
{
  "score": 78,
  "scoreDims": {
    "colorHarmony": 82,
    "styleCohesion": 76,
    "trendiness": 71,
    "practicality": 88,
    "creativity": 65
  },
  "evaluation": "搭配评语..."
}
```

> 评分结果会同步写入 Outfit 表的 `score`、`scoreDims`、`evaluation`、`scoredAt` 字段。已有评分的穿搭再次调用会覆盖旧分数。

### 每日推荐

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/recommendations` | 获取当前用户指定日期的推荐列表 |
| POST | `/api/recommendations/generate` | 从当前用户衣橱生成每日推荐（SSE 流式响应） |
| POST | `/api/recommendations/rescore` | 仅重新打分当前用户的推荐（复用已有穿搭图像） |

**GET /api/recommendations** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期，格式 `YYYY-MM-DD`，默认今天 |

返回：

```json
{
  "date": "2026-03-15",
  "recommendations": [
    {
      "rank": 1,
      "outfitId": "clxxx",
      "imagePath": "/uploads/outfits/xxx.jpg",
      "score": 85,
      "scoreDims": { "colorHarmony": 89, "styleCohesion": 92, "..." : "..." },
      "evaluation": "搭配评语...",
      "reason": "LLM 推荐理由...",
      "topItem": { "id": "...", "name": "...", "imagePath": "...", "category": "TOP" },
      "bottomItem": { "id": "...", "name": "...", "imagePath": "...", "category": "BOTTOM" }
    }
  ]
}
```

**POST /api/recommendations/generate** 请求体：

```json
{ "personImageId": "clxxx" }
```

响应为 SSE（`text/event-stream`），事件类型：

| 事件 | 说明 |
|------|------|
| `progress` | 各步骤进度（matching / matched / generating / generated / scoring / scored） |
| `complete` | 推荐生成完成，携带 `{ date, recommendations }` |
| `error` | 生成失败，携带 `{ message }` |

**POST /api/recommendations/rescore** 请求体：

```json
{ "date": "2026-03-15" }
```

复用已有穿搭图像，仅重新调用 AI 评分并更新排名。返回格式与 GET 相同。

### 试穿状态

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tryon-status` | 查询试穿任务状态 |

### 穿搭广场

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/showcase` | 获取广场帖子列表（含 realPhotoPath） | **公开** |
| POST | `/api/showcase` | 发布穿搭到广场（支持可选 realPhotoPath） | 需要 |
| DELETE | `/api/showcase/[id]` | 撤回帖子（需验证帖子所有权） | 需要 |
| POST | `/api/showcase/[id]/like` | 点赞（likes +1） | **公开** |
| POST | `/api/showcase/[id]/tryon` | 递增试穿计数（tryonCount +1） | 需要 |
| POST | `/api/showcase/[id]/copy-item` | 一键加衣橱（复制单品到当前用户衣橱） | 需要 |

**GET /api/showcase** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| sort | string | 排序方式：`newest`（默认）/ `hottest` / `random` |
| limit | number | 返回数量，默认 20，最大 50 |

返回数组，每项包含：`id`, `outfitId`, `caption`, `likes`, `tryonCount`, `createdAt`, `outfit`（resultImagePath/score/scoreDims/evaluation）, `topItem`, `bottomItem`。

**POST /api/showcase** 请求体：

```json
{ "outfitId": "clxxx", "caption": "今日穿搭", "realPhotoPath": "/uploads/ootd/checkin-xxx.png" }
```

`realPhotoPath` 可选，用于关联真实穿搭照片（OOTD 打卡发布时附带）。

同一 outfitId 不允许重复发布（返回 409）。userId 由后端自动注入。

**POST /api/showcase/[id]/copy-item** 请求体：

```json
{ "itemId": "clxxx" }
```

复制源 Item 的所有属性字段（name/category/color/style/season 等），创建为当前用户的新 Item。不复制 imageHash/originalImagePath。

> **试穿同款**：广场页的「试穿同款」直接调用 `/api/tryon`（与试穿页完全相同的链路），传入广场帖子关联的单品图片 + 用户人像，复用缓存机制。试穿完成后自动触发 AI 评分，结果弹窗支持收藏、下载、加衣橱。

### OOTD 每日打卡

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/ootd` | 按月查询打卡记录 | 需要 |
| POST | `/api/ootd` | 创建打卡（上传真实照片 base64） | 需要 |
| DELETE | `/api/ootd/[id]` | 删除打卡记录（含图片文件） | 需要 |

**GET /api/ootd** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| month | string | 月份，格式 `YYYY-MM`，默认当月 |

返回当月打卡记录数组，包含关联的 outfit（id、resultImagePath、score）。

**POST /api/ootd** 请求体：

```json
{
  "image": "data:image/jpeg;base64,...",
  "outfitId": "clxxx",
  "caption": "今日穿搭"
}
```

`image` 必填（base64 Data URL）。`outfitId` 和 `caption` 可选。图片保存到 `public/uploads/ootd/`。

**DELETE /api/ootd/[id]**：需验证所有权，同时删除磁盘上的图片文件。

---

## 六、常用 Prisma 查询示例

### 带用户隔离的查询

```typescript
import { prisma } from "@/lib/prisma";

// 获取当前用户的所有上衣，按创建时间倒序
const tops = await prisma.item.findMany({
  where: { userId: user.userId, category: "TOP" },
  orderBy: { createdAt: "desc" },
});

// 模糊搜索（限当前用户）
const results = await prisma.item.findMany({
  where: {
    userId: user.userId,
    OR: [
      { name: { contains: "T恤" } },
      { description: { contains: "T恤" } },
    ],
  },
});
```

### 按 ID 查询（含所有权验证）

```typescript
const item = await prisma.item.findUnique({
  where: { id: "clxxxxxxxxxx" },
});
if (!item || item.userId !== user.userId) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

### 创建记录（关联用户）

```typescript
const newItem = await prisma.item.create({
  data: {
    name: "黑色牛仔裤",
    category: "BOTTOM",
    imagePath: "/uploads/items/xxx.jpg",
    color: "黑色",
    userId: user.userId,
  },
});
```

### 更新记录

```typescript
// 更新单条
const updated = await prisma.item.update({
  where: { id: "clxxxxxxxxxx" },
  data: { color: "深蓝色" },
});

// 批量更新（如：重置当前用户所有人像的默认状态）
await prisma.personImage.updateMany({
  where: { isDefault: true, userId: user.userId },
  data: { isDefault: false },
});
```

### 删除记录

```typescript
await prisma.item.delete({
  where: { id: "clxxxxxxxxxx" },
});
```

> 删除单品/人像时，应同时清理关联的图片文件：
>
> ```typescript
> import fs from "node:fs";
> import path from "node:path";
>
> const item = await prisma.item.findUnique({ where: { id } });
> if (item?.imagePath) {
>   const filePath = path.join(process.cwd(), "public", item.imagePath);
>   if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
> }
> await prisma.item.delete({ where: { id } });
> ```

### 计数（限当前用户）

```typescript
const count = await prisma.personImage.count({
  where: { userId: user.userId },
});
```

### Upsert（创建或更新）

```typescript
// 同一搭配组合只保留一条记录，重新生成时更新图片路径
const outfit = await prisma.outfit.upsert({
  where: {
    personImageId_topItemId_bottomItemId: {
      personImageId: "clxxx",
      topItemId: "clyyy",
      bottomItemId: null,
    },
  },
  update: {
    resultImagePath: "/uploads/outfits/new.jpg",
    updatedAt: new Date(),
  },
  create: {
    personImageId: "clxxx",
    topItemId: "clyyy",
    bottomItemId: null,
    resultImagePath: "/uploads/outfits/new.jpg",
    userId: user.userId,
  },
});
```

### 按条件筛选（当前用户的收藏列表）

```typescript
const favorites = await prisma.outfit.findMany({
  where: { isFavorite: true, userId: user.userId },
  orderBy: { updatedAt: "desc" },
});
```

---

## 七、常用运维命令

所有命令在 `web/` 目录下执行。

```bash
# 将 schema.prisma 的模型同步到 SQLite 数据库
npx prisma db push

# 重新生成 Prisma 客户端（修改 schema 后必须执行）
npx prisma generate

# 打开可视化数据浏览器（浏览器中查看/编辑数据）
npx prisma studio

# 直接用 SQLite 命令行查询
sqlite3 dev.db

# 常用 SQLite 查询
sqlite3 dev.db "SELECT id, email, nickname FROM User;"
sqlite3 dev.db "SELECT id, userId, name, category FROM Item;"
sqlite3 dev.db "SELECT id, userId, name, isDefault FROM PersonImage;"
sqlite3 dev.db "SELECT id, userId, personImageId, topItemId, isFavorite FROM Outfit;"
sqlite3 dev.db "SELECT id, score, scoreDims FROM Outfit WHERE score IS NOT NULL;"
sqlite3 dev.db "SELECT id, userId, date, rank, outfitId FROM DailyRecommendation;"
sqlite3 dev.db ".tables"     # 列出所有表
sqlite3 dev.db ".schema"     # 查看建表语句
```

### 重置数据库

```bash
# 删除数据库文件，重新创建
rm dev.db
npx prisma db push
```

### 修改 Schema 后的流程

1. 编辑 `prisma/schema.prisma`
2. 执行 `npx prisma db push`（同步到数据库）
3. 执行 `npx prisma generate`（重新生成客户端）
4. 重启 dev server（`rm -rf .next && npm run dev`）
