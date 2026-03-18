# 穿搭推荐 Pipeline 详解

> 更新时间：2026-03-18

---

## 一、整体架构

穿搭推荐系统包含 3 条独立流程：

| 流程 | 触发方式 | API 调用 | 耗时 |
|------|---------|---------|------|
| **完整推荐 Pipeline** | 用户点击"生成推荐" | 天气 + LLM + 试穿 + 评分（4 步） | ~2-3 分钟 |
| **重新打分** | 用户点击"重新打分" | 仅评分（1 步） | ~30 秒 |
| **Surprise Me** | 用户点击"Surprise Me" | 零 API 调用，纯本地查询 | 秒出 |

---

## 二、完整推荐 Pipeline

### 流程图

```
用户点击「生成推荐」
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  前端发起 POST /api/recommendations/generate        │
│  参数: { personImageId, locationId, targetDay }     │
│  响应: SSE 流式推送                                  │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─ Step 0: 获取天气 ──────────────────────────────────┐
│                                                      │
│  和风天气 API                                        │
│  ├─ /v7/weather/now  → 实时天气                      │
│  ├─ /v7/weather/7d   → 7 天预报                      │
│  └─ /v7/indices/7d   → 7 天穿衣指数                  │
│                                                      │
│  缓存策略: SQLite WeatherCache 表                    │
│  ├─ 按 (locationId, hourKey) 唯一索引                │
│  ├─ 同城市同小时仅 1 次 API 调用                     │
│  └─ 30 天自动过期                                    │
│                                                      │
│  输出: weatherContext 文本（城市+天气+温度+穿衣建议） │
│  失败处理: 跳过天气，继续后续步骤                     │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ Step 1: LLM 智能匹配 ─────────────────────────────┐
│                                                      │
│  模型: Qwen-Max（纯文本 LLM）                        │
│  文件: lib/qwen.ts → suggestCombinations()           │
│  Prompt: lib/prompts/matching.ts                     │
│                                                      │
│  输入:                                               │
│  ├─ 衣橱全部单品（id, name, category, color,         │
│  │   style, season, occasion, material, fit,         │
│  │   pattern, thickness, description）               │
│  ├─ 上衣/外套 = category IN (TOP, OUTERWEAR)        │
│  ├─ 下装/连体 = category IN (BOTTOM, ONEPIECE)      │
│  └─ weatherContext（可选）                            │
│                                                      │
│  匹配逻辑（Prompt 指导）:                            │
│  ├─ 1. 颜色协调（同色系、互补色、中性色）            │
│  ├─ 2. 风格统一                                      │
│  ├─ 3. 多样性（覆盖不同风格）                        │
│  ├─ 4. 天气适宜（如有天气信息）                      │
│  ├─ 5. 材质搭配（质感协调）                          │
│  ├─ 6. 版型平衡（松紧对比）                          │
│  └─ 7. 图案繁简搭配（避免花+花）                    │
│                                                      │
│  输出: 5 组搭配 [{topItemId, bottomItemId, reason}]  │
│  校验: 过滤掉不存在的 itemId，最多取 5 组            │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ Step 2: 批量虚拟试穿 ─────────────────────────────┐
│                                                      │
│  模型: qwen-image-2.0-pro（DashScope AIGC）          │
│  文件: lib/tryon.ts → generateTryon()                │
│  Prompt: lib/prompts/tryon.ts                        │
│                                                      │
│  对每组搭配（串行，间隔 2s 防限流）:                  │
│                                                      │
│  输入:                                               │
│  ├─ 图1: 用户全身人像（personImage）                 │
│  ├─ 图2: 上衣抠图（topItem.imagePath）               │
│  ├─ 图3: 下装抠图（bottomItem.imagePath）            │
│  └─ 文本: "让这个人穿上图2的XX和图3的XX"             │
│                                                      │
│  参数:                                               │
│  ├─ 分辨率: 768×1152                                 │
│  ├─ negative_prompt: 面部变化/五官变形/姿势改变等    │
│  └─ prompt_extend: false, watermark: false           │
│                                                      │
│  缓存策略:                                           │
│  ├─ Outfit 表唯一约束 (personImageId, topItemId,     │
│  │   bottomItemId)                                   │
│  ├─ 同一组合直接返回缓存，不重复生成                 │
│  └─ 生成图片下载到 public/uploads/outfits/           │
│                                                      │
│  输出: outfitId + imagePath（本地路径）               │
│  失败处理: 跳过失败的组合，继续下一组                 │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ Step 3: AI 五维评分 ──────────────────────────────┐
│                                                      │
│  模型: Qwen-VL-Max（多模态视觉 LLM）                │
│  文件: lib/qwen.ts → scoreOutfit()                   │
│  Prompt: lib/prompts/scoring.ts                      │
│                                                      │
│  对每套穿搭效果图（并行评分）:                        │
│                                                      │
│  输入: 试穿效果图                                    │
│                                                      │
│  五维评分（每项 1-100 分）:                           │
│  ├─ colorHarmony  色彩和谐                           │
│  ├─ styleCohesion 风格统一                           │
│  ├─ trendiness    时尚度                             │
│  ├─ practicality  实穿性                             │
│  └─ creativity    创意度                             │
│                                                      │
│  综合分 = 五维平均值                                  │
│                                                      │
│  评语风格: 毒舌时尚主编，犀利但有爱                   │
│  ├─ 2-3 句短句，不超过 70 字                         │
│  ├─ HTML 富文本高亮关键词                            │
│  │   ├─ #F27C88 粉色 = 正面亮点                     │
│  │   ├─ #FF6B6B 红色 = 毒舌吐槽                     │
│  │   └─ #FFB347 橙色 = 结尾金句                     │
│  └─ 最高分与最低分至少差 25 分                       │
│                                                      │
│  输出: { score, dims, evaluation }                   │
│  写入: Outfit 表 (score, scoreDims, evaluation)      │
│  失败处理: 默认 70 分，evaluation = "评分暂不可用"   │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ Step 4: 排序 & 存储 ─────────────────────────────┐
│                                                      │
│  1. 按综合分降序排列                                  │
│  2. 取 Top 5                                         │
│  3. 清除当天已有的 DailyRecommendation               │
│  4. 写入新的 DailyRecommendation（date, rank, outfitId, reason）│
│  5. 组装完整响应（含单品详情）                        │
│  6. SSE 推送 "complete" 事件                         │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ 前端展示 ─────────────────────────────────────────┐
│                                                      │
│  每张推荐卡片包含:                                    │
│  ├─ 穿搭效果图（3:4 比例）                           │
│  ├─ 排名徽章（1-5）                                  │
│  ├─ 单品缩略图（可点击预览大图）                     │
│  ├─ 单品名称标签                                     │
│  ├─ 五维雷达图 + 综合分                              │
│  ├─ AI 评语（HTML 富文本渲染）                       │
│  └─ 收藏按钮                                         │
└──────────────────────────────────────────────────────┘
```

### SSE 进度事件

前端通过 Server-Sent Events 实时接收进度，驱动 UI 状态切换：

| 事件 | step 值 | 前端 phase | 说明 |
|------|---------|-----------|------|
| progress | `weather` | matching | 正在获取天气 |
| progress | `weather_done` | matching | 天气获取完成，附带 weather 数据 |
| progress | `matching` | matching | 正在 LLM 匹配 |
| progress | `matched` | matching | 匹配完成，附带组合数量 |
| progress | `generating` | generating | 正在生成第 N 套试穿图 |
| progress | `generated` | generating | 第 N 套生成完成 |
| progress | `generate_failed` | generating | 第 N 套生成失败，跳过 |
| progress | `scoring` | scoring | 正在 AI 评分 |
| progress | `scored` | scoring | 第 N 套评分完成 |
| complete | - | complete | 全部完成，附带 recommendations 数组 |
| error | - | error | Pipeline 失败 |

### 模型调用汇总

| 步骤 | 模型 | 调用次数 | 说明 |
|------|------|---------|------|
| Step 1 匹配 | Qwen-Max | 1 次 | 一次性输出 5 组搭配 |
| Step 2 试穿 | qwen-image-2.0-pro | 最多 5 次 | 每组搭配 1 次，有缓存可跳过 |
| Step 3 评分 | Qwen-VL-Max | 最多 5 次 | 每套效果图 1 次，并行执行 |

单次完整 Pipeline 最多 11 次模型调用（1 + 5 + 5）。

---

## 三、重新打分流程

```
用户点击「重新打分」
        │
        ▼
POST /api/recommendations/rescore
参数: { date }
        │
        ▼
┌─────────────────────────────────────────┐
│  1. 查询当天 DailyRecommendation        │
│  2. 获取关联的 Outfit 记录              │
│  3. 对每套效果图调用 scoreOutfit()      │
│     （并行，复用已有图片）              │
│  4. 更新 Outfit 表的评分数据            │
│  5. 按新分数重新排序 rank               │
│  6. 返回更新后的 recommendations        │
└─────────────────────────────────────────┘
```

特点：不重新匹配、不重新生成试穿图，仅重新评分。适用于对评分结果不满意时快速刷新。

---

## 四、Surprise Me 流程

### 整体流程图

```
用户点击「Surprise Me」按钮
        │
        ▼
┌─ 前端 handleQuickOutfit() ─────────────────────────┐
│                                                      │
│  1. 收集已展示过的 outfitId → excludeIds            │
│  2. 打开 Surprise Me Modal（quickOpen = true）      │
│  3. 发起 GET /api/outfits/quick                     │
│     参数: { excludeIds, date, limit=5 }             │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ 后端四层优先级查询（逐层填充至 limit）─────────────┐
│                                                      │
│  核心思路: 逐层填充，直到凑满 limit 条              │
│  每层查询都排除 usedIds（已选 + excludeIds）        │
│                                                      │
│  ┌─ Layer 1: 当天推荐 ───────────────────────┐     │
│  │  数据源: DailyRecommendation 表            │     │
│  │  条件: date = 当天, outfitId NOT IN used   │     │
│  │  排序: rank ASC                            │     │
│  │  标签: "今日推荐"                          │     │
│  └────────────────────────────────────────────┘     │
│           │ 不够？                                   │
│           ▼                                          │
│  ┌─ Layer 2: 应季高分 ───────────────────────┐     │
│  │  数据源: Outfit 表 JOIN Item 表            │     │
│  │  条件:                                     │     │
│  │  ├─ score ≥ 75                             │     │
│  │  ├─ resultImagePath 非空                   │     │
│  │  └─ 单品 season 匹配当前月份              │     │
│  │     ├─ 3-5月 → 春/四季                    │     │
│  │     ├─ 6-8月 → 夏/四季                    │     │
│  │     ├─ 9-11月 → 秋/四季                   │     │
│  │     └─ 12-2月 → 冬/四季                   │     │
│  │  选取: 加权随机                            │     │
│  │  ├─ weight = score - 75 + 1               │     │
│  │  └─ isFavorite 额外 ×1.5                  │     │
│  │  标签: "应季高分搭配"                      │     │
│  └────────────────────────────────────────────┘     │
│           │ 不够？                                   │
│           ▼                                          │
│  ┌─ Layer 3: 历史高分 ───────────────────────┐     │
│  │  数据源: Outfit 表                         │     │
│  │  条件: score ≥ 70, 不限季节               │     │
│  │  选取: 加权随机（weight = score - 70 + 1）│     │
│  │  标签: "历史高分搭配"                      │     │
│  └────────────────────────────────────────────┘     │
│           │ 不够？                                   │
│           ▼                                          │
│  ┌─ Layer 4: 兜底 ───────────────────────────┐     │
│  │  数据源: Outfit 表                         │     │
│  │  条件: resultImagePath 非空，不限分数     │     │
│  │  选取: 纯随机                              │     │
│  │  标签: "历史搭配"                          │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  每层选中的 outfitId 加入 usedIds，防止跨层重复    │
│  统计 remaining = 各层剩余未选数量之和              │
│                                                      │
│  返回: { outfits[], remaining }                     │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─ 前端 Modal 展示 ─────────────────────────────────┐
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │         Surprise Me                       │       │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │       │
│  │  │效果图│ │效果图│ │效果图│ │效果图│       │       │
│  │  │ 78分 │ │ 75分 │ │ 73分 │ │ 71分 │       │       │
│  │  │  ♡  │ │  ♡  │ │  ♥  │ │  ♡  │       │       │
│  │  └─────┘ └─────┘ └─────┘ └─────┘       │       │
│  │                                          │       │
│  │  已展示 5 套，还有 12 套                  │       │
│  │                                          │       │
│  │  [ 换一批 ]              [ 关闭 ]        │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  每张卡片:                                           │
│  ├─ 穿搭效果图                                      │
│  ├─ 评分徽章（左上角）                              │
│  ├─ 单品缩略图（左下角，可点击预览）                │
│  ├─ 收藏按钮（右下角）                              │
│  └─ 推荐来源标签（右上角）                          │
│                                                      │
│  底部统计: "已展示 X 套，还有 Y 套"                 │
└──────────────────────────────────────────────────────┘
        │
        │ 用户点击「换一批」
        ▼
┌─ 换一批逻辑 ──────────────────────────────────────┐
│                                                      │
│  1. 将当前展示的 outfitId 追加到 excludeIds         │
│  2. 重新调用 GET /api/outfits/quick                 │
│     （带上累积的 excludeIds）                        │
│  3. 后端四层查询自动跳过已展示的搭配                │
│  4. 返回新一批搭配 + 更新 remaining                 │
│  5. 前端替换 Modal 内容                             │
│                                                      │
│  当 remaining = 0 时:                                │
│  └─ "换一批"按钮不再显示新结果                      │
└──────────────────────────────────────────────────────┘
```

### 加权随机算法

```
输入: items[], threshold, limit
输出: 选中的 limit 个 item

while 结果数 < limit && 池子非空:
    1. 计算每个 item 的权重:
       weight = (score - threshold + 1) × (isFavorite ? 1.5 : 1.0)
    2. 计算权重总和 total
    3. 生成随机数 r ∈ [0, total)
    4. 遍历池子，累减 r，r ≤ 0 时选中该 item
    5. 从池子中移除已选 item
```

分数越高、被收藏过的搭配，被选中的概率越大，但不是确定性的——每次点"换一批"都有新鲜感。

### 关键特性

| 特性 | 说明 |
|------|------|
| 零 API 调用 | 完全基于 SQLite 本地查询，无模型调用 |
| 秒出结果 | 无网络延迟，体验流畅 |
| 去重机制 | 前端累积 excludeIds，保证不重复 |
| 季节感知 | Layer 2 根据当前月份匹配应季单品 |
| 收藏加权 | 用户收藏过的搭配更容易出现 |
| 四层兜底 | 即使没有评分数据，只要有试穿图就能展示 |

---

## 五、数据模型

```
Item（单品）
├─ id, name, category (TOP/BOTTOM/OUTERWEAR/ONEPIECE)
├─ color, style, season, occasion
├─ material（材质）, fit（版型）, pattern（图案）, thickness（厚度）
├─ description（简短描述）
├─ imagePath（抠图后）, originalImagePath（原始）
└─ imageHash

PersonImage（人像）
├─ id, name, imagePath, isDefault
└─ createdAt

Outfit（穿搭）
├─ id, personImageId, topItemId, bottomItemId
├─ resultImagePath（试穿效果图）
├─ score, scoreDims（JSON 五维评分）
├─ evaluation（AI 评语，HTML 富文本）
├─ isFavorite, scoredAt
└─ 唯一约束: (personImageId, topItemId, bottomItemId)

DailyRecommendation（每日推荐）
├─ id, date, rank（1-5）, outfitId, reason
└─ 唯一约束: (date, rank)

WeatherCache（天气缓存）
├─ id, locationId, hourKey（YYYYMMDDHH）
├─ data（完整 WeatherData JSON）
└─ 唯一约束: (locationId, hourKey)
```

---

## 六、关键文件索引

| 文件 | 职责 |
|------|------|
| `web/app/recommendations/page.tsx` | 推荐页前端（WeatherCard、RecommendationCard、RadarChart、Surprise Me Modal） |
| `web/app/api/recommendations/generate/route.ts` | 完整推荐 Pipeline（SSE 流式） |
| `web/app/api/recommendations/route.ts` | 查询已有推荐（GET） |
| `web/app/api/recommendations/rescore/route.ts` | 重新打分 |
| `web/app/api/outfits/quick/route.ts` | Surprise Me 快速推荐 |
| `web/app/api/weather/route.ts` | 天气 API 代理 |
| `web/lib/weather.ts` | 天气数据获取、缓存、摘要生成 |
| `web/lib/qwen.ts` | LLM 匹配 + AI 评分 |
| `web/lib/tryon.ts` | 虚拟试穿生成 + 缓存 |
| `web/lib/llm.ts` | LLM 调用封装（Qwen-Max / Qwen-VL-Max） |
| `web/lib/prompts/matching.ts` | 搭配匹配 Prompt |
| `web/lib/prompts/scoring.ts` | 评分 Prompt（毒舌主编风格） |
| `web/lib/prompts/tryon.ts` | 试穿 Prompt + Negative Prompt |
