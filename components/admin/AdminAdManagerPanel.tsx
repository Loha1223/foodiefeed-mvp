"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isEditing = editingAdId !== null;
  const imageUrl = form.image_url.trim();
  const imageUrlError = getUrlInlineError(form.image_url, "image_url");
  const targetUrlError = getUrlInlineError(form.target_url, "target_url");

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
  }, [form.image_url]);

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
    setImagePreviewFailed(false);
  }

  function handleEdit(ad: SponsoredPost) {
    setEditingAdId(ad.id);
    setForm(toFormState(ad));
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = toInput(form);
    const validationError = validateSponsoredPostInput(input);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      if (editingAdId === null) {
        const createdAd = await createSponsoredPost(input);
        setAds((currentAds) => [createdAd, ...currentAds]);
        resetForm();
        setSuccessMessage("廣告已新增。");
      } else {
        const updatedAd = await updateSponsoredPost(editingAdId, input);
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
              管理 Sponsored Posts。圖片目前僅支援 image_url。
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
                    {imageUrlError ? (
                      <span className="text-xs text-red-700">{imageUrlError}</span>
                    ) : null}
                  </label>
                  <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
                    {imageUrl ? (
                      imagePreviewFailed ? (
                        <div className="px-3 py-6 text-center text-sm text-amber-700">
                          圖片無法預覽，前台會使用 fallback。
                        </div>
                      ) : (
                        <img
                          src={imageUrl}
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
                        feed：Feed 原生廣告卡，每 6 張情報後插入。hero：首頁橫幅
                        Banner，只顯示 active 且 priority 最高的一則，建議使用橫幅圖片，target_url
                        可空。detail：詳情頁預留，目前前台尚未顯示。
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
                {isSubmitting ? "儲存中..." : isEditing ? "更新廣告" : "新增廣告"}
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
    </section>
  );
}
