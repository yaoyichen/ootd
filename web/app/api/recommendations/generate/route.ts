import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestCombinations, scoreOutfit } from "@/lib/qwen";
import { generateTryon } from "@/lib/tryon";
import { getWeatherData, toWeatherSummary, buildWeatherPromptContext, DEFAULT_CITY_ID } from "@/lib/weather";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personImageId, locationId } = body;

    if (!personImageId) {
      return new Response(JSON.stringify({ error: "personImageId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const person = await prisma.personImage.findUnique({
      where: { id: personImageId },
    });
    if (!person) {
      return new Response(JSON.stringify({ error: "人像不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const items = await prisma.item.findMany();
    const tops = items.filter(
      (i) => i.category === "TOP" || i.category === "OUTERWEAR"
    );
    const bottoms = items.filter(
      (i) => i.category === "BOTTOM" || i.category === "ONEPIECE"
    );

    if (tops.length === 0 || bottoms.length === 0) {
      return new Response(
        JSON.stringify({ error: "衣橱中上衣或下装不足，无法生成推荐" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(new TextEncoder().encode(sseEvent(event, data)));
        };

        try {
          // Step 0: Fetch weather context (non-blocking — skip on failure)
          let weatherContext: string | undefined;
          if (locationId && process.env.QWEATHER_API_KEY) {
            try {
              send("progress", { step: "weather", message: "正在获取天气信息..." });
              const weatherData = await getWeatherData(locationId || DEFAULT_CITY_ID);
              const summary = toWeatherSummary(weatherData);
              weatherContext = buildWeatherPromptContext(summary);
              send("progress", {
                step: "weather_done",
                message: `${summary.city} ${summary.weather} ${summary.temp}`,
                weather: summary,
              });
            } catch (err) {
              console.error("Weather fetch failed, proceeding without:", err);
            }
          }

          // Step 1: LLM suggests combinations
          send("progress", { step: "matching", message: "正在智能匹配单品组合..." });

          const combinations = await suggestCombinations(
            items.map((i) => ({
              id: i.id,
              name: i.name,
              category: i.category,
              color: i.color,
              style: i.style,
              season: i.season,
              occasion: i.occasion,
            })),
            weatherContext
          );

          if (combinations.length === 0) {
            send("error", { message: "未能生成有效的搭配组合" });
            controller.close();
            return;
          }

          send("progress", {
            step: "matched",
            message: `已匹配 ${combinations.length} 组搭配`,
            count: combinations.length,
          });

          // Step 2: Generate tryon images
          const outfitResults: {
            outfitId: string;
            imagePath: string;
            reason: string;
            topItemId: string;
            bottomItemId: string;
            cached: boolean;
          }[] = [];

          for (let i = 0; i < combinations.length; i++) {
            const combo = combinations[i];
            send("progress", {
              step: "generating",
              message: `生成穿搭效果 ${i + 1}/${combinations.length}...`,
              current: i + 1,
              total: combinations.length,
            });

            const topItem = items.find((it) => it.id === combo.topItemId);
            const bottomItem = items.find((it) => it.id === combo.bottomItemId);

            if (!topItem || !bottomItem) continue;

            if (i > 0) await sleep(2000);

            try {
              const result = await generateTryon({
                personImagePath: person.imagePath,
                topImagePath: topItem.imagePath,
                bottomImagePath: bottomItem.imagePath,
                personImageId: person.id,
                topItemId: topItem.id,
                bottomItemId: bottomItem.id,
              });

              outfitResults.push({
                outfitId: result.outfitId,
                imagePath: result.imagePath,
                reason: combo.reason,
                topItemId: combo.topItemId,
                bottomItemId: combo.bottomItemId,
                cached: result.cached,
              });

              send("progress", {
                step: "generated",
                message: `穿搭 ${i + 1} 已生成${result.cached ? "（缓存）" : ""}`,
                current: i + 1,
                total: combinations.length,
                outfitId: result.outfitId,
                imagePath: result.imagePath,
              });
            } catch (err) {
              console.error(`Tryon generation failed for combo ${i + 1}:`, err);
              send("progress", {
                step: "generate_failed",
                message: `穿搭 ${i + 1} 生成失败，跳过`,
                current: i + 1,
              });
            }
          }

          if (outfitResults.length === 0) {
            send("error", { message: "所有穿搭生成均失败" });
            controller.close();
            return;
          }

          // Step 3: Score each outfit
          send("progress", {
            step: "scoring",
            message: `正在 AI 评分（共 ${outfitResults.length} 套）...`,
          });

          const scored: (typeof outfitResults[number] & {
            score: number;
            scoreDims: string | null;
            evaluation: string;
          })[] = [];

          for (let i = 0; i < outfitResults.length; i++) {
            const outfit = outfitResults[i];
            if (i > 0) await sleep(1500);
            try {
              const result = await scoreOutfit(outfit.imagePath);
              const dimsJson = JSON.stringify(result.dims);

              await prisma.outfit.update({
                where: { id: outfit.outfitId },
                data: {
                  score: result.score,
                  scoreDims: dimsJson,
                  evaluation: result.evaluation,
                  scoredAt: new Date(),
                },
              });

              scored.push({ ...outfit, score: result.score, scoreDims: dimsJson, evaluation: result.evaluation });

              send("progress", {
                step: "scored",
                message: `穿搭 ${i + 1} 评分完成：${result.score} 分`,
                current: i + 1,
                total: outfitResults.length,
                outfitId: outfit.outfitId,
                score: result.score,
              });
            } catch (err) {
              console.error(`Scoring failed for outfit ${outfit.outfitId}:`, err);
              scored.push({ ...outfit, score: 70, scoreDims: null, evaluation: "评分暂不可用" });
            }
          }

          // Step 4: Sort by score, take top 3, save as DailyRecommendation
          scored.sort((a, b) => b.score - a.score);
          const top3 = scored.slice(0, 3);
          const date = todayStr();

          await prisma.dailyRecommendation.deleteMany({ where: { date } });

          for (let i = 0; i < top3.length; i++) {
            await prisma.dailyRecommendation.create({
              data: {
                date,
                rank: i + 1,
                outfitId: top3[i].outfitId,
                reason: top3[i].reason,
              },
            });
          }

          // Build full response with item details
          const recommendations = await Promise.all(
            top3.map(async (r, idx) => {
              const topItem = items.find((i) => i.id === r.topItemId);
              const bottomItem = items.find((i) => i.id === r.bottomItemId);
              return {
                rank: idx + 1,
                outfitId: r.outfitId,
                imagePath: r.imagePath,
                score: r.score,
                scoreDims: r.scoreDims ? JSON.parse(r.scoreDims) : null,
                evaluation: r.evaluation,
                reason: r.reason,
                topItem: topItem
                  ? { id: topItem.id, name: topItem.name, imagePath: topItem.imagePath, category: topItem.category }
                  : null,
                bottomItem: bottomItem
                  ? { id: bottomItem.id, name: bottomItem.name, imagePath: bottomItem.imagePath, category: bottomItem.category }
                  : null,
              };
            })
          );

          send("complete", { date, recommendations });
        } catch (err) {
          console.error("Recommendation pipeline error:", err);
          send("error", {
            message: err instanceof Error ? err.message : "推荐生成失败",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Recommendation generate error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "推荐生成失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
