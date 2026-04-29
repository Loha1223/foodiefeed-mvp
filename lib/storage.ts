import { getSupabaseClient } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/auth";

const SUPABASE_NOT_CONFIGURED_MESSAGE = "Supabase env is not configured";
const POST_IMAGES_BUCKET = "foodie-post-images";
const PLACEHOLDER_IMAGE_PATH = "/placeholder-food.jpg";
const PUBLIC_STORAGE_PATH_PREFIX = `/storage/v1/object/public/${POST_IMAGES_BUCKET}/`;
const POST_IMAGE_PATH_PREFIX = "posts/";

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

function getSafeImagePath(file: File, userId: string): string {
  const extension = IMAGE_EXTENSIONS[file.type] ?? "jpg";
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `posts/${userId}/${Date.now()}-${randomPart}.${extension}`;
}

function getSupabaseUrlOrThrow(): URL {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  return new URL(supabaseUrl);
}

function getPostImagePathFromPublicUrl(imageUrl: string): string | null {
  const trimmedUrl = imageUrl.trim();

  if (!trimmedUrl || trimmedUrl === PLACEHOLDER_IMAGE_PATH) {
    return null;
  }

  let parsedImageUrl: URL;

  try {
    parsedImageUrl = new URL(trimmedUrl);
  } catch {
    return null;
  }

  if (!parsedImageUrl.pathname.startsWith(PUBLIC_STORAGE_PATH_PREFIX)) {
    return null;
  }

  const supabaseUrl = getSupabaseUrlOrThrow();

  if (parsedImageUrl.host !== supabaseUrl.host) {
    return null;
  }

  const encodedPath = parsedImageUrl.pathname.slice(
    PUBLIC_STORAGE_PATH_PREFIX.length,
  );
  const objectPath = decodeURIComponent(encodedPath);

  if (!objectPath.startsWith(POST_IMAGE_PATH_PREFIX)) {
    return null;
  }

  return objectPath;
}

export async function uploadPostImage(file: File): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("請先登入後再上傳圖片");
  }

  if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
    throw new Error("圖片格式僅支援 JPG、PNG 或 WebP");
  }

  if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
    throw new Error("圖片大小不可超過 5MB");
  }

  const filePath = getSafeImagePath(file, user.id);
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

export async function deletePostImageByUrl(imageUrl: string): Promise<void> {
  const objectPath = getPostImagePathFromPublicUrl(imageUrl);

  if (!objectPath) {
    return;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .remove([objectPath]);

  if (error) {
    throw new Error(error.message);
  }
}
