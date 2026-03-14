"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

type Status = "idle" | "processing" | "completed" | "failed";

function UploadZone({
  label,
  hint,
  preview,
  onFile,
}: {
  label: string;
  hint: string;
  preview: string | null;
  onFile: (base64: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) onFile(e.target.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div
        className="relative border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
        style={{ aspectRatio: "3/4" }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <Image src={preview} alt={label} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V8m0 0-3 3m3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15v1a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-1" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-center px-4 leading-relaxed">{hint}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [topImage, setTopImage] = useState<string | null>(null);
  const [bottomImage, setBottomImage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!personImage || (!topImage && !bottomImage)) return;

    setStatus("processing");
    setError(null);
    setResultImage(null);

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_image: personImage,
          top_garment_image: topImage,
          bottom_garment_image: bottomImage,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("failed");
        setError(data.error || "生成失败，请重试");
        return;
      }

      setResultImage(data.image_url);
      setStatus("completed");
    } catch {
      setStatus("failed");
      setError("网络错误，请重试");
    }
  }, [personImage, topImage, bottomImage]);

  const handleReset = () => {
    setStatus("idle");
    setResultImage(null);
    setError(null);
  };

  const isProcessing = status === "processing";
  const hasGarment = !!topImage || !!bottomImage;

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">OOTD</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">试穿 MVP</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* Left: Inputs */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">AI 虚拟试穿</h1>
              <p className="mt-1 text-sm text-gray-500">上传人像和服装，AI 生成你穿上的效果图</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <UploadZone
                label="你的照片"
                hint="全身正面照"
                preview={personImage}
                onFile={setPersonImage}
              />
              <UploadZone
                label="上衣"
                hint="平铺拍摄"
                preview={topImage}
                onFile={setTopImage}
              />
              <UploadZone
                label="下装"
                hint="平铺拍摄"
                preview={bottomImage}
                onFile={setBottomImage}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!personImage || !hasGarment || isProcessing}
              className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 10h-2A8 8 0 014 12z" />
                  </svg>
                  AI 生成中，通常需要 10-30 秒...
                </span>
              ) : (
                "生成试穿效果"
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Tips */}
            <div className="p-4 rounded-xl bg-gray-50 text-xs text-gray-500 leading-relaxed">
              <p className="font-medium text-gray-600 mb-1">拍摄建议</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>人像：正面站立全身入镜，光线均匀，背景简洁</li>
                <li>服装：平铺拍摄，背景干净，服饰占比尽量大</li>
                <li>上衣和下装至少上传一件，也可同时上传</li>
                <li>图片尺寸建议不超过 5MB</li>
              </ul>
            </div>
          </div>

          {/* Right: Result */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700">生成结果</span>
            <div
              className="relative border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center"
              style={{ aspectRatio: "3/4" }}
            >
              {resultImage ? (
                <>
                  <Image src={resultImage} alt="试穿效果" fill className="object-cover" unoptimized />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <a
                      href={resultImage}
                      download="ootd-tryon.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors shadow-sm"
                    >
                      保存图片
                    </a>
                    <button
                      onClick={handleReset}
                      className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors shadow-sm"
                    >
                      重新生成
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-300">
                  {isProcessing ? (
                    <>
                      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                      <span className="text-sm text-gray-400">AI 生成中，请稍候...</span>
                    </>
                  ) : (
                    <>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="12" cy="9" r="3" />
                        <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
                      </svg>
                      <p className="text-xs text-gray-400">上传照片后点击生成</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
