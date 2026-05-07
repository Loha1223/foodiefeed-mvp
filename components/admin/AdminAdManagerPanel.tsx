"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createSponsoredPost,
  deleteSponsoredPost,
  fetchAllSponsoredPosts,
  getSponsoredPostStatus,
  getSponsoredPostStatusLabel,
  toggleSponsoredPostActive,
  updateSponsoredPost,
  validateSponsoredPostInput,
  type SponsoredPostStatus,
} from "@/lib/ads";
import {
  ALLOWED_SPONSORED_AD_IMAGE_TYPES,
  MAX_SPONSORED_AD_IMAGE_SIZE_BYTES,
  uploadSponsoredAdImage,
} from "@/lib/adStorage";
import { ImageCropperModal } from "@/components/shared/ImageCropperModal";
import type {
  CreateSponsoredPostInput,
  SponsoredPost,
} from "@/types/foodie";

type AdminAdManagerPanelProps = {
  isAdmin: boolean;
  isOpen: boolean;
  onClose?: () => void;
  onAdsChanged?: () => void;
};

type AdFormState = {
  brand_name: string;
  title: string;
  description: string;
  image_url: string;
  target_url: string;
  city: string;
  district: string;
  category: string;
  placement: string;
  starts_at: string;
  ends_at: string;
  priority: string;
  is_active: boolean;
};

type StatusFilter = SponsoredPostStatus | "all";

const emptyForm: AdFormState = {
  brand_name: "",
  title: "",
  description: "",
  image_url: "",
  target_url: "",
  city: "",
  district: "",
  category: "",
  placement: "feed",
  starts_at: "",
  ends_at: "",
  priority: "0",
  is_active: true,
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-TW");
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toFormState(ad: SponsoredPost): AdFormState {
  return {
    brand_name: ad.brand_name,
    title: ad.title,
    description: ad.description ?? "",
    image_url: ad.image_url ?? "",
    target_url: ad.target_url ?? "",
    city: ad.city ?? "",
    district: ad.district ?? "",
    category: ad.category ?? "",
    placement: ad.placement || "feed",
    starts_at: toDateTimeLocalValue(ad.starts_at),
    ends_at: toDateTimeLocalValue(ad.ends_at),
    priority: String(ad.priority ?? 0),
    is_active: ad.is_active,
  };
}

function toInput(form: AdFormState): CreateSponsoredPostInput {
  return {
    brand_name: form.brand_name,
    title: form.title,
    description: form.description,
    image_url: form.image_url,
    target_url: form.target_url,
    city: form.city,
    district: form.district,
    category: form.category,
    placement: form.placement || "feed",
    starts_at: form.starts_at,
    ends_at: form.ends_at,
    priority: Number(form.priority),
    is_active: form.is_active,
  };
}

function getStatusClass(status: SponsoredPostStatus) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "scheduled") {
    return "bg-sky-50 text-sky-700";
  }

  if (status === "ended") {
    return "bg-stone-100 text-stone-600";
  }

  return "bg-amber-50 text-amber-700";
}

function getUrlInlineError(value: string, label: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return null;
    }
  } catch {
    return `${label} 必須是有效的 http:// 或 https:// URL`;
  }

  return `${label} 必須是有效的 http:// 或 https:// URL`;
}

function getAdImageCropConfig(placement: string) {
  if (placement === "hero") {
    return {
      aspectRatio: 2 / 1,
      helperText: "建議 1200 × 600，橫式圖片",
      ratioLabel: "2:1",
      title: "裁切 Hero Banner 圖片",
    };
  }

  if (placement === "detail") {
    return {
      aspectRatio: 4 / 3,
      helperText: "詳情頁廣告本階段先使用 4:3",
      ratioLabel: "4:3",
      title: "裁切詳情頁廣告圖片",
    };
  }

  return {
    aspectRatio: 4 / 3,
    helperText: "建議 1200 × 900，4:3",
    ratioLabel: "4:3",
    title: "裁切 Feed 廣告圖片",
  };
}

export function AdminAdManagerPanel({
  isAdmin,
  isOpen,
  onClose,
  onAdsChanged,
}: AdminAdManagerPanelProps) {
  const [ads, setAds] = useState<SponsoredPost[]>([]);
  const [form, setForm] = useState<AdFormState>(emptyForm);
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAdId, setActionAdId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [pendingImageCropFile, setPendingImageCropFile] =
    useState<File | null>(null);
  const [selectedImageModeMessage, setSelectedImageModeMessage] = useState("");
  const [isImageCropperOpen, setIsImageCropperOpen] = useState(false);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState("");
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "uploading" | "saving"
  >("idle");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingAdId !== null;
  const imageUrl = form.image_url.trim();
  const previewImageUrl = localImagePreviewUrl || imageUrl;
  const imageUrlError = getUrlInlineError(form.image_url, "image_url");
  const displayedImageUrlError = selectedImageFile ? null : imageUrlError;
  const targetUrlError = getUrlInlineError(form.target_url, "target_url");
  const adImageCropConfig = getAdImageCropConfig(form.placement);
  const imageSourceMessage = selectedImageFile
    ? "將優先使用上傳圖片"
    : imageUrl
      ? "目前使用圖片 URL"
      : "前台將使用預設圖";

  const filteredAds = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return ads.filter((ad) => {
      const status = getSponsoredPostStatus(ad);

      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        ad.brand_name,
        ad.title,
        ad.city,
        ad.district,
        ad.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [ads, searchTerm, statusFilter]);

  async function loadAds() {
    if (!isAdmin || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedAds = await fetchAllSponsoredPosts();
      setAds(fetchedAds);
    } catch (loadError) {
      console.warn(
        loadError instanceof Error
          ? loadError.message
          : "Failed to fetch sponsored posts",
      );
      setError(
        loadError instanceof Error
          ? loadError.message
          : "目前無法載入廣告資料",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && isAdmin) {
      void loadAds();
    }
  }, [isOpen, isAdmin]);

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [form.image_url, localImagePreviewUrl]);

  useEffect(() => {
    if (!selectedImageFile) {
      setLocalImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setLocalImagePreviewUrl(objectUrl);
    setImagePreviewFailed(false);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

  function updateForm<K extends keyof AdFormState>(
    key: K,
    value: AdFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(null);
    setSuccessMessage(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingAdId(null);
    setFormError(null);
    setSuccessMessage(null);
    setSelectedImageFile(null);
    setPendingImageCropFile(null);
    setSelectedImageModeMessage("");
    setIsImageCropperOpen(false);
    setLocalImagePreviewUrl("");
    setImagePreviewFailed(false);
    setSubmitStatus("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleEdit(ad: SponsoredPost) {
    setEditingAdId(ad.id);
    setForm(toFormState(ad));
    setFormError(null);
    setSuccessMessage(null);
    setSelectedImageFile(null);
    setPendingImageCropFile(null);
    setSelectedImageModeMessage("");
    setIsImageCropperOpen(false);
    setLocalImagePreviewUrl("");
    setImagePreviewFailed(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleAdImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedImageFile(null);
      setSelectedImageModeMessage("");
      return;
    }

    if (!ALLOWED_SPONSORED_AD_IMAGE_TYPES.includes(file.type)) {
      setFormError("廣告圖片格式僅支援 JPG、PNG 或 WebP");
      setSelectedImageFile(null);
      setSelectedImageModeMessage("");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SPONSORED_AD_IMAGE_SIZE_BYTES) {
      setFormError("廣告圖片大小不可超過 5MB");
      setSelectedImageFile(null);
      setSelectedImageModeMessage("");
      event.target.value = "";
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    setPendingImageCropFile(file);
    setIsImageCropperOpen(true);
    setImagePreviewFailed(false);
  }

  function closeImageCropperWithoutChanges() {
    setPendingImageCropFile(null);
    setIsImageCropperOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function useOriginalAdImage(file: File) {
    setSelectedImageFile(file);
    setSelectedImageModeMessage("使用原圖，前台可能裁切邊緣");
    setPendingImageCropFile(null);
    setIsImageCropperOpen(false);
    setFormError(null);
  }

  function useCroppedAdImage(file: File) {
    setSelectedImageFile(file);
    setSelectedImageModeMessage(
      `已套用 ${getAdImageCropConfig(form.placement).ratioLabel} 裁切`,
    );
    setPendingImageCropFile(null);
    setIsImageCropperOpen(false);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = toInput(form);
    const validationInput = selectedImageFile
      ? { ...input, image_url: "" }
      : input;
    const validationError = validateSponsoredPostInput(validationInput);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("saving");
    setFormError(null);
    setSuccessMessage(null);

    try {
      let finalInput = input;

      if (selectedImageFile) {
        setSubmitStatus("uploading");
        const uploadedImageUrl = await uploadSponsoredAdImage(selectedImageFile);
        finalInput = {
          ...input,
          image_url: uploadedImageUrl,
        };
        setSubmitStatus("saving");
      }

      if (editingAdId === null) {
        const createdAd = await createSponsoredPost(finalInput);
        setAds((currentAds) => [createdAd, ...currentAds]);
        resetForm();
        setSuccessMessage("廣告已新增。");
      } else {
        const updatedAd = await updateSponsoredPost(editingAdId, finalInput);
        setAds((currentAds) =>
          currentAds.map((ad) => (ad.id === updatedAd.id ? updatedAd : ad)),
        );
        resetForm();
        setSuccessMessage("廣告已更新，已離開編輯模式。");
      }

      onAdsChanged?.();
    } catch (submitError) {
      console.warn(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save sponsored post",
      );
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "儲存廣告失敗，請稍後再試",
      );
    } finally {
      setSubmitStatus("idle");
      setIsSubmitting(false);
    }
  }

  async function handleToggle(ad: SponsoredPost) {
    setActionAdId(ad.id);
    setError(null);

    try {
      const updatedAd = await toggleSponsoredPostActive(ad.id, !ad.is_active);
      setAds((currentAds) =>
        currentAds.map((currentAd) =>
          currentAd.id === updatedAd.id ? updatedAd : currentAd,
        ),
      );
      onAdsChanged?.();
    } catch (toggleError) {
      console.warn(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to toggle sponsored post",
      );
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "更新廣告狀態失敗",
      );
    } finally {
      setActionAdId(null);
    }
  }

  async function handleDelete(ad: SponsoredPost) {
    if (
      !window.confirm(
        `刪除廣告會同步刪除曝光與點擊紀錄，確定要刪除「${ad.title}」嗎？`,
      )
    ) {
      return;
    }

    setActionAdId(ad.id);
    setError(null);

    try {
      await deleteSponsoredPost(ad.id);
      setAds((currentAds) =>
        currentAds.filter((currentAd) => currentAd.id !== ad.id),
      );

      if (editingAdId === ad.id) {
        resetForm();
      }

      onAdsChanged?.();
    } catch (deleteError) {
      console.warn(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete sponsored post",
      );
      setError(
        deleteError instanceof Error ? deleteError.message : "刪除廣告失敗",
      );
    } finally {
      setActionAdId(null);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <section className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-950">廣告管理</h2>
            <p className="mt-1 text-sm text-stone-500">
              管理 Sponsored Posts。圖片可上傳到 Storage，也可手動輸入 image_url。
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void loadAds()}
                disabled={isLoading}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                重新整理
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                關閉
              </button>
            ) : null}
          </div>
        </div>

        {!isAdmin ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            你沒有管理員權限
          </div>
        ) : null}

        {isAdmin ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border border-stone-200 bg-stone-50 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-950">
                    {isEditing ? "編輯廣告" : "新增廣告"}
                  </h3>
                  {isEditing ? (
                    <p className="mt-1 text-xs text-stone-500">
                      正在編輯：{form.title || "未命名廣告"}
                    </p>
                  ) : null}
                </div>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm font-medium text-stone-600 hover:text-stone-950"
                  >
                    取消編輯
                  </button>
                ) : null}
              </div>

              {formError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}
              {successMessage ? (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="space-y-5">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-stone-950">
                    基本資訊
                  </legend>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    品牌名稱
                    <input
                      value={form.brand_name}
                      onChange={(event) =>
                        updateForm("brand_name", event.target.value)
                      }
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    廣告標題
                    <input
                      value={form.title}
                      onChange={(event) =>
                        updateForm("title", event.target.value)
                      }
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    描述
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      className="min-h-20 rounded-md border border-stone-300 px-3 py-2 font-normal"
                    />
                  </label>
                </fieldset>

                <fieldset className="space-y-3 border-t border-stone-200 pt-4">
                  <legend className="text-sm font-semibold text-stone-950">
                    素材與連結
                  </legend>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    Hero Banner 建議 1200 × 600，橫式圖片，2:1 或 16:9。Feed
                    廣告卡建議 1200 × 900，4:3。避免重要文字貼近邊緣，前台會以
                    cover 方式顯示，可能裁掉邊角。
                  </div>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    image_url
                    <input
                      value={form.image_url}
                      onChange={(event) =>
                        updateForm("image_url", event.target.value)
                      }
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      placeholder="https://..."
                    />
                    {displayedImageUrlError ? (
                      <span className="text-xs text-red-700">
                        {displayedImageUrlError}
                      </span>
                    ) : null}
                    <span className="text-xs font-normal text-stone-500">
                      可手動貼上圖片 URL。若同時選擇本機圖片，送出時會優先使用上傳圖片。
                    </span>
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    上傳廣告圖片
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAdImageFileChange}
                      className="rounded-md border border-stone-300 px-3 py-2 text-sm font-normal file:mr-4 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
                    />
                    <span className="text-xs font-normal text-stone-500">
                      支援 JPG、PNG、WebP，5MB 以內。
                    </span>
                  </label>
                  <p className="rounded-md bg-white px-3 py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                    圖片來源：{imageSourceMessage}
                    {selectedImageModeMessage ? `；${selectedImageModeMessage}` : ""}
                  </p>
                  <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
                    {previewImageUrl ? (
                      imagePreviewFailed ? (
                        <div className="px-3 py-6 text-center text-sm text-amber-700">
                          圖片無法預覽，前台會使用 fallback。
                        </div>
                      ) : (
                        <img
                          src={previewImageUrl}
                          alt="廣告素材預覽"
                          className="h-40 w-full object-cover"
                          onError={() => setImagePreviewFailed(true)}
                        />
                      )
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-stone-500">
                        未提供圖片，前台會使用預設圖。
                      </div>
                    )}
                  </div>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    target_url
                    <input
                      value={form.target_url}
                      onChange={(event) =>
                        updateForm("target_url", event.target.value)
                      }
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      placeholder="https://..."
                    />
                    {targetUrlError ? (
                      <span className="text-xs text-red-700">
                        {targetUrlError}
                      </span>
                    ) : null}
                  </label>
                </fieldset>

                <fieldset className="space-y-3 border-t border-stone-200 pt-4">
                  <legend className="text-sm font-semibold text-stone-950">
                    投放條件
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-stone-700">
                      縣市
                      <input
                        value={form.city}
                        onChange={(event) =>
                          updateForm("city", event.target.value)
                        }
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-stone-700">
                      行政區
                      <input
                        value={form.district}
                        onChange={(event) =>
                          updateForm("district", event.target.value)
                        }
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-stone-700">
                      類別
                      <input
                        value={form.category}
                        onChange={(event) =>
                          updateForm("category", event.target.value)
                        }
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-stone-700">
                      版位
                      <select
                        value={form.placement}
                        onChange={(event) =>
                          updateForm("placement", event.target.value)
                        }
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      >
                        <option value="feed">feed</option>
                        <option value="hero">hero</option>
                        <option value="detail">detail</option>
                      </select>
                      <span className="text-xs leading-5 text-stone-500">
                        feed：Feed 原生廣告卡，每 6 張情報後插入。hero：首頁 Hero
                        Banner，最多顯示前 3 則 active hero 廣告並輪播，依
                        priority 由高到低排序。detail：詳情頁預留，目前前台尚未顯示。
                      </span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-3 border-t border-stone-200 pt-4">
                  <legend className="text-sm font-semibold text-stone-950">
                    投放設定
                  </legend>
                  <p className="text-xs leading-5 text-stone-500">
                    時間以目前瀏覽器時區輸入，儲存後由 Supabase 轉為時間戳。
                  </p>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    開始時間
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(event) =>
                        updateForm("starts_at", event.target.value)
                      }
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    結束時間
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(event) =>
                        updateForm("ends_at", event.target.value)
                      }
                      className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      required
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium text-stone-700">
                      Priority
                      <input
                        type="number"
                        value={form.priority}
                        onChange={(event) =>
                          updateForm("priority", event.target.value)
                        }
                        className="rounded-md border border-stone-300 px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="mt-6 flex items-center gap-2 text-sm font-medium text-stone-700">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) =>
                          updateForm("is_active", event.target.checked)
                        }
                        className="h-4 w-4 rounded border-stone-300"
                      />
                      啟用
                    </label>
                  </div>
                </fieldset>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {submitStatus === "uploading"
                  ? "上傳圖片中..."
                  : submitStatus === "saving"
                    ? "儲存廣告中..."
                    : isEditing
                      ? "更新廣告"
                      : "新增廣告"}
              </button>
            </form>

            <div className="rounded-lg border border-stone-200 bg-white">
              <div className="grid gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3">
                <p className="text-sm font-medium text-stone-700">
                  共 {filteredAds.length} / {ads.length} 筆 sponsored_posts
                </p>
                <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                    placeholder="搜尋 brand / title / city / district / category"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="all">全部狀態</option>
                    <option value="active">投放中</option>
                    <option value="scheduled">尚未開始</option>
                    <option value="ended">已結束</option>
                    <option value="disabled">停用</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="px-4 py-8 text-center text-sm text-stone-500">
                  廣告資料載入中...
                </div>
              ) : null}

              {!isLoading && error ? (
                <div className="px-4 py-6 text-sm text-red-700">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadAds()}
                    className="mt-4 rounded-md border border-red-200 px-3 py-2 font-medium hover:bg-red-50"
                  >
                    重新整理
                  </button>
                </div>
              ) : null}

              {!isLoading && !error && filteredAds.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-stone-500">
                  目前沒有符合條件的廣告資料
                </div>
              ) : null}

              {!isLoading && !error && filteredAds.length > 0 ? (
                <ul className="divide-y divide-stone-200">
                  {filteredAds.map((ad) => {
                    const status = getSponsoredPostStatus(ad);

                    return (
                      <li key={ad.id} className="grid gap-3 px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs text-stone-500">ID {ad.id}</p>
                            <p className="mt-1 font-semibold text-stone-950">
                              {ad.brand_name}
                            </p>
                            <p className="mt-1 text-sm text-stone-700">
                              {ad.title}
                            </p>
                          </div>
                          <span
                            className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(status)}`}
                          >
                            {getSponsoredPostStatusLabel(status)}
                          </span>
                        </div>

                        <div className="grid gap-1 text-xs text-stone-500 sm:grid-cols-2">
                          <span>版位: {ad.placement || "feed"}</span>
                          <span>Priority: {ad.priority}</span>
                          <span>
                            條件: {[ad.city, ad.district, ad.category]
                              .filter(Boolean)
                              .join(" / ") || "不限"}
                          </span>
                          <span>素材: {ad.image_url ? "有 image_url" : "預設圖"}</span>
                          <span>
                            連結: {ad.target_url ? "有 target_url" : "無 CTA"}
                          </span>
                          <span>開始: {formatDateTime(ad.starts_at)}</span>
                          <span>結束: {formatDateTime(ad.ends_at)}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(ad)}
                            disabled={actionAdId === ad.id || isSubmitting}
                            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggle(ad)}
                            disabled={actionAdId === ad.id}
                            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
                          >
                            {ad.is_active ? "停用此廣告" : "啟用此廣告"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(ad)}
                            disabled={actionAdId === ad.id}
                            className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                          >
                            刪除
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <ImageCropperModal
        file={pendingImageCropFile}
        isOpen={isImageCropperOpen}
        aspectRatio={adImageCropConfig.aspectRatio}
        title={adImageCropConfig.title}
        helperText={adImageCropConfig.helperText}
        onCancel={closeImageCropperWithoutChanges}
        onUseOriginal={useOriginalAdImage}
        onCropComplete={useCroppedAdImage}
      />
    </section>
  );
}
