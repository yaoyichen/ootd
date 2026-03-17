# 数据库参考文档

**技术栈**：Prisma 7 + SQLite + better-sqlite3 adapter
**更新日期**：2026-03-17（v4：新增 WeatherCache 模型，天气数据按小时+城市缓存，30天自动过期）

---

## 一、技术栈说明

| 组件 | 版本 | 说明 |
|------|------|------|
| Prisma | 7.x | ORM，提供类型安全的数据库操作 |
| SQLite | — | 轻量级文件数据库，零配置 |
| @prisma/adapter-better-sqlite3 | 7.x | Prisma 7 要求的驱动适配器 |

### Prisma 7 与旧版本的关键区别

Prisma 7 移除了 `schema.prisma` 中的 `datasource.url` 配置，改为在 `prisma.config.ts` 中单独管理连接 URL。同时，`PrismaClient` 构造函数必须传入 `adapter` 参数，不再支持无参构造。

---

## 二、文件结构

```
web/
├── prisma.config.ts              # Prisma CLI 配置（数据库 URL）
├── prisma/
│   ├── schema.prisma             # 数据模型定义 + 生成器配置
│   └── generated/prisma/         # 自动生成的客户端代码（gitignore）
│       ├── client.ts             # PrismaClient 入口
│       ├── models.ts             # 类型定义
│       └── ...
├── lib/
│   ├── prisma.ts                 # 运行时客户端单例
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

**`lib/qwen.ts`** — DashScope Qwen API 封装，包含两个核心函数：

- `scoreOutfit(imagePath)` — 调用 Qwen-VL-Max 对穿搭效果图进行五维评分，返回 `{ score, dims, evaluation }`
- `suggestCombinations(items)` — 调用 Qwen-Max 根据衣橱单品列表推荐 5 组最佳搭配

**`lib/tryon.ts`** — 虚拟试穿生成逻辑：

- `generateTryon(input)` — 调用 DashScope qwen-image-2.0-pro 生成试穿图。内置缓存机制，同一搭配组合（人像 + 上衣 + 下装）不重复生成
- `resolveImage(input)` — 将本地图片路径转换为 Base64 Data URL

---

## 三、数据模型

### Item（衣物单品）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
| name | String | 是 | — | 单品名称 |
| category | String | 是 | — | 分类，见下方枚举 |
| subcategory | String? | 否 | — | 子分类 |
| color | String? | 否 | — | 颜色 |
| style | String? | 否 | — | 风格 |
| season | String? | 否 | — | 季节（春/夏/秋/冬/四季） |
| occasion | String? | 否 | — | 场合（日常/上班/约会/运动/正式/出行） |
| brand | String? | 否 | — | 品牌 |
| price | Float? | 否 | — | 购入价格 |
| purchaseDate | String? | 否 | — | 购入日期 |
| notes | String? | 否 | — | 备注 |
| imagePath | String | 是 | — | 图片路径（如 `/uploads/items/xxx.jpg`） |
| createdAt | DateTime | 是 | now() | 创建时间 |
| updatedAt | DateTime | 是 | 自动更新 | 更新时间 |

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
| name | String | 是 | — | 人像名称 |
| imagePath | String | 是 | — | 图片路径（如 `/uploads/persons/xxx.jpg`） |
| isDefault | Boolean | 是 | false | 是否为默认人像（试穿时自动选中） |
| createdAt | DateTime | 是 | now() | 创建时间 |

### Outfit（穿搭记录）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | 是 | cuid() 自动生成 | 主键 |
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
| date | String | 是 | — | 推荐日期，格式 `YYYY-MM-DD` |
| rank | Int | 是 | — | 排名（1, 2, 3） |
| outfitId | String | 是 | — | 关联的 Outfit ID |
| reason | String? | 否 | — | LLM 给出的推荐搭配理由 |
| createdAt | DateTime | 是 | now() | 创建时间 |

**联合唯一索引**：`@@unique([date, rank])`

每天保存 Top 3 推荐记录。重新生成推荐时，先删除当天已有记录再写入新数据。

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

---

## 四、API 路由参考

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
{ "path": "/uploads/items/xxxxxxxx.jpg" }
```

### 单品 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items` | 获取单品列表 |
| POST | `/api/items` | 创建单品 |
| GET | `/api/items/[id]` | 获取单品详情 |
| PUT | `/api/items/[id]` | 更新单品 |
| DELETE | `/api/items/[id]` | 删除单品（同时删除图片文件） |

**GET /api/items** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 按分类筛选，如 `?category=TOP` |
| q | string | 按名称/品牌模糊搜索，如 `?q=优衣库` |

**POST /api/items** 请求体：

```json
{
  "name": "白色圆领T恤",       // 必填
  "category": "TOP",           // 必填
  "imagePath": "/uploads/items/xxx.jpg",  // 必填
  "color": "白色",             // 可选
  "brand": "优衣库",           // 可选
  "season": "夏",              // 可选
  "occasion": "日常",          // 可选
  "price": 99.0,               // 可选
  "notes": "..."               // 可选
}
```

### 人像 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/persons` | 获取人像列表（默认人像排在最前） |
| POST | `/api/persons` | 创建人像（首张自动设为默认） |
| GET | `/api/persons/[id]` | 获取人像详情 |
| PUT | `/api/persons/[id]` | 更新人像（支持设为默认） |
| DELETE | `/api/persons/[id]` | 删除人像（同时删除图片文件） |

**PUT /api/persons/[id]** 设为默认人像：

```json
{ "isDefault": true }
```

该操作会先将所有已有人像的 `isDefault` 置为 `false`，再将目标人像设为 `true`。

### 穿搭记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/outfits` | 查询穿搭（支持缓存查询和收藏列表） |
| PUT | `/api/outfits/[id]` | 更新穿搭（收藏/取消收藏） |
| DELETE | `/api/outfits/[id]` | 删除穿搭（同时删除结果图片） |

**GET /api/outfits** 查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| favorites | string | `?favorites=true` 获取所有收藏穿搭列表 |
| personImageId | string | 按搭配组合查缓存（必填，与下方参数配合使用） |
| topItemId | string | 上衣 ID（可选） |
| bottomItemId | string | 下装 ID（可选） |

**PUT /api/outfits/[id]** 切换收藏状态：

```json
{ "isFavorite": true }
```

> 穿搭记录由 `/api/tryon` 在生成成功后自动创建/更新（upsert），无需手动 POST。

### AI 评分

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/outfits/[id]/evaluate` | 对单套穿搭进行 AI 五维评分 |

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
| GET | `/api/recommendations` | 获取指定日期的推荐列表 |
| POST | `/api/recommendations/generate` | 生成每日推荐（SSE 流式响应） |
| POST | `/api/recommendations/rescore` | 仅重新打分（复用已有穿搭图像） |

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

---

## 五、常用 Prisma 查询示例

### 查询列表（带条件筛选 + 排序）

```typescript
import { prisma } from "@/lib/prisma";

// 获取所有上衣，按创建时间倒序
const tops = await prisma.item.findMany({
  where: { category: "TOP" },
  orderBy: { createdAt: "desc" },
});

// 模糊搜索
const results = await prisma.item.findMany({
  where: {
    OR: [
      { name: { contains: "T恤" } },
      { brand: { contains: "优衣库" } },
    ],
  },
});
```

### 按 ID 查询

```typescript
const item = await prisma.item.findUnique({
  where: { id: "clxxxxxxxxxx" },
});
```

### 创建记录

```typescript
const newItem = await prisma.item.create({
  data: {
    name: "黑色牛仔裤",
    category: "BOTTOM",
    imagePath: "/uploads/items/xxx.jpg",
    color: "黑色",
    brand: "Levi's",
    price: 399,
  },
});
```

### 更新记录

```typescript
// 更新单条
const updated = await prisma.item.update({
  where: { id: "clxxxxxxxxxx" },
  data: { color: "深蓝色", price: 299 },
});

// 批量更新（如：重置所有人像的默认状态）
await prisma.personImage.updateMany({
  where: { isDefault: true },
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

### 计数

```typescript
const count = await prisma.personImage.count();
```

### 多字段排序

```typescript
// 默认人像排在最前，然后按创建时间倒序
const persons = await prisma.personImage.findMany({
  orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
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
  },
});
```

### 按联合字段查询缓存

```typescript
// 查找是否已有相同搭配的生成记录
const cached = await prisma.outfit.findFirst({
  where: {
    personImageId: "clxxx",
    topItemId: "clyyy",
    bottomItemId: null,
  },
});
```

### 按条件筛选（收藏列表）

```typescript
// 获取所有收藏的穿搭，按更新时间倒序
const favorites = await prisma.outfit.findMany({
  where: { isFavorite: true },
  orderBy: { updatedAt: "desc" },
});
```

---

## 六、常用运维命令

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
sqlite3 dev.db "SELECT id, name, category FROM Item;"
sqlite3 dev.db "SELECT id, name, isDefault FROM PersonImage;"
sqlite3 dev.db "SELECT id, personImageId, topItemId, isFavorite FROM Outfit;"
sqlite3 dev.db "SELECT id, score, scoreDims FROM Outfit WHERE score IS NOT NULL;"
sqlite3 dev.db "SELECT id, date, rank, outfitId FROM DailyRecommendation;"
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
