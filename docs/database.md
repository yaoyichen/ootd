# 数据库参考文档

**技术栈**：Prisma 7 + SQLite + better-sqlite3 adapter
**更新日期**：2026-03-14

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
│   └── prisma.ts                 # 运行时客户端单例
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
