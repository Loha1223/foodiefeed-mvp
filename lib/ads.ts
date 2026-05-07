import { getSupabaseClient } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/auth";
import { deleteSponsoredAdImageByUrl } from "@/lib/adStorage";
import type {
  CreateSponsoredPostInput,
  SponsoredAdStats,
  SponsoredPost,
  UpdateSponsoredPostInput,
} from "@/types/foodie";

const AD_SESSION_STORAGE_KEY = "foodiefeed_ad_session_id";
const MAX_TRACKING_PAGE_PATH_LENGTH = 300;
const MAX_TRACKING_TARGET_URL_LENGTH = 500;
const MAX_TRACKING_SESSION_ID_LENGTH = 120;
const MAX_TRACKING_METADATA_LENGTH = 1000;
const ALLOWED_TRACKING_PLACEMENTS = new Set(["feed", "hero", "detail"]);

export type SponsoredPostStatus =
  | "active"
  | "scheduled"
  | "ended"
  | "disabled";

type SponsoredPostRow = {
  id: number;
  created_at: string;
  title: string;
  brand_name: string;
  description: string | null;
  image_url: string | null;
  target_url: string | null;
  city: string | null;
  district: string | null;
  category: string | null;
  placement: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean | null;
  priority: number | null;
};

type SponsoredAdStatsRow = {
  id: number;
  title: string;
  brand_name: string;
  placement: string | null;
  is_active: boolean | null;
  starts_at: string | null;
  ends_at: string;
  impressions: number | string | null;
  clicks: number | string | null;
  ctr_percent: number | string | null;
};

type SponsoredPostFilters = {
  city?: string;
  district?: string;
  category?: string;
  placement?: "feed" | "hero" | "detail";
};

type TrackAdImpressionInput = {
  adId: number;
  placement?: string;
  pagePath?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

type TrackAdClickInput = TrackAdImpressionInput & {
  targetUrl?: string;
};

function toSponsoredPost(row: SponsoredPostRow): SponsoredPost {
  return {
    id: row.id,
    created_at: row.created_at,
    title: row.title,
    brand_name: row.brand_name,
    description: row.description,
    image_url: row.image_url,
    target_url: row.target_url,
    city: row.city,
    district: row.district,
    category: row.category,
    placement: row.placement ?? "feed",
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: row.is_active ?? false,
    priority: row.priority ?? 0,
  };
}

function getClientOrThrow() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase env is not configured");
  }

  return supabase;
}

function normalizeOptionalText(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSponsoredPostInput(
  input: CreateSponsoredPostInput | UpdateSponsoredPostInput,
): string | null {
  if (input.brand_name !== undefined && !input.brand_name.trim()) {
    return "請輸入品牌名稱";
  }

  if (input.title !== undefined && !input.title.trim()) {
    return "請輸入廣告標題";
  }

  if (input.ends_at !== undefined && !input.ends_at.trim()) {
    return "請設定結束時間";
  }

  const startsAt = input.starts_at?.trim()
    ? new Date(input.starts_at).getTime()
    : null;
  const endsAt = input.ends_at?.trim()
    ? new Date(input.ends_at).getTime()
    : null;

  if (endsAt !== null && Number.isNaN(endsAt)) {
    return "結束時間格式不正確";
  }

  if (startsAt !== null && Number.isNaN(startsAt)) {
    return "開始時間格式不正確";
  }

  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
    return "結束時間必須晚於開始時間";
  }

  if (input.target_url?.trim() && !isValidHttpUrl(input.target_url.trim())) {
    return "target_url 必須是有效的 http:// 或 https:// URL";
  }

  if (input.image_url?.trim() && !isValidHttpUrl(input.image_url.trim())) {
    return "image_url 必須是有效的 http:// 或 https:// URL";
  }

  if (
    input.priority !== undefined &&
    (typeof input.priority !== "number" || !Number.isFinite(input.priority))
  ) {
    return "priority 必須是數字";
  }

  return null;
}

function buildSponsoredPostPayload(
  input: CreateSponsoredPostInput | UpdateSponsoredPostInput,
) {
  const payload: Record<string, string | number | boolean | null> = {};

  if (input.title !== undefined) {
    payload.title = input.title.trim();
  }

  if (input.brand_name !== undefined) {
    payload.brand_name = input.brand_name.trim();
  }

  if (input.description !== undefined) {
    payload.description = normalizeOptionalText(input.description);
  }

  if (input.image_url !== undefined) {
    payload.image_url = normalizeOptionalText(input.image_url);
  }

  if (input.target_url !== undefined) {
    payload.target_url = normalizeOptionalText(input.target_url);
  }

  if (input.city !== undefined) {
    payload.city = normalizeOptionalText(input.city);
  }

  if (input.district !== undefined) {
    payload.district = normalizeOptionalText(input.district);
  }

  if (input.category !== undefined) {
    payload.category = normalizeOptionalText(input.category);
  }

  if (input.placement !== undefined) {
    payload.placement = input.placement.trim() || "feed";
  }

  if (input.starts_at !== undefined) {
    payload.starts_at = input.starts_at.trim()
      ? new Date(input.starts_at).toISOString()
      : new Date().toISOString();
  }

  if (input.ends_at !== undefined) {
    payload.ends_at = new Date(input.ends_at).toISOString();
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  if (input.priority !== undefined) {
    payload.priority = Number.isFinite(input.priority) ? input.priority : 0;
  }

  return payload;
}

export function getSponsoredPostStatus(
  ad: Pick<SponsoredPost, "is_active" | "starts_at" | "ends_at">,
): SponsoredPostStatus {
  if (!ad.is_active) {
    return "disabled";
  }

  const now = Date.now();
  const startsAt = new Date(ad.starts_at).getTime();
  const endsAt = new Date(ad.ends_at).getTime();

  if (now < startsAt) {
    return "scheduled";
  }

  if (now > endsAt) {
    return "ended";
  }

  return "active";
}

export function getSponsoredPostStatusLabel(status: SponsoredPostStatus) {
  if (status === "active") {
    return "投放中";
  }

  if (status === "scheduled") {
    return "尚未開始";
  }

  if (status === "ended") {
    return "已結束";
  }

  return "停用";
}

function buildNullOrEqualsFilter(column: string, value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return `${column}.is.null,${column}.eq.`;
  }

  return `${column}.is.null,${column}.eq.,${column}.eq.${trimmedValue}`;
}

function truncateTrackingText(value: string | undefined, maxLength: number) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.slice(0, maxLength);
}

function normalizeTrackingPlacement(placement: string | undefined) {
  const normalizedPlacement = placement?.trim() || "feed";
  return ALLOWED_TRACKING_PLACEMENTS.has(normalizedPlacement)
    ? normalizedPlacement
    : "feed";
}

function sanitizeTrackingMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return {};
  }

  try {
    const serializedMetadata = JSON.stringify(metadata);

    if (serializedMetadata.length <= MAX_TRACKING_METADATA_LENGTH) {
      return metadata;
    }
  } catch {
    return {};
  }

  return { truncated: true };
}

function buildTrackingPayload(input: TrackAdImpressionInput) {
  return {
    ad_id: input.adId,
    placement: normalizeTrackingPlacement(input.placement),
    page_path: truncateTrackingText(
      input.pagePath,
      MAX_TRACKING_PAGE_PATH_LENGTH,
    ),
    session_id: truncateTrackingText(
      input.sessionId,
      MAX_TRACKING_SESSION_ID_LENGTH,
    ),
    metadata: sanitizeTrackingMetadata(input.metadata),
  };
}

export async function fetchActiveSponsoredPosts(
  filters: SponsoredPostFilters = {},
): Promise<SponsoredPost[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase env is not configured");
    return [];
  }

  const now = new Date().toISOString();
  const placement = filters.placement ?? "feed";

  let query = supabase
    .from("sponsored_posts")
    .select("*")
    .eq("is_active", true)
    .eq("placement", placement)
    .lte("starts_at", now)
    .gte("ends_at", now);

  if (filters.city?.trim()) {
    query = query.or(buildNullOrEqualsFilter("city", filters.city));
  }

  if (filters.district?.trim()) {
    query = query.or(buildNullOrEqualsFilter("district", filters.district));
  }

  if (filters.category && filters.category !== "all") {
    query = query.or(buildNullOrEqualsFilter("category", filters.category));
  }

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`Failed to fetch sponsored posts: ${error.message}`);
    return [];
  }

  return ((data ?? []) as SponsoredPostRow[]).map(toSponsoredPost);
}

export async function fetchAllSponsoredPosts(): Promise<SponsoredPost[]> {
  const supabase = getClientOrThrow();

  const { data, error } = await supabase
    .from("sponsored_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SponsoredPostRow[]).map(toSponsoredPost);
}

export async function createSponsoredPost(
  input: CreateSponsoredPostInput,
): Promise<SponsoredPost> {
  const validationError = validateSponsoredPostInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getClientOrThrow();
  const payload = {
    ...buildSponsoredPostPayload(input),
    placement: input.placement?.trim() || "feed",
    is_active: input.is_active ?? true,
    priority: input.priority ?? 0,
  };

  const { data, error } = await supabase
    .from("sponsored_posts")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toSponsoredPost(data as SponsoredPostRow);
}

export async function updateSponsoredPost(
  id: number,
  input: UpdateSponsoredPostInput,
): Promise<SponsoredPost> {
  const validationError = validateSponsoredPostInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getClientOrThrow();
  const payload = buildSponsoredPostPayload(input);

  const { data: existingData, error: existingError } = await supabase
    .from("sponsored_posts")
    .select("image_url")
    .eq("id", id)
    .single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const oldImageUrl = (existingData as Pick<SponsoredPostRow, "image_url">)
    .image_url;

  const { data, error } = await supabase
    .from("sponsored_posts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const updatedSponsoredPost = toSponsoredPost(data as SponsoredPostRow);

  // DB update is the source of truth. If old image cleanup fails, keep the
  // updated ad and leave cleanup for later manual/orphan maintenance.
  if (oldImageUrl && updatedSponsoredPost.image_url !== oldImageUrl) {
    try {
      await deleteSponsoredAdImageByUrl(oldImageUrl);
    } catch (cleanupError) {
      console.warn(
        cleanupError instanceof Error
          ? `Sponsored ad image cleanup failed: ${cleanupError.message}`
          : "Sponsored ad image cleanup failed",
      );
    }
  }

  return updatedSponsoredPost;
}

export async function toggleSponsoredPostActive(
  id: number,
  isActive: boolean,
): Promise<SponsoredPost> {
  const supabase = getClientOrThrow();

  const { data, error } = await supabase
    .from("sponsored_posts")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toSponsoredPost(data as SponsoredPostRow);
}

export async function deleteSponsoredPost(id: number): Promise<void> {
  const supabase = getClientOrThrow();

  const { data, error } = await supabase
    .from("sponsored_posts")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const deletedSponsoredPost = toSponsoredPost(data as SponsoredPostRow);

  // DB delete has already succeeded. Storage cleanup is best-effort so the UI
  // should not rollback a deleted ad if Storage remove is denied or unavailable.
  try {
    await deleteSponsoredAdImageByUrl(deletedSponsoredPost.image_url);
  } catch (cleanupError) {
    console.warn(
      cleanupError instanceof Error
        ? `Sponsored ad image cleanup failed: ${cleanupError.message}`
        : "Sponsored ad image cleanup failed",
    );
  }
}

async function getTrackingUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch (error) {
    console.warn(
      error instanceof Error
        ? `Failed to resolve ad tracking user: ${error.message}`
        : "Failed to resolve ad tracking user",
    );
    return null;
  }
}

export function getOrCreateAdSessionId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const existingSessionId = window.localStorage.getItem(
      AD_SESSION_STORAGE_KEY,
    );

    if (existingSessionId) {
      return existingSessionId.slice(0, MAX_TRACKING_SESSION_ID_LENGTH);
    }

    const sessionId = `ad_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`.slice(0, MAX_TRACKING_SESSION_ID_LENGTH);
    window.localStorage.setItem(AD_SESSION_STORAGE_KEY, sessionId);
    return sessionId;
  } catch (error) {
    console.warn(
      error instanceof Error
        ? `Failed to access ad session storage: ${error.message}`
        : "Failed to access ad session storage",
    );
    return undefined;
  }
}

export async function trackAdImpression(
  input: TrackAdImpressionInput,
): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase env is not configured");
    return;
  }

  const userId = await getTrackingUserId();
  const trackingPayload = buildTrackingPayload(input);
  const { error } = await supabase.from("ad_impressions").insert({
    ...trackingPayload,
    user_id: userId,
  });

  if (error) {
    console.warn(`Failed to track ad impression: ${error.message}`);
  }
}

export async function trackAdClick(input: TrackAdClickInput): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase env is not configured");
    return;
  }

  const userId = await getTrackingUserId();
  const trackingPayload = buildTrackingPayload(input);
  const { error } = await supabase.from("ad_clicks").insert({
    ...trackingPayload,
    target_url: truncateTrackingText(
      input.targetUrl,
      MAX_TRACKING_TARGET_URL_LENGTH,
    ),
    user_id: userId,
  });

  if (error) {
    console.warn(`Failed to track ad click: ${error.message}`);
  }
}

export async function fetchSponsoredAdStats(): Promise<SponsoredAdStats[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase env is not configured");
  }

  const { data, error } = await supabase.rpc("get_sponsored_ad_stats");

  if (error) {
    if (error.message.includes("admin_required")) {
      throw new Error("你沒有管理員權限");
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as SponsoredAdStatsRow[]).map((row) => {
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const ctrPercent = Number(row.ctr_percent ?? 0);

    return {
      id: row.id,
      title: row.title,
      brand_name: row.brand_name,
      placement: row.placement,
      is_active: row.is_active ?? false,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      impressions: Number.isFinite(impressions) ? impressions : 0,
      clicks: Number.isFinite(clicks) ? clicks : 0,
      ctr_percent: Number.isFinite(ctrPercent) ? ctrPercent : 0,
    };
  });
}
