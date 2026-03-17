# 部署方案

**更新日期**：2026-03-17
**目标阶段**：MVP 试用（10-20 人内测）

---

## 一、方案选型

### 选型对比

| 维度 | 阿里云 ECS（选定） | Vercel | 自建服务器 |
|------|:---:|:---:|:---:|
| 国内访问速度 | ✅ 快 | ❌ 慢（海外 CDN） | ✅ 快 |
| DashScope 延迟 | ✅ 内网级别 | ⚠️ 海外绕行 | ✅ 取决于位置 |
| SQLite 支持 | ✅ 直接跑 | ❌ Serverless 无磁盘 | ✅ 直接跑 |
| 部署难度 | ⚠️ 中等 | ✅ git push 即部署 | ⚠️ 中等 |
| 运维成本 | ⚠️ 需自管 | ✅ 零运维 | ⚠️ 需自管 |
| 月费用 | ~60 元起 | 免费起 | 视配置而定 |
| HTTPS | 手动配置 | 自动 | 手动配置 |
| 适合阶段 | MVP → 正式 | 原型验证 | MVP → 正式 |

### 选定理由

1. **AI 服务全在阿里云**：DashScope（试穿/评分/识别/匹配）和 QWeather 都在国内，ECS 调用延迟最低
2. **SQLite 零迁移**：当前开发用的 SQLite + 本地文件存储方案可以直接上线，无需换数据库
3. **国内用户**：目标用户在国内，ECS 访问速度有保障
4. **成本可控**：试用阶段一台低配 ECS 即可，后续可平滑升级

---

## 二、服务器配置

### 推荐配置（MVP 试用阶段）

| 项目 | 配置 | 说明 |
|------|------|------|
| 机型 | 阿里云 ECS 共享型 | 试用阶段够用 |
| CPU / 内存 | 2 核 4G | Next.js build + 运行需要一定内存 |
| 系统盘 | 40G SSD | 系统 + 代码 + Node.js |
| 数据盘 | 20G SSD（可选） | 上传图片存储，后续可扩容 |
| 操作系统 | Ubuntu 22.04 LTS | 稳定，生态好 |
| 地域 | 杭州（推荐） | 与 DashScope 同区域，延迟最低 |
| 带宽 | 5Mbps（按量付费） | 图片传输需要一定带宽 |
| 预估月费 | ~60-100 元 | 共享型 + 按量带宽 |

### 后续升级路径

```
试用阶段（10-20人）          小规模（100-500人）         正式上线
2核4G ECS                   4核8G ECS                  集群 / K8s
SQLite                      SQLite → PostgreSQL         PostgreSQL + Redis
本地文件存储                  本地文件 → OSS              阿里云 OSS + CDN
单机 PM2                     单机 PM2                    多实例 + 负载均衡
```

---

## 三、技术架构

### 部署架构图

```
用户浏览器 (HTTPS)
    │
    ▼
Nginx (80/443)
    ├── 反向代理 → Next.js (localhost:3000)
    ├── 静态资源 → /public/uploads/ (图片直出)
    └── SSL 证书 (Let's Encrypt / 阿里云免费证书)

Next.js App (PM2 托管)
    ├── 前端 SSR + 静态页面
    ├── API Routes
    │     ├── /api/items         → Prisma → SQLite (dev.db)
    │     ├── /api/weather       → WeatherCache → QWeather API
    │     ├── /api/tryon         → DashScope (qwen-image-2.0-pro)
    │     ├── /api/recommendations/generate → DashScope (qwen-max + vl-max)
    │     └── /api/upload        → 本地文件系统
    └── SQLite 数据库 (dev.db)
```

### 软件栈

| 组件 | 版本 | 用途 |
|------|------|------|
| Node.js | 20 LTS | 运行时 |
| PM2 | latest | 进程管理、自动重启、日志 |
| Nginx | latest | 反向代理、HTTPS、静态资源 |
| SQLite | 内置 | 数据库（Prisma 7 + better-sqlite3） |
| Certbot | latest | Let's Encrypt 自动续签 SSL |
| Git | latest | 代码拉取和更新 |

---

## 四、部署步骤

### 4.1 服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt install -y nginx

# 安装 Certbot（SSL）
sudo apt install -y certbot python3-certbot-nginx

# 安装构建工具（better-sqlite3 编译需要）
sudo apt install -y build-essential python3
```

### 4.2 项目部署

```bash
# 克隆代码
cd /home
git clone https://github.com/yaoyichen/ootd.git
cd ootd/web

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入以下配置：
#   DASHSCOPE_API_KEY=xxx          # 阿里云百炼 API Key
#   QWEATHER_API_KEY=xxx           # 和风天气 API Key
#   QWEATHER_API_HOST=xxx          # 和风天气项目 Host

# 初始化数据库
npx prisma db push
npx prisma generate

# 创建上传目录
mkdir -p public/uploads/{items,persons,outfits}

# 构建生产版本
npm run build

# PM2 启动
pm2 start npm --name "ootd" -- start
pm2 save
pm2 startup  # 设置开机自启
```

### 4.3 Nginx 配置

```nginx
# /etc/nginx/sites-available/ootd
server {
    listen 80;
    server_name your-domain.com;  # 替换为实际域名或 IP

    # 图片资源直出（Nginx 直接提供静态文件，不经过 Node.js）
    location /uploads/ {
        alias /home/ootd/web/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Next.js 静态资源
    location /_next/static/ {
        alias /home/ootd/web/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 其余请求转发到 Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE 支持（推荐生成进度流）
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    # 限制上传文件大小（单品图片）
    client_max_body_size 20M;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/ootd /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.4 HTTPS 配置（有域名时）

```bash
# 申请 Let's Encrypt 免费证书
sudo certbot --nginx -d your-domain.com

# 自动续签（certbot 安装后已自动配置 cron）
sudo certbot renew --dry-run
```

> 如果暂时没有域名，可以先用 IP 直接访问（http://ECS公网IP），后续再绑定域名。

---

## 五、日常运维

### 代码更新

```bash
cd /home/ootd/web
git pull origin main
npm install              # 如有新依赖
npx prisma db push       # 如有 schema 变更
npx prisma generate      # 如有 schema 变更
npm run build
pm2 restart ootd
```

### 常用 PM2 命令

```bash
pm2 status               # 查看进程状态
pm2 logs ootd            # 查看实时日志
pm2 logs ootd --lines 100  # 查看最近 100 行日志
pm2 restart ootd         # 重启
pm2 stop ootd            # 停止
pm2 monit                # 实时监控面板
```

### 数据备份

```bash
# 备份数据库（建议每日 cron）
cp /home/ootd/web/dev.db /home/backups/ootd-$(date +%Y%m%d).db

# 备份上传图片
tar -czf /home/backups/uploads-$(date +%Y%m%d).tar.gz /home/ootd/web/public/uploads/
```

建议添加 crontab 自动备份：

```bash
# crontab -e
0 3 * * * cp /home/ootd/web/dev.db /home/backups/ootd-$(date +\%Y\%m\%d).db
0 4 * * 0 tar -czf /home/backups/uploads-$(date +\%Y\%m\%d).tar.gz /home/ootd/web/public/uploads/
```

### 磁盘空间监控

```bash
# 查看磁盘使用
df -h

# 查看上传图片占用
du -sh /home/ootd/web/public/uploads/

# 查看数据库大小
ls -lh /home/ootd/web/dev.db
```

---

## 六、注意事项

### 安全

- [ ] ECS 安全组仅开放 80（HTTP）、443（HTTPS）、22（SSH）端口
- [ ] SSH 使用密钥登录，禁用密码登录
- [ ] `.env.local` 文件权限设为 600，不提交到 Git
- [ ] 定期更新系统补丁：`sudo apt update && sudo apt upgrade`

### 性能

- [ ] Nginx 开启 gzip 压缩
- [ ] 图片资源设置 CDN 缓存头（已在 Nginx 配置中）
- [ ] PM2 cluster 模式可榨干多核性能：`pm2 start npm --name "ootd" -i 2 -- start`
- [ ] 天气数据已有数据库缓存（按小时+城市），无需额外优化

### 已知限制（试用阶段可接受）

- SQLite 不支持并发写入，高并发场景需迁移到 PostgreSQL
- 图片存本地磁盘，ECS 故障可能丢失（定期备份缓解）
- 无 CDN，图片加载速度取决于 ECS 带宽
- 单机部署，无高可用

---

## 七、成本估算

### 7.1 DashScope（阿里云百炼）官方定价

> 定价来源：[阿里云百炼模型价格](https://help.aliyun.com/zh/model-studio/model-pricing)（2025 年 1 月降价后）
> 建议部署前核实最新价格，阿里云降价频繁。

#### 文本/多模态模型（按 token 计费）

| 模型 | 用途 | 输入价格 | 输出价格 | 免费额度 |
|------|------|---------|---------|---------|
| qwen-max | 智能搭配推荐 | 0.02 元/千tokens | 0.06 元/千tokens | 100 万 tokens |
| qwen-vl-max | 穿搭评分 + 单品识别 | 0.003 元/千tokens | 0.003 元/千tokens | 100 万 tokens |

> qwen-vl-max 2024 年底降价 85%（0.02 → 0.003 元/千tokens），性价比极高。
> 按最新价格，1 元可处理约 600 张 720P 图片或 1700 张 480P 图片。

#### 图像生成/编辑模型（按张计费）

| 模型 | 用途 | 计费方式 | 免费额度 |
|------|------|---------|---------|
| qwen-image-2.0-pro | 虚拟试穿图生成 | 按成功生成的图片张数计费 | 新用户赠送图片生成额度 |
| qwen-image-edit | 单品自动抠图 | 按成功生成的图片张数计费 | 新用户赠送图片生成额度 |

> **图像模型单价说明**：官方定价页以动态表格展示，搜索引擎未完整收录具体数字。
> 官方文档示例使用 0.10 元/张作为参考。实际单价请查阅：
> https://help.aliyun.com/zh/model-studio/model-pricing

#### 新用户免费额度

| 额度类型 | 数量 | 说明 |
|---------|------|------|
| 文本模型 tokens | 每模型 100 万 tokens | 主账号与 RAM 子账号共享 |
| 图片生成额度 | 约 4500 张 | 覆盖所有图像生成/编辑模型 |

> **MVP 试用阶段（10-20 人）可能完全在免费额度内完成验证**，无需额外付费。

### 7.2 单次操作费用拆解

以下基于官方定价估算每次核心操作的 API 成本：

#### 每日推荐 pipeline（1 次完整流程）

| 步骤 | API 调用 | 估算说明 | 单次费用 |
|------|---------|---------|---------|
| LLM 匹配 5 组搭配 | qwen-max × 1 | 输入 ~2K tokens + 输出 ~500 tokens | ~0.07 元 |
| 虚拟试穿 × 5 张 | qwen-image-2.0-pro × 5 | 5 张效果图（有缓存时更少） | ~0.50 元 ※ |
| AI 评分 × 5 套 | qwen-vl-max × 5 | 每套输入图片 ~1K tokens + 输出 ~500 tokens | ~0.02 元 |
| **单次 pipeline 合计** | | | **~0.59 元** |

> ※ 图像模型按 0.10 元/张估算（官方示例价格），实际可能更低。
> 同一搭配组合有缓存机制，重复组合不调 API，实际调用量更少。

#### 单品上传（1 件衣物）

| 步骤 | API 调用 | 估算说明 | 单次费用 |
|------|---------|---------|---------|
| AI 抠图 | qwen-image-edit × 1 | 1 张抠图 | ~0.10 元 ※ |
| AI 识别分类 | qwen-vl-max × 1 | 输入图片 ~1K tokens + 输出 ~200 tokens | ~0.004 元 |
| **单件上传合计** | | | **~0.10 元** |

### 7.3 月度费用预估（10 人日活）

#### 假设

- 10 人每天各生成 1 次推荐（5 组试穿，假设 3 组命中缓存、2 组新生成）
- 每人每天上传 2 件新单品
- 每月 30 天

#### 月度 API 费用

| 操作 | 次/人/天 | 实际 API 调用/天 | 单价 | 月费用 |
|------|---------|----------------|------|--------|
| LLM 匹配 | 10 次 | qwen-max × 10 | ~0.07 元/次 | ~21 元 |
| 虚拟试穿 | 10 次 pipeline | qwen-image-2.0-pro × ~20（缓存后） | ~0.10 元/张 ※ | ~60 元 |
| AI 评分 | 50 套 | qwen-vl-max × 50 | ~0.004 元/次 | ~6 元 |
| 单品抠图 | 20 件 | qwen-image-edit × 20 | ~0.10 元/张 ※ | ~60 元 |
| 单品识别 | 20 件 | qwen-vl-max × 20 | ~0.004 元/次 | ~2.4 元 |
| **API 月合计** | | | | **~149 元** |

> ※ 图像模型按 0.10 元/张估算，实际单价请以官方定价页为准。
> 新用户免费额度（100 万 tokens + ~4500 张图片）可覆盖前 1-2 个月的试用期。

### 7.4 总成本汇总

| 项目 | 月费用 | 说明 |
|------|--------|------|
| ECS（2核4G） | ~60 元 | 共享型，包月 |
| 带宽（5Mbps 按量） | ~20-50 元 | 取决于图片传输量 |
| 域名（可选） | ~4 元 | .com 域名 ~50 元/年 |
| SSL 证书 | 免费 | Let's Encrypt |
| DashScope API | ~149 元 | 10 人日活估算（免费期内为 0） |
| QWeather API | 免费 | 免费版 1000 次/天，有小时级缓存 |
| **合计** | **~230-260 元/月** | 免费额度用完后 |
| **免费期内合计** | **~80-110 元/月** | 仅 ECS + 带宽 |

> **结论**：MVP 试用阶段月成本约 80-260 元，新用户免费额度期间仅需承担服务器费用。
>
> 定价参考来源：
> - [阿里云百炼模型价格](https://help.aliyun.com/zh/model-studio/model-pricing)
> - [通义千问视觉理解模型降价 85%](https://finance.sina.com.cn/tech/digi/2024-12-31/doc-inecitzz2090973.shtml)
> - [阿里云百炼新人免费额度](https://help.aliyun.com/zh/model-studio/new-free-quota)
