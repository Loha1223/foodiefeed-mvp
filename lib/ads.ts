import { getSupabaseClient } from "@/lib/supabaseClient";
import type { SponsoredPost } from "@/types/foodie";

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

type SponsoredPostFilters = {
  city?: string;
  district?: string;
  category?: string;
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
