/**
 * 淘宝商品导入 — API 抽象层
 *
 * 使用订单侠 API 解析淘口令、获取商品详情。
 * 环境变量：TAOBAO_API_KEY（订单侠 apikey）
 */

const API_BASE = "https://api.tbk.dingdanxia.com";

function getApiKey(): string {
  const key = process.env.TAOBAO_API_KEY ?? "";
  if (!key) throw new Error("TAOBAO_API_KEY not configured");
  return key;
}

// --------------- 输入解析 ---------------

export type TaobaoInputType = "tkl" | "short_url" | "item_url" | "unknown";

export interface ParsedInput {
  type: TaobaoInputType;
  value: string; // tkl 内容 / URL / 商品 ID
}

const TKL_REGEX = /[￥$]([a-zA-Z0-9]+)[￥$]/;
const TB_SHORT_REGEX = /https?:\/\/(m\.tb\.cn|s\.click\.taobao\.com)\/\S+/;
const TB_ITEM_REGEX = /https?:\/\/.*?(taobao|tmall)\.com\/.*?[?&]id=(\d+)/;

export function parseTaobaoInput(raw: string): ParsedInput {
  const tklMatch = raw.match(TKL_REGEX);
  if (tklMatch) return { type: "tkl", value: tklMatch[0] };

  const shortMatch = raw.match(TB_SHORT_REGEX);
  if (shortMatch) return { type: "short_url", value: shortMatch[0] };

  const itemMatch = raw.match(TB_ITEM_REGEX);
  if (itemMatch) return { type: "item_url", value: itemMatch[2] };

  return { type: "unknown", value: raw.trim() };
}

// --------------- 淘口令解析 ---------------

interface TklResponse {
  code: number;
  data?: {
    item_id?: string;
    url?: string;
    // other fields omitted
  };
  msg?: string;
}

/**
 * 解析淘口令或短链接，返回商品 ID
 */
export async function resolveTkl(tkl: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/tkl/query?apikey=${encodeURIComponent(getApiKey())}&tkl=${encodeURIComponent(tkl)}`,
  );
  const data: TklResponse = await res.json();

  if (data.code !== 200 || !data.data?.item_id) {
    // Try extracting item_id from the resolved URL
    const url = data.data?.url ?? "";
    const idMatch = url.match(/[?&]id=(\d+)/);
    if (idMatch) return idMatch[1];
    throw new Error(data.msg || "淘口令解析失败");
  }

  return data.data.item_id;
}

// --------------- 商品详情 ---------------

export interface ProductImage {
  url: string;
  position?: number;
}

export interface ProductDetail {
  title: string;
  price: string;
  mainImages: ProductImage[];
  skuImages: ProductImage[];
}

interface DetailResponse {
  code: number;
  data?: {
    title?: string;
    price?: string;
    sale_price?: string;
    small_images?: string[];
    item_imgs?: Array<{ url: string; position?: number }>;
    prop_imgs?: Array<{ url: string; properties?: string }>;
    // other fields omitted
  };
  msg?: string;
}

export async function fetchProductDetail(
  itemId: string,
): Promise<ProductDetail> {
  const res = await fetch(
    `${API_BASE}/item/detail?apikey=${encodeURIComponent(getApiKey())}&item_id=${encodeURIComponent(itemId)}`,
  );
  const data: DetailResponse = await res.json();

  if (data.code !== 200 || !data.data) {
    throw new Error(data.msg || "获取商品详情失败");
  }

  const d = data.data;

  // Build main image list from item_imgs or small_images
  let mainImages: ProductImage[] = [];
  if (d.item_imgs && d.item_imgs.length > 0) {
    mainImages = d.item_imgs.map((img, i) => ({
      url: normalizeImageUrl(img.url),
      position: img.position ?? i,
    }));
  } else if (d.small_images && d.small_images.length > 0) {
    mainImages = d.small_images.map((url, i) => ({
      url: normalizeImageUrl(url),
      position: i,
    }));
  }

  const skuImages: ProductImage[] = (d.prop_imgs ?? []).map((img) => ({
    url: normalizeImageUrl(img.url),
  }));

  return {
    title: d.title ?? "",
    price: d.sale_price ?? d.price ?? "",
    mainImages,
    skuImages,
  };
}

/** 确保图片 URL 以 https:// 开头 */
function normalizeImageUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (!url.startsWith("http")) return `https://${url}`;
  return url;
}

// --------------- 图片选择 ---------------

export interface SelectedImage {
  url: string;
  source: "white_bg" | "sku" | "main" | "fallback";
}

export function selectBestImage(product: ProductDetail): SelectedImage {
  const { mainImages, skuImages } = product;

  // 优先级 1：第 5 张主图（白底图）
  if (mainImages.length >= 5) {
    return { url: mainImages[4].url, source: "white_bg" };
  }

  // 优先级 2：SKU 属性图
  if (skuImages.length > 0) {
    return { url: skuImages[0].url, source: "sku" };
  }

  // 优先级 3 / 兜底：主图第 1 张
  if (mainImages.length > 0) {
    return { url: mainImages[0].url, source: "main" };
  }

  return { url: "", source: "fallback" };
}

// --------------- 图片下载 ---------------

/**
 * 下载商品图片，返回 base64 data URL。
 * 设置 Referer 头以绕过淘宝 CDN 限制。
 */
export async function downloadProductImage(
  imageUrl: string,
): Promise<string> {
  if (!imageUrl) throw new Error("图片 URL 为空");

  const res = await fetch(imageUrl, {
    headers: {
      Referer: "https://www.taobao.com/",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    },
  });

  if (!res.ok) {
    throw new Error(`图片下载失败: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}
