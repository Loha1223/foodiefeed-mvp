"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { FoodCategory } from "@/types/foodie";
import type { CreatePostInput } from "@/types/foodie";
import { taiwanDistricts, type TaiwanCity } from "@/data/taiwanDistricts";
import {
  ALLOWED_POST_IMAGE_TYPES,
  MAX_POST_IMAGE_SIZE_BYTES,
  uploadPostImage,
} from "@/lib/storage";
import { useToast } from "@/hooks/useToast";
import { getUserFriendlyErrorMessage } from "@/lib/errorMessages";

type PostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: (input: CreatePostInput) => Promise<void>;
};

const categories: FoodCategory[] = [
  "快閃店",
  "當日限定",
  "期間限定優惠",
  "在地美食",
  "新品上市",
];

const cities = Object.keys(taiwanDistricts) as TaiwanCity[];

const initialFormState: CreatePostInput = {
  name: "",
  title: "",
  city: cities[0],
  district: taiwanDistricts[cities[0]][0],
  address: "",
  category: categories[0],
  img: "",
};

export function PostModal({
  isOpen,
  onClose,
  onCreatePost,
}: PostModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<CreatePostInput>(initialFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [isPreviewLoadFailed, setIsPreviewLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl("");
      setIsPreviewLoadFailed(false);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);
    setIsPreviewLoadFailed(false);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    previousBodyOverflowRef.current = previousOverflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflowRef.current ?? "";
      previousBodyOverflowRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        resetForm();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleCloseModal() {
    resetForm();
    onClose();
  }

  function updateField(field: keyof CreatePostInput, value: string) {
    setForm((currentForm) => {
      if (field === "city") {
        const city = value as TaiwanCity;

        return {
          ...currentForm,
          city,
          district: taiwanDistricts[city][0],
        };
      }

      return {
        ...currentForm,
        [field]: value,
      };
    });
  }

  function resetForm() {
    setForm(initialFormState);
    setSelectedFile(null);
    setLocalPreviewUrl("");
    setIsPreviewLoadFailed(false);
    setErrorMessage("");
    setIsUploadingImage(false);
    setIsSubmittingPost(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage("圖片格式僅支援 JPG、PNG 或 WebP");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
      setErrorMessage("圖片大小不可超過 5MB");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setSelectedFile(file);
    setIsPreviewLoadFailed(false);
  }

  function validateForm(): string | null {
    if (!form.name.trim()) {
      return "請填寫店家名稱";
    }

    if (!form.title.trim()) {
      return "請填寫吸睛標題";
    }

    if (!form.city.trim()) {
      return "請選擇縣市";
    }

    if (!form.district.trim()) {
      return "請選擇行政區";
    }

    if (!form.address.trim()) {
      return "請填寫完整地址";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    setIsUploadingImage(false);
    setIsSubmittingPost(false);

    try {
      let finalImageUrl = form.img?.trim() || "/placeholder-food.jpg";

      if (selectedFile) {
        setIsUploadingImage(true);
        finalImageUrl = await uploadPostImage(selectedFile);
        setIsUploadingImage(false);
      }

      setIsSubmittingPost(true);

      await onCreatePost({
        name: form.name.trim(),
        title: form.title.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        address: form.address.trim(),
        category: form.category?.trim(),
        img: finalImageUrl,
      });
      resetForm();
      onClose();
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, "新增情報失敗，請稍後再試。");
      setErrorMessage(message);
      showToast({
        variant: "error",
        title: "發佈失敗",
        message,
      });
    } finally {
      setIsUploadingImage(false);
      setIsSubmittingPost(false);
      setIsSubmitting(false);
    }
  }

  const selectedCity = form.city as TaiwanCity;
  const districts = taiwanDistricts[selectedCity] ?? taiwanDistricts[cities[0]];
  const previewUrl = localPreviewUrl || form.img?.trim();
  const imageSourceLabel = selectedFile
    ? "本機圖片"
    : form.img?.trim()
      ? "圖片 URL"
      : "預設圖片";

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-stone-950/50 px-3 py-4 sm:items-center sm:px-4 sm:py-8"
      onClick={handleCloseModal}
    >
      <div
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl sm:max-h-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-stone-950">發佈美食情報</h2>
            <p className="mt-1 text-sm text-stone-500">
              新增後會寫入 Supabase；未設定環境變數時會顯示錯誤。
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="rounded-md px-3 py-2 text-sm text-stone-500 hover:bg-stone-100"
          >
            關閉
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-5">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">基本情報</h3>
              <p className="mt-1 text-xs text-stone-500">先填寫店家與情報標題。</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-stone-700">
                店家名稱
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                  placeholder="例：阿春炸物"
                />
              </label>

              <label className="block text-sm font-medium text-stone-700">
                吸睛標題
                <input
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                  placeholder="例：今日限定雞排買一送一"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 border-t border-stone-200 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">地點與分類</h3>
              <p className="mt-1 text-xs text-stone-500">
                讓大家更快找到正確地點與類型。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium text-stone-700">
                縣市
                <select
                  name="city"
                  className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-stone-700">
                行政區
                <select
                  name="district"
                  className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                  value={form.district}
                  onChange={(event) =>
                    updateField("district", event.target.value)
                  }
                >
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-stone-700">
                類別
                <select
                  name="category"
                  className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-stone-700">
              地址
              <input
                name="address"
                type="text"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                placeholder="例：台北市大安區..."
              />
            </label>
          </section>

          <section className="space-y-4 border-t border-stone-200 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">圖片來源</h3>
              <p className="mt-1 text-xs text-stone-500">
                目前使用：{imageSourceLabel}
                {selectedFile ? "（本機圖片優先）" : ""}
              </p>
            </div>

            <label className="block text-sm font-medium text-stone-700">
              圖片 URL
              <input
                name="img"
                type="url"
                value={form.img}
                onChange={(event) => {
                  updateField("img", event.target.value);
                  setIsPreviewLoadFailed(false);
                }}
                className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-red-500"
                placeholder="https://..."
              />
              {selectedFile ? (
                <span className="mt-1 block text-xs font-normal text-amber-700">
                  已選擇本機圖片，送出時會優先使用本機圖片。
                </span>
              ) : null}
            </label>

            <label className="block text-sm font-medium text-stone-700">
              上傳本機圖片
              <input
                ref={fileInputRef}
                name="imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFileChange}
                className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
              />
              <span className="mt-1 block text-xs font-normal text-stone-500">
                支援 JPG、PNG、WebP，最大 5MB。若選擇本機圖片，會優先使用上傳圖片。
              </span>
            </label>
          </section>

          {previewUrl ? (
            <div className="space-y-2 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-stone-700">圖片預覽</p>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                  {imageSourceLabel}
                </span>
              </div>
              <img
                src={previewUrl}
                alt="圖片預覽"
                className="h-48 w-full rounded-md object-cover"
                onError={(event) => {
                  setIsPreviewLoadFailed(true);
                  event.currentTarget.src = "/placeholder-food.jpg";
                }}
              />
              {isPreviewLoadFailed && !selectedFile ? (
                <p className="text-xs text-amber-700">
                  目前無法載入此 URL 預覽，仍可送出，卡片會自動 fallback 顯示預設圖片。
                </p>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-stone-200 pt-5">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              關閉
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isUploadingImage
                ? "圖片上傳中..."
                : isSubmittingPost
                  ? "發佈中..."
                  : isSubmitting
                    ? "送出中..."
                    : "送出"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
