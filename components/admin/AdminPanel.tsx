"use client";

import type { User } from "@supabase/supabase-js";
import type { Post } from "@/types/foodie";
import { getExpiryLabel } from "@/lib/time";

type AdminPanelProps = {
  mode: "mine" | "admin";
  isOpen: boolean;
  posts: Post[];
  currentUser: User | null;
  isAdmin: boolean;
  isAuthLoading: boolean;
  onDeletePost: (post: Post) => void;
};

export function AdminPanel({
  mode,
  isOpen,
  posts,
  currentUser,
  isAdmin,
  isAuthLoading,
  onDeletePost,
}: AdminPanelProps) {
  if (!isOpen) {
    return null;
  }

  const isMineMode = mode === "mine";
  const visiblePosts =
    mode === "admin"
      ? posts
      : currentUser
        ? posts.filter((post) => post.user_id === currentUser.id)
        : [];
  const title = isMineMode ? "我的情報管理" : "Admin 情報管理";
  const description = isMineMode
    ? "只顯示你自己發佈的情報。"
    : "管理目前前端已載入的情報；完整跨範圍後台會在下一階段擴充。";
  const emptyLabel = isMineMode
    ? "目前還沒有你發佈的情報"
    : "目前沒有任何情報";

  return (
    <section className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-950">{title}</h2>
            <p className="text-sm text-stone-500">{description}</p>
          </div>
          <p className="text-sm text-stone-500">共 {visiblePosts.length} 筆資料</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-stone-200">
          {isAuthLoading ? (
            <div className="bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              登入狀態確認中...
            </div>
          ) : null}

          {!isAuthLoading && !currentUser && isMineMode ? (
            <div className="bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              請先登入後管理自己的投稿
            </div>
          ) : null}

          {!isAuthLoading && mode === "admin" && !isAdmin ? (
            <div className="bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              你沒有管理員權限
            </div>
          ) : null}

          {!isAuthLoading &&
          ((isMineMode && currentUser) || (mode === "admin" && isAdmin)) &&
          visiblePosts.length === 0 ? (
            <div className="bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              {emptyLabel}
            </div>
          ) : null}

          {!isAuthLoading &&
          ((isMineMode && currentUser) || (mode === "admin" && isAdmin)) &&
          visiblePosts.length > 0 ? (
            <ul className="divide-y divide-stone-200">
              {visiblePosts.map((post) => (
                <li
                  key={post.id}
                  className="grid gap-3 bg-white px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-stone-950">{post.title}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {post.name} · {post.city} / {post.district} ·{" "}
                      {getExpiryLabel(post.expiry)}
                    </p>
                    {mode === "admin" ? (
                      <div className="mt-2 grid gap-1 text-xs text-stone-500 sm:grid-cols-2 lg:grid-cols-3">
                        <span>Owner: {post.user_id ?? "無 owner"}</span>
                        <span>
                          建立: {new Date(post.created_at).toLocaleString("zh-TW")}
                        </span>
                        <span>
                          到期: {new Date(post.expiry).toLocaleString("zh-TW")}
                        </span>
                        <span>Likes: {post.likes}</span>
                        <span>留言: {post.comment_count ?? 0}</span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeletePost(post)}
                    className="w-fit rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
