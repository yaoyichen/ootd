# 虚拟试穿 API 调研报告

**目标场景**：人像照片 + 上衣图 + 下装图 → 生成用户穿上完整搭配的效果图

---

## 一、阿里云百炼 — AI试衣（OutfitAnyone）⭐ 推荐

### 产品信息

| 项目 | 内容 |
|------|------|
| 产品名 | AI试衣 / OutfitAnyone |
| 所属平台 | 阿里云百炼（Bailian / DashScope） |
| 中文文档 | https://help.aliyun.com/zh/model-studio/outfitanyone/ |
| API 文档（中文） | https://help.aliyun.com/zh/model-studio/outfitanyone-api |
| API 文档（English） | https://www.alibabacloud.com/help/en/model-studio/aitryon-plus-api |
| 计费说明 | https://help.aliyun.com/zh/model-studio/billing-for-outfitanyone |
| 图像解析 API | https://help.aliyun.com/zh/model-studio/aitryon-parsing-api |

### 可用模型

| 模型 ID | 说明 |
|---------|------|
| `aitryon` | 基础版 — 速度快 |
| `aitryon-plus` | 增强版 — 质量更高，面料/Logo 还原更准，略慢 |
| `aitryon-parsing-v1` | 辅助模型：从照片中裁切 / 分割单品 |
| `aitryon-refiner` | 后处理：对生成图进行超分 / 细节增强 |

### 核心能力（OOTD 场景直接支持）

请求体原生支持三个字段，**完全契合上衣 + 下装 + 人像的使用场景**：

```json
{
  "person_image_url": "全身正面人像",
  "top_garment_url":  "上衣平铺图",
  "bottom_garment_url": "下装平铺图"
}
```

其他支持模式：
- 仅上衣（模型自动补全下装）
- 仅下装（模型自动补全上衣）
- 连衣裙 / 连体裤（上装字段传连衣裙，下装留空）
- 保留人像已有某件衣服（配合 parsing API 实现）

### API 调用方式

- **协议**：REST HTTP，仅支持异步（两步）
- **Endpoint**：`https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis/`
- **鉴权**：Bearer Token（`Authorization: Bearer $DASHSCOPE_API_KEY`）
- **异步头**：`X-DashScope-Async: enable`
- **流程**：POST 提交任务 → 获取 `task_id` → 轮询查询结果

### 定价

- 按量计费，月累计阶梯定价（用量越多单价越低）
- 有**免费额度**：新用户开通后赠送试用量（有效期 30–90 天）
- 结果图片 URL **24 小时后失效**，需及时下载

### 限制

- 仅支持**华北2（北京）**区域
- 人像建议：正面全身、双手双脚入镜、穿着简洁（短袖+短裤效果最佳），避免裙摆/宽袖/配饰
- 服装图建议：平铺拍摄，高分辨率，背景简洁
- 结果数据 **24 小时后清除**

### 成熟度评估

- 基于阿里巴巴通义实验室 HumanAIGC 团队发表的 OutfitAnyone 论文
- 已在淘宝 / 天猫电商场景大规模使用
- 文档完善，有中英双语，有辅助工具链（parsing + refiner）
- **综合评分：高**

---

## 二、阿里云百炼 — Qwen-Image-2.0-Pro 图像编辑方案

### 产品信息

| 项目 | 内容 |
|------|------|
| 模型名 | `qwen-image-2.0-pro`（图像编辑模式） |
| 所属平台 | 阿里云百炼（Bailian / DashScope） |
| 文生图 API 文档 | https://www.alibabacloud.com/help/zh/model-studio/qwen-image-api |
| 图像编辑 API 文档 | https://www.alibabacloud.com/help/zh/model-studio/qwen-image-edit |
| 在线体验（北京） | https://bailian.console.aliyun.com/?tab=model#/efm/model_experience_center/vision?currentTab=imageGenerate&modelId=qwen-image-max |

### 可用模型
价格列表 https://help.aliyun.com/zh/model-studio/models?spm=a2c4g.11186623.0.0.47696262zdU4Pw#4219acf25en2i

| 模型 ID | 说明 |
|---------|------|
| `qwen-image-2.0-pro` | Pro 系列 — 文字渲染、真实质感、语义遵循能力更强 |
| `qwen-image-2.0` | 加速版 — 兼顾效果与响应速度，价格更低 |
| `qwen-image-edit-max` | 编辑 Max 系列 — 工业设计、几何推理、角色一致性更强 |

### 核心能力

通用图像生成与编辑一体化模型，通过 prompt 指令驱动：

- **多图输入**：支持 1–3 张参考图片 + 文字指令，在 `content` 数组中按顺序传入
- **同步调用**：直接返回结果，无需轮询
- **多图输出**：单次可输出 1–6 张候选图片
- **灵活输入格式**：同时支持公网 URL 和 Base64 编码
- **Prompt 驱动**：通过自然语言描述控制编辑行为，灵活度高

### OOTD 场景用法

content 数组传入 3 个 image 对象（人像 + 上衣 + 下装）+ 1 个 text 指令：

```json
{
  "model": "qwen-image-2.0-pro",
  "input": {
    "messages": [{
      "role": "user",
      "content": [
        { "image": "人像全身照 URL 或 Base64" },
        { "image": "上衣平铺图 URL 或 Base64" },
        { "image": "下装平铺图 URL 或 Base64" },
        { "text": "图1是一个人的全身照，请让这个人穿上图2中的上衣和图3中的裤子，保持人物的面部、发型、身材和姿势完全不变，仅替换衣服，输出全身照" }
      ]
    }]
  },
  "parameters": {
    "n": 1,
    "size": "768*1152",
    "negative_prompt": "变形, 面部变化, 姿势变化, 模糊, 低质量",
    "prompt_extend": false,
    "watermark": false
  }
}
```

> **注意**：`prompt_extend` 建议设为 `false`，避免模型改写 prompt 导致语义偏离。

### API 调用方式

- **协议**：REST HTTP，**同步接口**（推荐）
- **Endpoint（北京）**：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- **鉴权**：Bearer Token（`Authorization: Bearer $DASHSCOPE_API_KEY`）
- **响应**：直接返回生成图片 URL，无需轮询

响应结构：

```json
{
  "output": {
    "choices": [{
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": [{ "image": "https://...result.png?Expires=xxx" }]
      }
    }]
  }
}
```

### 定价

- `qwen-image-2.0-pro`：**$0.075/张**（约 ¥0.54/张）
- `qwen-image-2.0`：**$0.035/张**（约 ¥0.25/张）
- 新用户免费额度：各 **100 张**（开通后 90 天内有效）
- 按成功生成的图片张数计费，失败不计费

### 优势

- **同步接口**，无需轮询等待（aitryon 需异步轮询 ~30–90 秒）
- **Prompt 灵活性高**，可通过文字指令控制姿势、风格、场景等
- **支持多图输出**，单次生成 1–6 张候选图供用户挑选
- **支持 Base64 直传**，无需先上传到 OSS
- 与同平台 aitryon 共用 API Key，无额外接入成本

### 劣势

- **非专用试穿模型**，面部/身材一致性不如 aitryon 稳定
- **依赖 prompt 质量**，需精心设计指令才能获得好的试穿效果
- 通用模型可能出现"不听指令"的情况（如仍改变人脸/姿势）
- 无专用辅助工具链（无 parsing / refiner）

### 限制

- 最多 **3 张**输入图片（正好满足人像 + 上衣 + 下装）
- 输出分辨率在 512×512 ~ 2048×2048 之间
- Prompt 最长 800 字符，negative_prompt 最长 500 字符
- 图片大小不超过 10 MB
- 结果 URL **24 小时后失效**

### 成熟度评估

- 基于千问多模态大模型，AI Arena 图像编辑评测全球第二
- 官方文档中有明确的多图换装示例，场景适配性已验证
- 同一平台共用 API Key，与 aitryon 可灵活切换
- **综合评分：中高**（试穿精度不如专用模型，但灵活性更强）

---

---

## 三、火山引擎 — 图片换装 V2

### 产品信息

| 项目 | 内容 |
|------|------|
| 产品名 | 图片换装（Image Outfit Changing） |
| 所属平台 | 火山引擎图像生成大模型（产品线 86081） |
| API 文档 | https://www.volcengine.com/docs/86081/1660172 |
| 计费说明 | https://www.volcengine.com/docs/86081/1660198 |
| 能力介绍 | https://www.volcengine.com/docs/86081/1660267 |
| V2 调用指南 | https://www.volcengine.com/docs/86081/1660479 |
| 异步调用 | https://www.volcengine.com/docs/86081/1660200 |

### 核心能力

通过 `req_key` 参数切换模式，支持多种试穿场景：
- 仅上衣
- 仅下装
- **上下装组合**（V1–V5 版本均支持，直接满足 OOTD 场景）
- 连衣裙 / 一件式

### API 调用方式

- **协议**：REST HTTP，支持**同步和异步**两种模式
- **鉴权**：火山引擎 AK/SK 签名（Signature V4）
- 也提供 SDK 封装

### 定价

- 按图计费，按量付费
- 具体单价需登录控制台查看
- 暂无公开免费额度信息

### 限制

- 详细文档需登录火山引擎账号才能查看完整参数
- 图片格式：JPEG / PNG，≤ 10 MB，最小 300×300 px
- 定价透明度低于阿里云

### 成熟度评估

- 底层技术来自字节跳动 CVPR 2022 论文（wFlow 方法）
- 抖音 / TikTok 电商内部大规模使用，基础设施稳定
- 如果已有火山引擎账号，接入摩擦最小
- **综合评分：高**（文档透明度略逊于阿里云）

---

## 四、其他平台

| 平台 | 结论 |
|------|------|
| **腾讯云** | 无独立商业 VTON API，只有开发者用开源模型自建的方案 |
| **百度智能云** | 无独立商业 VTON 产品，千帆平台不含该功能 |
| **快手可图 Kolors** | 有研究演示（ModelScope Demo），无稳定商业 API，暂不适合集成 |

---

## 五、阿里云百炼 — 万相 wan2.5-i2i-preview 图像编辑方案

### 产品信息

| 项目 | 内容 |
|------|------|
| 模型名 | `wan2.5-i2i-preview`（图像编辑模式） |
| 所属平台 | 阿里云百炼（Bailian / DashScope） |
| API 文档 | https://help.aliyun.com/zh/model-studio/wan2-5-image-edit-api-reference |
| 使用指南 | https://help.aliyun.com/zh/model-studio/wan-image-edit-2-5 |

### 核心能力

通义万相 2.5 图像编辑模型，支持单图编辑和多图融合：

- **单图编辑**：输入一张图 + prompt，通过文字指令修改图片内容（如换装、换风格）
- **多图融合**：输入多张图 + prompt，将多图元素融合到一张图中

### OOTD 场景用法

通过 `input.images` 数组传入 3 张图片（人像 + 上衣 + 下装）+ prompt 指令：

```json
{
  "model": "wan2.5-i2i-preview",
  "input": {
    "images": ["人像 Base64", "上衣 Base64", "下装 Base64"],
    "prompt": "图1是一个人的全身照，请让这个人穿上图2中的上衣和图3中的裤子...",
    "negative_prompt": "面部变化, 五官变形, 姿势改变..."
  },
  "parameters": {
    "n": 1,
    "size": "768*1152"
  }
}
```

### API 调用方式

- **协议**：REST HTTP，**异步接口**（提交 + 轮询）
- **Endpoint**：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis`
- **鉴权**：Bearer Token + `X-DashScope-Async: enable`
- **流程**：POST 提交任务 → 获取 `task_id` → 轮询 `GET /api/v1/tasks/{task_id}`
- **输入格式**：支持公网 URL、Base64 编码、`file://` 本地路径

### 定价

- `wan2.5-i2i-preview`：**¥0.20/张**
- 新用户免费额度：**50 张**（开通后 90 天内有效）
- 按成功生成的图片张数计费，失败不计费

### 实测结果（2026-03-21）

使用本地衣橱图片（白色Polo衫 928×1120 + 白色阔腿裤 672×1536 + 人像）测试：

- ✅ **多图输入成功**：images 数组传 3 张 Base64 图片，正常生成
- ✅ **试穿效果优秀**：面部保持自然、衣服融合度高、光线真实
- ⏱️ **耗时 ~46 秒**（异步轮询，比 qwen-image-2.0 的 ~15s 慢）
- ⚠️ **图片最小尺寸 384px**：低于此尺寸会报 `Image dimensions must be in [384, 5000]`
- ❌ 不支持 multimodal-generation 同步端点

### 优势

- **价格与 qwen-image-2.0 相同**（¥0.2/张），万相系列图编辑能力更强
- 支持 Base64 直传，与现有 `lib/tryon.ts` 管线兼容
- 共用 DashScope API Key，零额外接入成本

### 劣势

- **异步接口**，需轮询等待 ~45s（vs qwen-image-2.0 同步 ~15s）
- **图片最小 384px** 限制，小图需前置缩放
- Preview 阶段，API 可能变动

### 成熟度评估

- 万相 2.5 系列为阿里最新图像编辑模型
- 多图融合能力经实测验证，试穿场景可用
- Preview 阶段，稳定性待观察
- **综合评分：中高**

---

## 六、qwen-image 系列多图兼容性测试（2026-03-21）

以下模型均使用 `multimodal-generation` 同步端点测试 3 图输入（人像 + 上衣 + 下装）：

| 模型 ID | 价格 | 支持 3 图试穿 | 备注 |
|---------|------|:---:|------|
| `qwen-image-2.0` | ¥0.2/张 | ✅ | **当前默认**，已在生产使用 |
| `qwen-image-2.0-pro` | ¥0.5/张 | ✅ | 质量更好 |
| `qwen-image-plus` | ¥0.2/张 | ❌ | `content parameter's length invalid` |
| `qwen-image` | ¥0.25/张 | ❌ | `content parameter's length invalid` |
| `qwen-image-max` | ¥0.5/张 | ❌ | `content parameter's length invalid` |
| `wan2.5-i2i-preview` | ¥0.2/张 | ✅* | 需使用异步 `image2image` 端点 |

> **结论**：`multimodal-generation` 端点仅 `qwen-image-2.0` 系列支持 3 图输入。其他 qwen-image 模型（plus/max/基础版）仅支持 1-2 图。`wan2.5-i2i-preview` 通过异步 `image2image` 端点支持多图。

---

## 七、对比总结

| 维度 | aitryon-plus | Qwen-Image-2.0 系列 | wan2.5-i2i-preview | 火山引擎换装 V2 |
|------|-------------|---------------------|-------------------|---------------|
| 上下装同时试穿 | ✅ 原生支持 | ✅ 多图输入（最多 3 张） | ✅ 多图融合 | ✅ 支持 |
| API 风格 | REST 异步 | REST **同步** | REST 异步 | REST 同步+异步 |
| 鉴权方式 | Bearer Token | Bearer Token | Bearer Token | AK/SK 签名 |
| 免费额度 | 400 张 | 100 张 | 50 张 | ❓ 未公开 |
| 单价 | ~¥0.5/张 | ¥0.2–0.5/张 | ¥0.2/张 | 未公开 |
| 面部一致性 | ⭐⭐⭐ 最佳 | ⭐⭐ 依赖 prompt | ⭐⭐⭐ 优秀 | ⭐⭐⭐ 专用模型 |
| Prompt 灵活性 | ❌ 纯图片 | ✅ 自然语言 | ✅ 自然语言 | ❌ 无 prompt |
| 响应速度 | ~30–90s | **~15s** | ~45s | 未测 |
| Base64 直传 | ❌ 需 OSS | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| 图片最小尺寸 | — | — | 384px | 300px |
| 成熟度 | 高 | 中高 | 中高（Preview） | 高 |

---

## 八、OOTD 项目已集成模型

通过环境变量 `TRYON_MODEL` 切换，集成在 `web/lib/tryon.ts`：

| 模型 | 环境变量值 | 价格 | 调用模式 | 速度 |
|------|-----------|------|---------|------|
| Qwen-Image-2.0 | `qwen-image-2.0`（**默认**） | ¥0.2/张 | 同步 multimodal-generation | ~15s |
| Qwen-Image-2.0-Pro | `qwen-image-2.0-pro` | ¥0.5/张 | 同步 multimodal-generation | ~20s |
| 万相 2.5 图编辑 | `wan2.5-i2i-preview` | ¥0.2/张 | 异步 image2image + 轮询 | ~45s |

模块自动根据模型名选择 API 路径（`ASYNC_MODELS` 集合），新增异步模型只需加入集合即可。

---

## 九、建议

### 日常使用首选：`qwen-image-2.0`

理由：
1. 同步接口，~15s 响应，用户体验最佳
2. ¥0.2/张，性价比最高
3. 已在生产稳定运行

### 高质量场景：`qwen-image-2.0-pro`

理由：
1. 质量更高，文字渲染和真实质感更强
2. 同步接口，体验一致
3. ¥0.5/张，适合重要场景

### 高保真替代：`wan2.5-i2i-preview`

理由：
1. 面部保持和衣服融合效果优秀
2. 与 qwen-image-2.0 同价（¥0.2/张）
3. 异步接口耗时较长（~45s），适合对质量更敏感的场景

### 备选：火山引擎 图片换装 V2

如果已有火山引擎账号，或需要同步调用模式，可优先评估。

---

*调研日期：2026-03-14*
*更新：2026-03-21 — 新增 wan2.5-i2i-preview 方案、qwen-image 系列兼容性测试、已集成模型清单*
