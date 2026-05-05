"use client";

import { useEffect, useMemo, useState } from "react";

type CropPosition = "center" | "top" | "bottom" | "left" | "right";

type ImageCropperModalProps = {
  file: File | null;
  isOpen: boolean;
  aspectRatio: number;
  title?: string;
  helperText?: string;
  onCancel: () => void;
  onUseOriginal: (file: File) => void;
  onCropComplete: (croppedFile: File) => void;
};

const allowedOutputTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const positionOptions: Array<{ label: string; value: CropPosition }> = [
  { label: "置中", value: "center" },
  { label: "靠上", value: "top" },
  { label: "靠下", value: "bottom" },
  { label: "靠左", value: "left" },
  { label: "靠右", value: "right" },
];

function getAspectRatioLabel(aspectRatio: number) {
  if (Math.abs(aspectRatio - 4 / 3) < 0.01) {
    return "4:3";
  }

  if (Math.abs(aspectRatio - 2) < 0.01) {
    return "2:1";
  }

  if (Math.abs(aspectRatio - 16 / 9) < 0.01) {
    return "16:9";
  }

  return `${aspectRatio.toFixed(2)}:1`;
}

function getObjectPosition(position: CropPosition) {
  if (position === "top") {
    return "center top";
  }

  if (position === "bottom") {
    return "center bottom";
  }

  if (position === "left") {
    return "left center";
  }

  if (position === "right") {
    return "right center";
  }

  return "center center";
}

function getCropRect(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
  position: CropPosition,
  zoom: number,
) {
  const imageAspectRatio = imageWidth / imageHeight;
  let cropWidth = imageWidth;
  let cropHeight = imageHeight;

  if (imageAspectRatio > aspectRatio) {
    cropWidth = imageHeight * aspectRatio;
  } else {
    cropHeight = imageWidth / aspectRatio;
  }

  cropWidth /= zoom;
  cropHeight /= zoom;

  const maxX = imageWidth - cropWidth;
  const maxY = imageHeight - cropHeight;
  let sourceX = maxX / 2;
  let sourceY = maxY / 2;

  if (position === "left") {
    sourceX = 0;
  } else if (position === "right") {
    sourceX = maxX;
  }

  if (position === "top") {
    sourceY = 0;
  } else if (position === "bottom") {
    sourceY = maxY;
  }

  return {
    cropHeight: Math.max(1, Math.round(cropHeight)),
    cropWidth: Math.max(1, Math.round(cropWidth)),
    sourceX: Math.max(0, Math.round(sourceX)),
    sourceY: Math.max(0, Math.round(sourceY)),
  };
}

function getCroppedFileName(fileName: string) {
  return fileName.startsWith("cropped-") ? fileName : `cropped-${fileName}`;
}

export function ImageCropperModal({
  file,
  isOpen,
  aspectRatio,
  title = "裁切圖片",
  helperText,
  onCancel,
  onUseOriginal,
  onCropComplete,
}: ImageCropperModalProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [position, setPosition] = useState<CropPosition>("center");
  const [zoom, setZoom] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCropping, setIsCropping] = useState(false);
  const aspectRatioLabel = useMemo(
    () => getAspectRatioLabel(aspectRatio),
    [aspectRatio],
  );

  useEffect(() => {
    if (!file || !isOpen) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setPosition("center");
    setZoom(1);
    setErrorMessage("");

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isOpen]);

  if (!isOpen || !file) {
    return null;
  }

  async function handleCrop() {
    if (!file || !previewUrl) {
      return;
    }

    setIsCropping(true);
    setErrorMessage("");

    try {
      const image = new Image();
      image.src = previewUrl;
      await image.decode();

      const { sourceX, sourceY, cropWidth, cropHeight } = getCropRect(
        image.naturalWidth,
        image.naturalHeight,
        aspectRatio,
        position,
        zoom,
      );
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("目前無法建立圖片裁切畫布");
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight,
      );

      const outputType = allowedOutputTypes.has(file.type)
        ? file.type
        : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputType);
      });

      if (!blob) {
        throw new Error("圖片裁切失敗，請改用原圖");
      }

      onCropComplete(
        new File([blob], getCroppedFileName(file.name), {
          lastModified: Date.now(),
          type: outputType,
        }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "圖片裁切失敗，請改用原圖",
      );
    } finally {
      setIsCropping(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/60 px-3 py-4 sm:items-center sm:px-4 sm:py-8"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-950">{title}</h2>
              <p className="mt-1 text-xs text-stone-500">
                建議比例：{aspectRatioLabel}
                {helperText ? `。${helperText}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-2 text-sm text-stone-500 hover:bg-stone-100"
            >
              取消
            </button>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            <div
              className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
              style={{ aspectRatio }}
            >
              <img
                src={previewUrl}
                alt="裁切預覽"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: getObjectPosition(position),
                  transform: `scale(${zoom})`,
                  transformOrigin: getObjectPosition(position),
                }}
                onError={() => setErrorMessage("圖片載入失敗，請改用原圖")}
              />
              <div className="pointer-events-none absolute inset-3 rounded-md border border-white/80 shadow-[0_0_0_999px_rgba(28,25,23,0.16)]" />
            </div>
            <p className="text-xs text-stone-500">
              這是裁切預覽。MVP 先提供對齊位置與縮放，不支援自由拖曳、旋轉或壓縮。
            </p>
          </div>

          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-stone-900">
                對齊位置
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {positionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPosition(option.value)}
                    className={`rounded-md border px-3 py-2 text-sm font-medium ${
                      position === option.value
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-300 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm font-semibold text-stone-900">
              縮放
              <input
                type="range"
                min="1"
                max="2"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
              <span className="text-xs font-normal text-stone-500">
                {zoom.toFixed(2)}x
              </span>
            </label>

            {errorMessage ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-2 border-t border-stone-200 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => onUseOriginal(file)}
                className="rounded-md border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
              >
                使用原圖
              </button>
              <button
                type="button"
                onClick={() => void handleCrop()}
                disabled={isCropping}
                className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {isCropping ? "裁切中..." : "套用裁切"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
