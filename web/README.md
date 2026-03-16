# OOTD Web — AI 每日穿搭助手

基于 Next.js 的全栈 Web App，用于 MVP 阶段的功能开发与验证。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js (App Router) | 16.x | 前端页面 + API 路由 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式 |
| Prisma | 7.x | ORM（SQLite） |
| DashScope API | — | AI 试穿 / 评分 / 推荐 |

## 快速启动

### 1. 安装依赖

```bash
cd web
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

填入 DashScope API Key（在[阿里云百炼平台](https://bailian.console.aliyun.com/)获取）：

```
DASHSCOPE_API_KEY=sk-your-api-key-here
```

### 3. 初始化数据库

```bash
npx prisma db push
npx prisma generate
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

## 项目结构

```
web/
├── app/                          # Next.js App Router 页面
│   ├── page.tsx                  # 首页
│   ├── wardrobe/                 # 衣橱管理（单品列表 + 添加）
│   ├── persons/                  # 人像管理
│   ├── tryon/                    # 虚拟试穿
│   ├── recommendations/          # 每日推荐（LLM pipeline + 雷达图）
│   ├── favorites/                # 收藏管理
│   ├── components/               # 公共组件（NavBar 等）
│   └── api/                      # API 路由
│       ├── items/                #   单品 CRUD
│       ├── persons/              #   人像 CRUD
│       ├── upload/               #   图片上传
│       ├── tryon/                #   虚拟试穿生成
│       ├── outfits/              #   穿搭记录 + AI 评分
│       └── recommendations/      #   每日推荐（生成/查询/重新打分）
├── lib/
│   ├── prisma.ts                 # Prisma 客户端单例
│   ├── qwen.ts                   # DashScope API 封装（评分 + 推荐）
│   └── tryon.ts                  # 虚拟试穿逻辑（含缓存）
├── prisma/
│   └── schema.prisma             # 数据模型定义
├── public/uploads/               # 上传的图片（items/persons/outfits）
├── dev.db                        # SQLite 数据库文件
└── prisma.config.ts              # Prisma CLI 配置
```

## 核心功能

- **衣橱管理**：上传单品图片，手动分类打标
- **人像管理**：上传多张人像，设置默认人像
- **虚拟试穿**：选择人像 + 上衣 + 下装，AI 生成穿搭效果图（同组合自动缓存）
- **AI 评分**：五维雷达图评分（色彩和谐 / 风格统一 / 时尚度 / 实穿性 / 创意度）
- **每日推荐**：LLM 智能匹配 → 批量试穿 → AI 评分 → Top 3 展示
- **搭配收藏**：收藏喜欢的穿搭效果图

## AI 模型

所有 AI 能力通过 DashScope（阿里云百炼）API 调用：

| 模型 | 用途 |
|------|------|
| qwen-image-2.0-pro | 虚拟试穿图像生成 |
| qwen-vl-max | 多模态穿搭评分（五维度） |
| qwen-max | 智能搭配组合推荐 |

## 常用命令

```bash
# 开发
npm run dev                        # 启动开发服务器

# 数据库
npx prisma db push                 # 同步 schema 到数据库
npx prisma generate                # 重新生成 Prisma 客户端
npx prisma studio                  # 可视化数据浏览器

# 构建
npm run build                      # 生产构建
npm run start                      # 启动生产服务器

# 重置
rm -rf .next && npm run dev        # 清除缓存并重启（schema 变更后必须）
rm dev.db && npx prisma db push    # 重置数据库
```

## 相关文档

- [PRD](../docs/PRD.md) — 产品需求文档
- [数据库参考](../docs/database.md) — 数据模型、API 路由、Prisma 用法
- [试穿 API 调研](../docs/tryon-api-research.md) — 虚拟试穿技术方案对比
- [竞品分析](../docs/competitive-analysis.md) — 穿搭类应用竞品分析
