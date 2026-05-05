import { getCurrentUser } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";

const SUPABASE_NOT_CONFIGURED_MESSAGE = "Supabase env is not configured";
const SPONSORED_AD_IMAGES_BUCKET = "sponsored-ad-images";

export const ALLOWED_SPONSORED_AD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as readonly string[];

export const MAX_SPONSORED_AD_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getSafeAdImagePath(file: File, userId: string): string {
  const extension = IMAGE_EXTENSIONS[file.type] ?? "jpg";
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `ads/${userId}/${Date.now()}-${randomPart}.${extension}`;
}

export async function uploadSponsoredAdImage(file: File): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("請先登入管理員帳號後再上傳廣告圖片");
  }

  if (!ALLOWED_SPONSORED_AD_IMAGE_TYPES.includes(file.type)) {
    throw new Error("廣告圖片格式僅支援 JPG、PNG 或 WebP");
  }

  if (file.size > MAX_SPONSORED_AD_IMAGE_SIZE_BYTES) {
    throw new Error("廣告圖片大小不可超過 5MB");
  }

  const filePath = getSafeAdImagePath(file, user.id);
  const { error } = await supabase.storage
    .from(SPONSORED_AD_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.includes("row-level security")
        ? "只有管理員可以上傳廣告圖片"
        : error.message,
    );
  }

  const { data } = supabase.storage
    .from(SPONSORED_AD_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
