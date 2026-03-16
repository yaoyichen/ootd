# 天气 API 接入文档

**服务商**：和风天气（QWeather）
**官网**：https://dev.qweather.com
**接入日期**：2026-03-16

---

## 一、选型背景

PRD 中规划了「天气/场景联动」功能——根据用户所在城市的天气情况，在 LLM 智能匹配阶段传入天气上下文，让穿搭推荐更贴合实际。

对比了三个主流天气 API 后选定和风天气：

| 维度 | 和风天气 | 高德天气 | 心知天气 |
|------|---------|---------|---------|
| 免费额度 | 5 万次/月 | 3 万次/日 | 无限制（20 次/分） |
| 城市覆盖 | 中国 3000+ / 全球 20 万 | 中国城市 | 370 个主要城市 |
| 预报天数 | 3–30 天 | 4 天 | 3 天 |
| 穿衣指数 | 有 | 无 | 有（基础） |
| 城市搜索 | GeoAPI | 需下载编码表 | 支持拼音/中文 |

**选择理由**：穿衣指数对 OOTD 场景直接有用；GeoAPI 方便做城市下拉搜索；免费额度充足。

---

## 二、账号与凭据

### 注册流程

1. 访问 https://dev.qweather.com 注册账号
2. 进入控制台 →「项目管理」→ 创建项目
3. 在项目详情页获取：
   - **API Host**：形如 `xxx.re.qweatherapi.com`（每个项目独立分配）
   - **API Key**：32 位十六进制字符串

### 环境变量配置

在 `web/.env.local` 中添加：

```bash
QWEATHER_API_KEY=你的API-Key
QWEATHER_API_HOST=你的项目.re.qweatherapi.com
```

模板文件 `web/.env.example` 中已有占位说明。

> **注意**：新版 QWeather 为每个项目分配独立的 API Host，不再使用通用的 `devapi.qweather.com`。如果未配置 `QWEATHER_API_HOST`，代码会回退到 `devapi.qweather.com`。

---

## 三、使用的 API 接口

所有接口的 Base URL 均为 `https://{QWEATHER_API_HOST}`，认证方式为 Query Parameter `key={API_KEY}`。

### 3.1 实时天气

```
GET /v7/weather/now?location={locationId}&lang=zh&unit=m
```

返回当前气温、体感温度、天气状况、湿度、风向风力等。

关键字段：

| 字段 | 说明 |
|------|------|
| `now.temp` | 温度（°C） |
| `now.feelsLike` | 体感温度（°C） |
| `now.text` | 天气状况文字（晴/多云/小雨等） |
| `now.humidity` | 相对湿度（%） |
| `now.windDir` | 风向 |
| `now.windScale` | 风力等级 |

### 3.2 3 天天气预报

```
GET /v7/weather/3d?location={locationId}&lang=zh&unit=m
```

返回未来 3 天每日预报，包含最高/最低温度、白天/夜间天气。

关键字段：

| 字段 | 说明 |
|------|------|
| `daily[].fxDate` | 预报日期 |
| `daily[].tempMax` | 最高温度 |
| `daily[].tempMin` | 最低温度 |
| `daily[].textDay` | 白天天气 |
| `daily[].textNight` | 夜间天气 |

### 3.3 穿衣指数（生活指数）

```
GET /v7/indices/1d?location={locationId}&type=3&lang=zh
```

`type=3` 对应穿衣指数。返回穿衣建议级别和具体文案。

关键字段：

| 字段 | 说明 |
|------|------|
| `daily[0].category` | 级别（如「较冷」「舒适」「炎热」） |
| `daily[0].text` | 具体穿衣建议文案 |

### 3.4 城市搜索（GeoAPI）

```
GET /v2/city/lookup?location={关键词}&lang=zh
```

支持中文城市名、拼音搜索，返回匹配的城市列表及 LocationID。

---

## 四、代码结构

### 4.1 文件清单

| 文件 | 用途 |
|------|------|
| `web/lib/weather.ts` | 天气 API 封装库（核心逻辑） |
| `web/app/api/weather/route.ts` | Next.js API 路由，前端通过 `/api/weather` 调用 |
| `web/app/recommendations/page.tsx` | 推荐页天气卡片 UI（`WeatherCard` 组件） |
| `web/lib/qwen.ts` | LLM 搭配推荐（`suggestCombinations` 接受天气上下文） |
| `web/app/api/recommendations/generate/route.ts` | 推荐 pipeline（获取天气 → 传入 LLM） |
| `scripts/test-weather.mjs` | 独立调试脚本 |

### 4.2 核心函数（`web/lib/weather.ts`）

| 函数 | 说明 |
|------|------|
| `getWeatherNow(locationId)` | 获取实时天气 |
| `getForecast3d(locationId)` | 获取 3 天预报 |
| `getClothingIndex(locationId)` | 获取穿衣指数 |
| `getWeatherData(locationId)` | 并发获取以上三项，返回完整天气数据 |
| `toWeatherSummary(data)` | 将原始数据转为前端展示用的摘要格式 |
| `buildWeatherPromptContext(summary)` | 生成 LLM prompt 中的天气上下文段落 |
| `searchCity(keyword)` | 城市搜索（GeoAPI） |

### 4.3 预设城市列表

代码中内置了 12 个常用城市，默认杭州：

| 城市 | LocationID |
|------|-----------|
| 杭州 | 101210101 |
| 北京 | 101010100 |
| 上海 | 101020100 |
| 广州 | 101280101 |
| 深圳 | 101280601 |
| 南京 | 101190101 |
| 武汉 | 101200101 |
| 西安 | 101110101 |
| 成都 | 101270101 |
| 福州 | 101230101 |
| 长沙 | 101250101 |
| 重庆 | 101040100 |

---

## 五、数据流

```
用户打开推荐页
  │
  ├─→ 前端 GET /api/weather?locationId=101210101
  │     → web/lib/weather.ts 并发请求 3 个接口
  │     → 返回天气数据 + 摘要，前端渲染 WeatherCard
  │
  └─→ 用户点击「生成今日推荐」
        → POST /api/recommendations/generate { personImageId, locationId }
        │
        ├─ Step 0: 获取天气 → buildWeatherPromptContext() 生成天气文本
        ├─ Step 1: suggestCombinations(items, weatherContext) → LLM 匹配
        ├─ Step 2: 批量虚拟试穿
        ├─ Step 3: AI 评分
        └─ Step 4: 排序展示 Top 3
```

天气数据会作为额外上下文注入 LLM 匹配 prompt，让推荐结果适配当日气温和天气状况。如果天气获取失败，pipeline 会跳过天气上下文正常运行，不影响基础功能。

---

## 六、调试脚本

```bash
# 设置环境变量
export QWEATHER_API_KEY=你的Key
export QWEATHER_API_HOST=你的Host.re.qweatherapi.com

# 默认查询杭州
node scripts/test-weather.mjs

# 搜索城市再查询
node scripts/test-weather.mjs 北京

# 直接用 LocationID
node scripts/test-weather.mjs 101010100
```

脚本会并发请求实时天气、3 天预报、穿衣指数，格式化输出结果，并打印可传入 LLM 的结构化 JSON 摘要。

---

## 七、免费额度与注意事项

- **免费额度**：5 万次请求/月（天气 + GeoAPI 共享），超出后按 0.0007 元/次计费
- **缓存策略**：Next.js 服务端设置了 30 分钟缓存（`revalidate: 1800`），避免频繁请求
- **降级处理**：如果 `QWEATHER_API_KEY` 未配置，天气功能自动跳过，不影响其他功能
- **数据来源标注**：免费用户需在数据展示处注明来源为和风天气（参考 QWeather 服务条款）

---

## 八、后续扩展

- [ ] GPS 定位自动获取城市（需用户授权）
- [ ] 城市搜索下拉（当前为预设列表，可扩展为输入搜索）
- [ ] 场景选择（上班/约会/休闲/运动）作为 LLM 额外上下文
- [ ] 天气预警推送（暴雨/大风提醒带伞/穿防风外套）
