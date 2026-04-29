"use client";

import type { Post } from "@/types/foodie";
import { getExpiryLabel } from "@/lib/time";

type AdminPanelProps = {
  isOpen: boolean;
  posts: Post[];
  onDeletePost: (postId: number) => void;
};

export function AdminPanel({ isOpen, posts, onDeletePost }: AdminPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-950">管理後台</h2>
            <p className="text-sm text-stone-500">
              第一階段僅提供前端暫存刪除。
            </p>
          </div>
          <p className="text-sm text-stone-500">共 {posts.length} 筆資料</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-stone-200">
          {posts.length === 0 ? (
            <div className="bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              目前沒有情報資料
            </div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {posts.map((post) => (
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
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeletePost(post.id)}
                    className="w-fit rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
