import { getSupabaseClient } from "@/lib/supabaseClient";

const SUPABASE_NOT_CONFIGURED_MESSAGE = "Supabase env is not configured";
const POST_IMAGES_BUCKET = "foodie-post-images";

export const ALLOWED_POST_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as readonly string[];

export const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getSafeImagePath(file: File): string {
  const extension = IMAGE_EXTENSIONS[file.type] ?? "jpg";
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `posts/${Date.now()}-${randomPart}.${extension}`;
}

export async function uploadPostImage(file: File): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
    throw new Error("圖片格式僅支援 JPG、PNG 或 WebP");
  }

  if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
    throw new Error("圖片大小不可超過 5MB");
  }

  const filePath = getSafeImagePath(file);
  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(POST_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
