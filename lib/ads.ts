import { getSupabaseClient } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/auth";
import type {
  CreateSponsoredPostInput,
  SponsoredAdStats,
  SponsoredPost,
  UpdateSponsoredPostInput,
} from "@/types/foodie";

const AD_SESSION_STORAGE_KEY = "foodiefeed_ad_session_id";
const AD_STATS_TRACKING_LIMIT = 5000;

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

type SponsoredAdStatsPostRow = {
  id: number;
  title: string;
  brand_name: string;
  placement: string | null;
  starts_at: string | null;
  ends_at: string;
  is_active: boolean | null;
};

type AdTrackingAdIdRow = {
  ad_id: number | null;
};

type SponsoredPostFilters = {
  city?: string;
  district?: string;
  category?: string;
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

function validateSponsoredPostInput(input: CreateSponsoredPostInput) {
  if (!input.brand_name.trim()) {
    throw new Error("請輸入品牌名稱");
  }

  if (!input.title.trim()) {
    throw new Error("請輸入廣告標題");
  }

  if (!input.ends_at.trim()) {
    throw new Error("請設定結束時間");
  }

  const startsAt = input.starts_at?.trim()
    ? new Date(input.starts_at).getTime()
    : null;
  const endsAt = new Date(input.ends_at).getTime();

  if (Number.isNaN(endsAt)) {
    throw new Error("結束時間格式不正確");
  }

  if (startsAt !== null && Number.isNaN(startsAt)) {
    throw new Error("開始時間格式不正確");
  }

  if (startsAt !== null && endsAt <= startsAt) {
    throw new Error("結束時間必須晚於開始時間");
  }
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

function buildNullOrEqualsFilter(column: string, value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return `${column}.is.null`;
  }

  return `${column}.is.null,${column}.eq.${trimmedValue}`;
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

  let query = supabase
    .from("sponsored_posts")
    .select("*")
    .eq("is_active", true)
    .eq("placement", "feed")
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
  validateSponsoredPostInput(input);
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
  const supabase = getClientOrThrow();
  const payload = buildSponsoredPostPayload(input);

  const { data, error } = await supabase
    .from("sponsored_posts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toSponsoredPost(data as SponsoredPostRow);
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

  const { error } = await supabase
    .from("sponsored_posts")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
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
      return existingSessionId;
    }

    const sessionId = `ad_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
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
  const { error } = await supabase.from("ad_impressions").insert({
    ad_id: input.adId,
    placement: input.placement ?? "feed",
    page_path: input.pagePath,
    user_id: userId,
    session_id: input.sessionId,
    metadata: input.metadata ?? {},
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
  const { error } = await supabase.from("ad_clicks").insert({
    ad_id: input.adId,
    placement: input.placement ?? "feed",
    page_path: input.pagePath,
    target_url: input.targetUrl,
    user_id: userId,
    session_id: input.sessionId,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn(`Failed to track ad click: ${error.message}`);
  }
}

function countTrackingRows(rows: AdTrackingAdIdRow[]): Record<number, number> {
  return rows.reduce<Record<number, number>>((counts, row) => {
    if (row.ad_id === null) {
      return counts;
    }

    counts[row.ad_id] = (counts[row.ad_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function fetchSponsoredAdStats(): Promise<SponsoredAdStats[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase env is not configured");
  }

  const { data: sponsoredPostsData, error: sponsoredPostsError } =
    await supabase
      .from("sponsored_posts")
      .select("id,title,brand_name,placement,starts_at,ends_at,is_active")
      .order("created_at", { ascending: false });

  if (sponsoredPostsError) {
    throw new Error(sponsoredPostsError.message);
  }

  const sponsoredPosts = (sponsoredPostsData ??
    []) as SponsoredAdStatsPostRow[];

  if (sponsoredPosts.length === 0) {
    return [];
  }

  const { data: impressionsData, error: impressionsError } = await supabase
    .from("ad_impressions")
    .select("ad_id")
    .order("created_at", { ascending: false })
    .limit(AD_STATS_TRACKING_LIMIT);

  if (impressionsError) {
    throw new Error(impressionsError.message);
  }

  const { data: clicksData, error: clicksError } = await supabase
    .from("ad_clicks")
    .select("ad_id")
    .order("created_at", { ascending: false })
    .limit(AD_STATS_TRACKING_LIMIT);

  if (clicksError) {
    throw new Error(clicksError.message);
  }

  const impressionCounts = countTrackingRows(
    (impressionsData ?? []) as AdTrackingAdIdRow[],
  );
  const clickCounts = countTrackingRows((clicksData ?? []) as AdTrackingAdIdRow[]);

  return sponsoredPosts.map((post) => {
    const impressions = impressionCounts[post.id] ?? 0;
    const clicks = clickCounts[post.id] ?? 0;
    const ctrPercent =
      impressions === 0 ? 0 : Number(((clicks / impressions) * 100).toFixed(2));

    return {
      id: post.id,
      title: post.title,
      brand_name: post.brand_name,
      placement: post.placement,
      is_active: post.is_active ?? false,
      starts_at: post.starts_at,
      ends_at: post.ends_at,
      impressions,
      clicks,
      ctr_percent: ctrPercent,
    };
  });
}
