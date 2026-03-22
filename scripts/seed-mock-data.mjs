#!/usr/bin/env node

/**
 * seed-mock-data.mjs
 *
 * Generates 500+ mock users with wardrobe items, person images, outfits,
 * and showcase posts for local development / demo purposes.
 *
 * Usage (from repo root):
 *   node scripts/seed-mock-data.mjs            # seed (idempotent)
 *   node scripts/seed-mock-data.mjs --force     # delete existing mock data first
 */

import { PrismaClient } from "../web/prisma/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Prisma setup
// ---------------------------------------------------------------------------
const dbPath = path.join(process.cwd(), "web/dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const FORCE = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MOCK_EMAIL_DOMAIN = "@ootd.test";
const MOCK_EMAIL_PREFIX = "mock_";
const TOTAL_USERS = 520;
const ITEMS_PER_USER = { min: 5, max: 15 };
const PERSON_IMAGE_USERS = { min: 100, max: 200 };
const PERSON_IMAGES_PER_USER = { min: 1, max: 3 };
const OUTFITS_PER_USER = { min: 1, max: 5 };
const SHOWCASE_POSTS = { min: 200, max: 500 };

// Static bcrypt hash of "password123"
const PASSWORD_HASH =
  "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Kz0dLc4aLYmWnT/sRmrYi";

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------
const NAMES = [
  "林小溪", "陈诗琪", "王梓涵", "张雨桐", "刘思彤", "李悦然", "赵若曦",
  "黄嘉欣", "周雅琴", "吴沐瑶", "郑可馨", "孙语嫣", "杨舒怡", "朱韵婷",
  "许婉清", "何芷晴", "马星月", "冯梦瑶", "邓紫琳", "曹忆柔", "谢灵珊",
  "蒋如烟", "沈月华", "韩冰洁", "唐诗雅", "董清秋", "萧云裳", "程茉莉",
  "蔡欣妍", "潘雪儿", "方晓蝶", "苏暖阳", "任诗晴", "宋芊羽", "邱梓萌",
  "秦婉儿", "尹素素", "叶知秋", "吕佳音", "范如初", "钟灵秀", "贾玲珑",
  "田甜甜", "金美琪", "彭思媛", "魏若兮", "陆小凤", "姜一诺", "薛飞雪",
  "夏末末",
];

const TOP_NAMES = [
  "法式方领泡泡袖上衣", "简约圆领打底T恤", "复古V领针织衫", "宽松条纹长袖",
  "甜美蝴蝶结衬衫", "休闲印花卫衣", "气质翻领polo衫", "慵懒风薄款毛衣",
  "时尚解构设计感上衣", "学院风格纹衬衣", "温柔风蕾丝拼接上衣", "韩系短款露脐上衣",
  "基础款圆领打底衫", "蕾丝拼接七分袖上衣", "方领泡泡袖碎花上衣",
  "灯笼袖系带衬衫", "V领交叉针织背心", "小立领盘扣上衣",
  "复古灯芯绒衬衫", "日系清新格纹上衣",
];

const BOTTOM_NAMES = [
  "高腰直筒牛仔裤", "A字版型半身裙", "百搭西装阔腿裤", "复古格纹包臀裙",
  "休闲束脚工装裤", "气质鱼尾裙", "弹力修身打底裤", "甜美百褶短裙",
  "高腰垂感西裤", "法式碎花半裙", "简约针织长裙", "显瘦微喇叭裤",
  "高腰烟管裤", "学院风JK百褶裙", "弹力紧身牛仔裤",
  "工装风口袋半裙", "复古灯芯绒阔腿裤", "不规则荷叶边半裙",
  "休闲运动束脚裤", "高腰伞裙",
];

const COLORS = [
  "黑色", "白色", "米色", "灰色", "粉色", "蓝色", "绿色", "红色",
  "棕色", "杏色", "藏青", "卡其", "酒红", "雾霾蓝", "奶茶色", "烟灰紫",
];

const STYLES = [
  "法式", "韩系", "简约", "休闲", "学院", "复古", "甜美", "通勤", "街头", "文艺",
];

const SEASONS = ["春", "夏", "秋", "冬", "春秋", "四季"];

const OCCASIONS = [
  "日常", "通勤", "约会", "聚会", "旅行", "校园", "运动", "居家",
];

const MATERIALS = [
  "棉", "牛仔", "丝绸", "羊毛", "涤纶", "皮革", "亚麻", "针织", "雪纺", "灯芯绒",
];

const FITS = ["修身", "宽松", "常规", "oversize"];

const PATTERNS = ["纯色", "条纹", "格纹", "印花", "碎花"];

const THICKNESSES = ["薄", "适中", "厚"];

const CAPTIONS = [
  "今日份穿搭分享 ✨", "这套真的太绝了!", "通勤ootd打卡~",
  "被路人夸了三次的一套", "氛围感穿搭", "温柔系look", "一整个拿捏住",
  "周末出游穿搭", "约会战袍来了", "初秋叠穿灵感", "显瘦穿搭密码",
  "这件毛衣谁穿谁好看", "极简主义穿搭", "法式慵懒风", "学院风回归",
  "上班族的小心机", "小个子友好穿搭", "梨形身材首选", "一衣多穿挑战",
  "衣橱断舍离后的搭配", "今天是甜妹风🍬", "上课也要美美的~",
  "雨天也要精致出门 🌧️", "简约不简单", "这个颜色太显白了!",
  "闺蜜说我今天好看", "早秋第一套叠穿", "复古回潮穿搭",
  "通勤也可以很时髦", "懒人一套搞定", "高级感配色参考", "假装在巴黎~",
  "每日穿搭打卡 Day1", "穿上就不想脱下来", "显高穿搭分享",
  "内搭选对了整套升级", "周五的小放纵穿搭", "这套绝了配色太高级",
  "秋冬大衣怎么搭", "毛衣+半裙=王炸组合", "新入的裤子太好穿了",
  "被同事追问链接的一套", "逛街穿搭攻略", "下午茶look☕",
  "文艺少女穿搭日记", "一周不重样穿搭", "出门5分钟搭配法",
  "职场新人穿搭模板", "相亲必胜穿搭hh", "不费脑的万能搭配公式",
  "天冷也要穿裙子!", "开学季穿搭灵感", "春日踏青穿搭🌸",
  "显腿长的秘密在这里", "拍照超上镜的一套", "ins风穿搭分享",
  "日杂风穿搭合集", "优衣库穿出高级感", "基础款也能穿出花",
  "沉浸式换装vlog", "这套回头率超高!", "素颜也能撑住的穿搭",
];

const EVALUATION_TEMPLATES = [
  '<b>色彩搭配</b>和谐统一，整体呈现出优雅的<b>法式风情</b>。上衣的剪裁凸显身材线条，下装的版型恰到好处地平衡了比例。建议可以<b>加一条精致项链</b>作为点睛之笔。',
  '<b>简约大气</b>的配色方案，黑白灰的经典组合永不过时。整体造型<b>干练利落</b>，非常适合通勤场景。可以考虑<b>增加一个亮色包包</b>来提升层次感。',
  '这套搭配<b>色调统一</b>，暖色系的运用让整体看起来温柔又亲切。面料的垂坠感增添了<b>高级质感</b>。建议<b>搭配一双尖头鞋</b>来拉长腿部线条。',
  '<b>撞色搭配</b>大胆又和谐，展现了很好的时尚敏感度。上下装的比例划分合理，<b>显高显瘦</b>效果明显。可以尝试<b>加一顶贝雷帽</b>增加趣味性。',
  '整体风格<b>甜美清新</b>，色彩搭配活泼不失优雅。裙装的长度恰到好处，既展现了<b>青春活力</b>又保持了得体感。建议<b>选择一款小巧耳饰</b>来点缀。',
  '<b>层次分明</b>的叠穿技巧值得称赞。内搭与外搭的材质对比增加了<b>视觉丰富度</b>。整体配色沉稳大气，适合各种场合。建议<b>系一条丝巾</b>提升精致感。',
  '这套穿搭<b>复古韵味</b>十足，面料的选择和剪裁都很考究。配色上采用了<b>莫兰迪色系</b>，低饱和度的色调显得格外高级。可以<b>搭配一双玛丽珍鞋</b>完善复古造型。',
  '<b>运动休闲风</b>与时尚元素的巧妙融合，舒适度与美观兼顾。宽松的版型通过<b>腰线调节</b>避免了臃肿感。建议<b>配一顶棒球帽</b>来强化街头感。',
  '整体造型<b>知性优雅</b>，面料质感出众。上衣的领口设计<b>修饰脸型</b>效果很好，下装的A字版型<b>包容性强</b>。建议<b>选择一款简约手表</b>增添品味。',
  '<b>色彩过渡自然</b>，从上到下形成了舒适的视觉流动。整体风格偏<b>文艺清新</b>，适合周末出游或下午茶场景。可以<b>背一个草编包</b>来呼应整体氛围。',
  '这套搭配的<b>亮点在于细节</b>——袖口设计、扣子选择都很用心。整体呈现出<b>都市精英</b>的干练形象。建议<b>增加一副墨镜</b>提升气场。',
  '<b>甜酷风格</b>的完美示范，柔美元素与帅气单品的碰撞产生了化学反应。配色上<b>黑粉搭配</b>经典又时髦。建议<b>选择一双厚底鞋</b>来强化风格。',
  '整体<b>配色素雅</b>，给人一种岁月静好的感觉。面料的透气性和版型的舒适度都很<b>适合日常</b>。建议<b>点缀一枚胸针</b>增加辨识度。',
  '<b>对比感</b>是这套搭配的核心——修身上衣搭配宽松下装，张弛有度。整体风格<b>潇洒随性</b>又不失精致。建议<b>卷起裤脚</b>露出脚踝来增添轻盈感。',
  '这套穿搭<b>季节感十足</b>，面料和色彩都恰好呼应了当下时令。<b>比例划分</b>很到位，显得身材修长。建议<b>选一款链条包</b>提升整体精致度。',
];

const PERSON_IMAGE_NAMES = [
  "日常自拍", "全身照", "半身照", "证件照风格", "户外写真",
  "镜面自拍", "咖啡厅抓拍", "通勤随拍", "周末休闲照", "旅行纪念照",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function cuid() {
  // Lightweight cuid-ish ID generator (good enough for seeding)
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(8).toString("hex");
  return `c${ts}${rand}`;
}

/** Normal-ish distribution via Box-Muller, clamped to [lo, hi]. */
function normalRandom(mean, stddev, lo, hi) {
  let u, v, s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt((-2 * Math.log(s)) / s);
  const val = mean + stddev * u * mul;
  return Math.round(Math.max(lo, Math.min(hi, val)));
}

function generateScoreDims() {
  return JSON.stringify({
    colorHarmony: randInt(55, 95),
    styleCohesion: randInt(55, 95),
    trendiness: randInt(55, 95),
    practicality: randInt(55, 95),
    creativity: randInt(55, 95),
  });
}

function generateEvaluation() {
  return pick(EVALUATION_TEMPLATES);
}

// ---------------------------------------------------------------------------
// Asset handling
// ---------------------------------------------------------------------------
const SEED_ASSETS_DIR = path.join(process.cwd(), "scripts/seed-assets");
const UPLOAD_DIR = path.join(process.cwd(), "web/public/uploads");

const ASSET_CATEGORIES = ["tops", "bottoms", "persons", "results"];

/**
 * Ensure seed-assets directories exist. Copy images to web/public/uploads/.
 * Returns { tops: [...paths], bottoms: [...], persons: [...], results: [...] }
 * where paths are relative to web/public (e.g. "/uploads/items/seed-xxx.jpg").
 */
function prepareAssets() {
  const assets = { tops: [], bottoms: [], persons: [], results: [] };
  let hasAnyImages = false;

  // Ensure upload target dirs exist
  for (const dir of ["items", "persons", "outfits"]) {
    fs.mkdirSync(path.join(UPLOAD_DIR, dir), { recursive: true });
  }

  // Ensure seed-assets dirs exist
  for (const cat of ASSET_CATEGORIES) {
    const srcDir = path.join(SEED_ASSETS_DIR, cat);
    fs.mkdirSync(srcDir, { recursive: true });
  }

  // Copy images from seed-assets to uploads
  const mapping = {
    tops: "items",
    bottoms: "items",
    persons: "persons",
    results: "outfits",
  };

  for (const cat of ASSET_CATEGORIES) {
    const srcDir = path.join(SEED_ASSETS_DIR, cat);
    const destSubdir = mapping[cat];
    const files = fs.readdirSync(srcDir).filter((f) =>
      /\.(jpe?g|png|webp)$/i.test(f)
    );

    for (const file of files) {
      hasAnyImages = true;
      const destName = `seed-${cat}-${file}`;
      const destPath = path.join(UPLOAD_DIR, destSubdir, destName);
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(path.join(srcDir, file), destPath);
      }
      assets[cat].push(`/uploads/${destSubdir}/${destName}`);
    }
  }

  if (!hasAnyImages) {
    console.log("\n⚠️  No images found in scripts/seed-assets/.");
    console.log("   The script will use placeholder image paths.");
    console.log("   To use real images, place them in:\n");
    for (const cat of ASSET_CATEGORIES) {
      console.log(`     scripts/seed-assets/${cat}/`);
    }
    console.log("\n   Then re-run the script.\n");

    // Generate placeholder paths
    for (let i = 1; i <= 20; i++) {
      assets.tops.push(`/uploads/items/seed-placeholder-top-${i}.jpg`);
      assets.bottoms.push(`/uploads/items/seed-placeholder-bottom-${i}.jpg`);
    }
    for (let i = 1; i <= 10; i++) {
      assets.persons.push(`/uploads/persons/seed-placeholder-person-${i}.jpg`);
      assets.results.push(`/uploads/outfits/seed-placeholder-result-${i}.jpg`);
    }
  }

  return assets;
}

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 OOTD Mock Data Seeder");
  console.log("========================\n");

  // 1. Idempotency check
  const existingMockUser = await prisma.user.findFirst({
    where: { email: { startsWith: MOCK_EMAIL_PREFIX, endsWith: MOCK_EMAIL_DOMAIN } },
  });

  if (existingMockUser && !FORCE) {
    console.log("✅ Mock data already exists. Use --force to re-seed.");
    await prisma.$disconnect();
    return;
  }

  if (existingMockUser && FORCE) {
    console.log("🗑️  --force flag detected. Deleting existing mock data...");
    // Delete in dependency order: ShowcasePost → Outfit → Item, PersonImage → User
    const mockUsers = await prisma.user.findMany({
      where: { email: { endsWith: MOCK_EMAIL_DOMAIN } },
      select: { id: true },
    });
    const mockUserIds = mockUsers.map((u) => u.id);

    if (mockUserIds.length > 0) {
      // Batch delete in chunks to avoid SQLite limits
      const chunkSize = 100;
      for (let i = 0; i < mockUserIds.length; i += chunkSize) {
        const chunk = mockUserIds.slice(i, i + chunkSize);
        await prisma.showcasePost.deleteMany({ where: { userId: { in: chunk } } });
        await prisma.outfit.deleteMany({ where: { userId: { in: chunk } } });
        await prisma.item.deleteMany({ where: { userId: { in: chunk } } });
        await prisma.personImage.deleteMany({ where: { userId: { in: chunk } } });
        await prisma.dailyRecommendation.deleteMany({ where: { userId: { in: chunk } } });
        await prisma.user.deleteMany({ where: { id: { in: chunk } } });
      }
    }

    console.log(`   Deleted ${mockUserIds.length} mock users and related data.\n`);
  }

  // 2. Copy assets
  console.log("📂 Preparing assets...");
  const assets = prepareAssets();
  console.log(
    `   Tops: ${assets.tops.length}, Bottoms: ${assets.bottoms.length}, ` +
    `Persons: ${assets.persons.length}, Results: ${assets.results.length}\n`
  );

  // 3. Create users
  console.log(`👤 Creating ${TOTAL_USERS} mock users...`);
  const userRecords = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    const name = NAMES[i % NAMES.length];
    // Append a suffix for uniqueness when we cycle through names
    const suffix = i >= NAMES.length ? `${Math.floor(i / NAMES.length) + 1}` : "";
    const nickname = `${name}${suffix}`;
    userRecords.push({
      id: cuid(),
      email: `${MOCK_EMAIL_PREFIX}${i}${MOCK_EMAIL_DOMAIN}`,
      passwordHash: PASSWORD_HASH,
      nickname,
      avatarPath: null,
    });
  }

  // createMany in batches
  const USER_BATCH = 200;
  for (let i = 0; i < userRecords.length; i += USER_BATCH) {
    await prisma.user.createMany({
      data: userRecords.slice(i, i + USER_BATCH),
    });
  }
  console.log(`   ✅ Created ${userRecords.length} users.\n`);

  // 4. Assign wardrobe items
  console.log("👕 Creating wardrobe items...");
  let totalItems = 0;
  const userItems = new Map(); // userId -> { tops: [itemId...], bottoms: [itemId...] }

  const itemBatch = [];
  for (const user of userRecords) {
    const itemCount = randInt(ITEMS_PER_USER.min, ITEMS_PER_USER.max);
    const topCount = Math.max(1, Math.floor(itemCount * 0.5));
    const bottomCount = itemCount - topCount;
    const userTops = [];
    const userBottoms = [];

    for (let j = 0; j < topCount; j++) {
      const id = cuid();
      userTops.push(id);
      itemBatch.push({
        id,
        userId: user.id,
        name: pick(TOP_NAMES),
        category: "TOP",
        subcategory: null,
        color: pick(COLORS),
        style: pick(STYLES),
        season: pick(SEASONS),
        occasion: pick(OCCASIONS),
        material: pick(MATERIALS),
        fit: pick(FITS),
        pattern: pick(PATTERNS),
        thickness: pick(THICKNESSES),
        description: null,
        imagePath: pick(assets.tops),
        originalImagePath: null,
        imageHash: null,
      });
    }

    for (let j = 0; j < bottomCount; j++) {
      const id = cuid();
      userBottoms.push(id);
      itemBatch.push({
        id,
        userId: user.id,
        name: pick(BOTTOM_NAMES),
        category: "BOTTOM",
        subcategory: null,
        color: pick(COLORS),
        style: pick(STYLES),
        season: pick(SEASONS),
        occasion: pick(OCCASIONS),
        material: pick(MATERIALS),
        fit: pick(FITS),
        pattern: pick(PATTERNS),
        thickness: pick(THICKNESSES),
        description: null,
        imagePath: pick(assets.bottoms),
        originalImagePath: null,
        imageHash: null,
      });
    }

    userItems.set(user.id, { tops: userTops, bottoms: userBottoms });
  }

  // Batch insert items
  const ITEM_BATCH_SIZE = 500;
  for (let i = 0; i < itemBatch.length; i += ITEM_BATCH_SIZE) {
    await prisma.item.createMany({
      data: itemBatch.slice(i, i + ITEM_BATCH_SIZE),
    });
    totalItems += Math.min(ITEM_BATCH_SIZE, itemBatch.length - i);
    if (totalItems % 1000 === 0 || i + ITEM_BATCH_SIZE >= itemBatch.length) {
      process.stdout.write(`\r   📦 ${totalItems} items created...`);
    }
  }
  console.log(`\n   ✅ Created ${totalItems} items total.\n`);

  // 5. Assign person images to a subset of users
  const personImageUserCount = randInt(
    PERSON_IMAGE_USERS.min,
    PERSON_IMAGE_USERS.max
  );
  const usersWithPersons = pickN(userRecords, personImageUserCount);
  console.log(`🧑 Assigning person images to ${usersWithPersons.length} users...`);

  const personImageBatch = [];
  const userPersonImages = new Map(); // userId -> [personImageId]

  for (const user of usersWithPersons) {
    const count = randInt(
      PERSON_IMAGES_PER_USER.min,
      PERSON_IMAGES_PER_USER.max
    );
    const pIds = [];
    for (let j = 0; j < count; j++) {
      const id = cuid();
      pIds.push(id);
      personImageBatch.push({
        id,
        userId: user.id,
        name: pick(PERSON_IMAGE_NAMES),
        imagePath: pick(assets.persons),
        enhancedImagePath: null,
        description: null,
        isDefault: j === 0,
      });
    }
    userPersonImages.set(user.id, pIds);
  }

  const PERSON_BATCH_SIZE = 500;
  for (let i = 0; i < personImageBatch.length; i += PERSON_BATCH_SIZE) {
    await prisma.personImage.createMany({
      data: personImageBatch.slice(i, i + PERSON_BATCH_SIZE),
    });
  }
  console.log(`   ✅ Created ${personImageBatch.length} person images.\n`);

  // 6. Create outfits for users who have person images + tops + bottoms
  console.log("👗 Creating outfits...");
  const outfitBatch = [];
  const outfitUniquenessSet = new Set();
  const usersWithOutfits = []; // track for showcase selection

  for (const user of usersWithPersons) {
    const personIds = userPersonImages.get(user.id);
    const items = userItems.get(user.id);
    if (!personIds || !items || items.tops.length === 0 || items.bottoms.length === 0) {
      continue;
    }

    const outfitCount = randInt(OUTFITS_PER_USER.min, OUTFITS_PER_USER.max);
    for (let j = 0; j < outfitCount; j++) {
      const personImageId = pick(personIds);
      const topItemId = pick(items.tops);
      const bottomItemId = pick(items.bottoms);

      // Enforce unique constraint
      const key = `${personImageId}|${topItemId}|${bottomItemId}`;
      if (outfitUniquenessSet.has(key)) continue;
      outfitUniquenessSet.add(key);

      const score = normalRandom(78, 8, 60, 95);
      const id = cuid();

      outfitBatch.push({
        id,
        userId: user.id,
        personImageId,
        topItemId,
        bottomItemId,
        resultImagePath:
          assets.results.length > 0
            ? pick(assets.results)
            : pick(assets.persons), // fallback to person image
        isFavorite: Math.random() < 0.15,
        score,
        scoreDims: generateScoreDims(),
        evaluation: generateEvaluation(),
        scoredAt: new Date(
          Date.now() - randInt(0, 30 * 24 * 60 * 60 * 1000)
        ),
      });

      usersWithOutfits.push({ userId: user.id, outfitId: id });
    }
  }

  const OUTFIT_BATCH_SIZE = 200;
  for (let i = 0; i < outfitBatch.length; i += OUTFIT_BATCH_SIZE) {
    await prisma.outfit.createMany({
      data: outfitBatch.slice(i, i + OUTFIT_BATCH_SIZE),
    });
    if ((i + OUTFIT_BATCH_SIZE) % 500 < OUTFIT_BATCH_SIZE || i + OUTFIT_BATCH_SIZE >= outfitBatch.length) {
      process.stdout.write(`\r   👗 ${Math.min(i + OUTFIT_BATCH_SIZE, outfitBatch.length)} outfits created...`);
    }
  }
  console.log(`\n   ✅ Created ${outfitBatch.length} outfits.\n`);

  // 7. Publish to showcase
  const showcaseCount = randInt(SHOWCASE_POSTS.min, SHOWCASE_POSTS.max);
  const actualShowcaseCount = Math.min(showcaseCount, usersWithOutfits.length);
  console.log(`📸 Publishing ${actualShowcaseCount} showcase posts...`);

  const selectedForShowcase = pickN(usersWithOutfits, actualShowcaseCount);
  const showcaseBatch = [];

  for (const entry of selectedForShowcase) {
    showcaseBatch.push({
      id: cuid(),
      userId: entry.userId,
      outfitId: entry.outfitId,
      caption: pick(CAPTIONS),
      likes: randInt(0, 200),
      tryonCount: randInt(0, 50),
      isPublic: true,
      realPhotoPath: null,
    });
  }

  const SHOWCASE_BATCH_SIZE = 200;
  for (let i = 0; i < showcaseBatch.length; i += SHOWCASE_BATCH_SIZE) {
    await prisma.showcasePost.createMany({
      data: showcaseBatch.slice(i, i + SHOWCASE_BATCH_SIZE),
    });
  }
  console.log(`   ✅ Created ${showcaseBatch.length} showcase posts.\n`);

  // Summary
  console.log("========================");
  console.log("🎉 Seeding complete!\n");
  console.log(`   Users:          ${userRecords.length}`);
  console.log(`   Items:          ${totalItems}`);
  console.log(`   Person Images:  ${personImageBatch.length}`);
  console.log(`   Outfits:        ${outfitBatch.length}`);
  console.log(`   Showcase Posts: ${showcaseBatch.length}`);
  console.log();

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ Seed failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
