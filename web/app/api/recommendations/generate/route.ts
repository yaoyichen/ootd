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

async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personImageId, locationId, targetDay = 0 } = body;

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
              const dayOffset = Math.min(Math.max(targetDay, 0), 6);
              weatherContext = buildWeatherPromptContext(summary, dayOffset);
              const targetForecast = summary.forecasts[dayOffset];
              const dayLabel = targetForecast?.dayLabel || "今天";
              send("progress", {
                step: "weather_done",
                message: `${summary.city} ${dayLabel} ${targetForecast?.weatherDay || summary.weather} ${targetForecast?.tempRange || summary.temp}`,
                weather: summary,
              });
            } catch (err) {
              console.error("Weather fetch failed, proceeding without:", err);
            }
          }

          // Step 1: LLM suggests combinations
          send("progress", { step: "matching", message: "正在智能匹配单品组合..." });

          // Extract person description summary for matching context
          let personDescription: string | undefined;
          if (person.description) {
            try {
              const desc = JSON.parse(person.description);
              if (desc.summary) personDescription = desc.summary;
            } catch {
              // ignore parse error
            }
          }

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
            weatherContext,
            personDescription
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

          // Step 2: Generate tryon images (concurrent with retry)
          const concurrency = Number(process.env.DASHSCOPE_CONCURRENCY) || 2;
          const retryDelay = Number(process.env.DASHSCOPE_RETRY_DELAY) || 3000;
          let completedCount = 0;
          const personImageForTryon = person.enhancedImagePath || person.imagePath;
          send("progress", {
            step: "generating",
            message: `开始生成穿搭效果（共 ${combinations.length} 组）...`,
            current: 0,
            total: combinations.length,
          });

          const outfitResults = (
            await pMap(
              combinations,
              async (combo, i) => {
                const topItem = items.find((it) => it.id === combo.topItemId);
                const bottomItem = items.find((it) => it.id === combo.bottomItemId);

                if (!topItem || !bottomItem) return null;

                const tryGenerate = () =>
                  generateTryon({
                    personImagePath: personImageForTryon,
                    topImagePath: topItem.imagePath,
                    bottomImagePath: bottomItem.imagePath,
                    personImageId: person.id,
                    topItemId: topItem.id,
                    bottomItemId: bottomItem.id,
                  });

                try {
                  let result;
                  try {
                    result = await tryGenerate();
                  } catch (firstErr) {
                    console.warn(`Tryon combo ${i + 1} failed, retrying in 3s...`, firstErr);
                    await new Promise((r) => setTimeout(r, retryDelay));
                    result = await tryGenerate();
                  }

                  completedCount++;
                  send("progress", {
                    step: "generated",
                    message: `已完成 ${completedCount}/${combinations.length} 组穿搭生成${result.cached ? "（缓存）" : ""}`,
                    current: completedCount,
                    total: combinations.length,
                    outfitId: result.outfitId,
                    imagePath: result.imagePath,
                  });

                  return {
                    outfitId: result.outfitId,
                    imagePath: result.imagePath,
                    reason: combo.reason,
                    topItemId: combo.topItemId,
                    bottomItemId: combo.bottomItemId,
                    cached: result.cached,
                  };
                } catch (err) {
                  completedCount++;
                  console.error(`Tryon generation failed for combo ${i + 1} after retry:`, err);
                  send("progress", {
                    step: "generate_failed",
                    message: `已完成 ${completedCount}/${combinations.length} 组（1 组失败）`,
                    current: completedCount,
                    total: combinations.length,
                  });
                  return null;
                }
              },
              concurrency
            )
          ).filter((r): r is NonNullable<typeof r> => r !== null);

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

          const scored = await Promise.all(
            outfitResults.map(async (outfit, i) => {
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

                send("progress", {
                  step: "scored",
                  message: `穿搭 ${i + 1} 评分完成：${result.score} 分`,
                  current: i + 1,
                  total: outfitResults.length,
                  outfitId: outfit.outfitId,
                  score: result.score,
                });

                return { ...outfit, score: result.score, scoreDims: dimsJson, evaluation: result.evaluation };
              } catch (err) {
                console.error(`Scoring failed for outfit ${outfit.outfitId}:`, err);
                return { ...outfit, score: 70, scoreDims: null as string | null, evaluation: "评分暂不可用" };
              }
            })
          );

          // Step 4: Sort by score, take top 5, save as DailyRecommendation
          scored.sort((a, b) => b.score - a.score);
          const top5 = scored.slice(0, 5);
          const date = todayStr();

          await prisma.dailyRecommendation.deleteMany({ where: { date } });

          for (let i = 0; i < top5.length; i++) {
            await prisma.dailyRecommendation.create({
              data: {
                date,
                rank: i + 1,
                outfitId: top5[i].outfitId,
                reason: top5[i].reason,
              },
            });
          }

          // Build full response with item details
          const recommendations = await Promise.all(
            top5.map(async (r, idx) => {
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
