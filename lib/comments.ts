import { getSupabaseClient } from "@/lib/supabaseClient";
import type { Comment } from "@/types/foodie";

const SUPABASE_NOT_CONFIGURED_MESSAGE = "Supabase env is not configured";

function getClientOrThrow() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  }

  return supabase;
}

export async function fetchCommentsByPostId(
  postId: number,
): Promise<Comment[]> {
  const supabase = getClientOrThrow();

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Comment[];
}

export async function createComment(
  postId: number,
  content: string,
  userName = "訪客",
): Promise<Comment> {
  const supabase = getClientOrThrow();
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("留言內容不可空白");
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_name: userName.trim() || "訪客",
      content: trimmedContent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Comment;
}
