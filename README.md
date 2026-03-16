# OOTD — AI 每日穿搭助手

一个能「看到自己穿上效果」的 AI 穿搭推荐应用。用户上传衣物和个人照片，AI 生成真实穿着效果图，并智能推荐每日最佳搭配。

## 核心亮点

- **所见即所得**：不是文字搭配建议，而是 AI 生成你穿上这套衣服的效果图
- **智能推荐**：LLM 分析衣橱，自动匹配搭配组合，五维评分排序
- **懂你的衣橱**：基于你真实拥有的衣物推荐，不是通用模板

## 功能概览

| 功能 | 说明 |
|------|------|
| 衣橱管理 | 上传单品图片，分类打标（上衣/下装/外套/连体/鞋子/配饰） |
| 人像管理 | 上传多张全身人像，设置默认人像 |
| 虚拟试穿 | 选择人像 + 衣物，AI 生成穿搭效果图（同组合缓存复用） |
| AI 评分 | 五维雷达图（色彩和谐/风格统一/时尚度/实穿性/创意度） |
| 每日推荐 | LLM 智能匹配 → 批量试穿 → AI 评分 → Top 3 展示 |
| 搭配收藏 | 收藏喜欢的穿搭效果图 |

## 技术栈

**MVP 阶段（当前）**：Next.js 全栈 Web App

```
前端：Next.js 16 (App Router) + TypeScript + Tailwind CSS
后端：Next.js API Routes + Prisma 7 + SQLite
AI：DashScope（阿里云百炼）
  ├── qwen-image-2.0-pro  — 虚拟试穿图像生成
  ├── qwen-vl-max         — 多模态穿搭评分
  └── qwen-max            — 智能搭配推荐
```

## 快速启动

```bash
# 1. 安装依赖
cd web
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 DashScope API Key

# 3. 初始化数据库
npx prisma db push
npx prisma generate

# 4. 启动
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

## 项目结构

```
ootd/
├── web/                   # Next.js 全栈 Web App（MVP）
│   ├── app/               #   页面 + API 路由
│   ├── lib/               #   核心库（Prisma / Qwen API / 试穿逻辑）
│   ├── prisma/            #   数据模型定义
│   └── public/uploads/    #   上传的图片资源
├── docs/                  # 项目文档
│   ├── PRD.md             #   产品需求文档
│   ├── database.md        #   数据库 & API 参考
│   ├── tryon-api-research.md  # 试穿 API 技术调研
│   └── competitive-analysis.md # 竞品分析
├── scripts/               # 调试脚本
└── test_data/             # 测试用图片（人像/上衣/下装）
```

## 文档

| 文档 | 说明 |
|------|------|
| [PRD](docs/PRD.md) | 产品需求文档（v0.2） |
| [数据库参考](docs/database.md) | 数据模型、API 路由、Prisma 用法 |
| [试穿 API 调研](docs/tryon-api-research.md) | 虚拟试穿技术方案对比 |
| [竞品分析](docs/competitive-analysis.md) | 穿搭类应用竞品分析 |
| [Web App 说明](web/README.md) | Web 子项目的详细开发文档 |

## 开发进度

### Phase 1 — MVP（进行中）

- [x] 单品上传 + 手动分类标签
- [x] 人像上传 + 多人像管理与切换
- [x] 虚拟试穿效果图生成（含缓存）
- [x] 搭配收藏
- [x] LLM 每日推荐 pipeline
- [x] AI 五维评分 + 雷达图
- [x] 重新打分功能
- [ ] AI 自动识别分类
- [ ] 天气联动 + 场景选择

### Phase 2 — 完整体验

- [ ] 多件叠穿（外套/鞋子/配饰）
- [ ] OOTD 打卡记录
- [ ] 衣橱统计

### Phase 3 — 增长

- [ ] iOS / 小程序上线
- [ ] 社区分享
- [ ] 电商导入
