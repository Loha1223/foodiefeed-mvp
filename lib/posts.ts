import { getSupabaseClient } from "@/lib/supabaseClient";
import { deletePostImageByUrl } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import type { CreatePostInput, Post } from "@/types/foodie";

const SUPABASE_NOT_CONFIGURED_MESSAGE = "Supabase env is not configured";
const DEFAULT_POST_IMAGE = "/placeholder-food.jpg";
const DEFAULT_POST_CATEGORY = "other";
const POST_EXPIRY_DAYS = 14;

type PostRow = {
  id: number;
  user_id?: string | null;
  created_at: string;
  name: string;
  title: string;
  city: string;
  district: string;
  address: string;
  img: string | null;
  category: string | null;
  likes: number | null;
  expiry: string;
  comment_count?: number | null;
};

type CommentCountRow = {
  post_id: number;
};

function getClientOrThrow() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  return supabase;
}

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    created_at: row.created_at,
    name: row.name,
    title: row.title,
    city: row.city,
    district: row.district,
    address: row.address,
    img: row.img || DEFAULT_POST_IMAGE,
    category: (row.category || DEFAULT_POST_CATEGORY) as Post["category"],
    likes: row.likes ?? 0,
    expiry: row.expiry,
    comment_count: row.comment_count ?? 0,
  };
}

function getDefaultExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + POST_EXPIRY_DAYS);
  return expiry.toISOString();
}

export async function fetchActivePosts(): Promise<Post[]> {
  const supabase = getClientOrThrow();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .gt("expiry", now)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const posts = ((data ?? []) as PostRow[]).map(toPost);

  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((post) => post.id);
  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

  if (commentsError) {
    console.warn(`Failed to fetch comment counts: ${commentsError.message}`);
    return posts.map((post) => ({ ...post, comment_count: 0 }));
  }

  const countMap = ((commentsData ?? []) as CommentCountRow[]).reduce<
    Record<number, number>
  >((counts, comment) => {
    counts[comment.post_id] = (counts[comment.post_id] ?? 0) + 1;
    return counts;
  }, {});

  return posts.map((post) => ({
    ...post,
    comment_count: countMap[post.id] ?? 0,
  }));
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const supabase = getClientOrThrow();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("請先登入後再發佈情報");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      name: input.name,
      title: input.title,
      city: input.city,
      district: input.district,
      address: input.address,
      img: input.img?.trim() || DEFAULT_POST_IMAGE,
      category: input.category?.trim() || DEFAULT_POST_CATEGORY,
      likes: 0,
      expiry: getDefaultExpiry(),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toPost(data as PostRow);
}

export async function incrementPostLike(post: Post): Promise<Post> {
  const supabase = getClientOrThrow();

  const { data, error } = await supabase.rpc("increment_post_likes", {
    post_id: post.id,
  });

  if (error) {
    throw new Error(
      `${error.message}. Please confirm the increment_post_likes RPC migration has been executed.`,
    );
  }

  if (!data) {
    throw new Error(
      "increment_post_likes returned no post. The post may not exist or the RPC migration may not be configured correctly.",
    );
  }

  return toPost(data as PostRow);
}

export async function deletePost(post: Post): Promise<void> {
  const supabase = getClientOrThrow();

  const { error } = await supabase.from("posts").delete().eq("id", post.id);

  if (error) {
    throw new Error(error.message);
  }

  try {
    await deletePostImageByUrl(post.img);
  } catch (cleanupError) {
    // The database delete already succeeded. Rolling back the UI here would
    // show a post that no longer exists, so Storage cleanup failures are logged.
    console.warn(
      cleanupError instanceof Error
        ? cleanupError.message
        : "Failed to clean up post image",
    );
  }
}
