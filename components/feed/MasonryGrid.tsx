"use client";

import type { Post } from "@/types/foodie";
import { PostCard } from "./PostCard";

type MasonryGridProps = {
  isLoading?: boolean;
  posts: Post[];
  onPostClick: (post: Post) => void;
  onPostLike: (post: Post) => void;
};

export function MasonryGrid({
  isLoading = false,
  posts,
  onPostClick,
  onPostLike,
}: MasonryGridProps) {
  const sectionTitle = "探索限時美食情報";
  const sectionDescription = "點擊卡片可查看詳情、留言與即時互動。";

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-stone-950">{sectionTitle}</h2>
          <p className="mt-1 text-sm text-stone-500">{sectionDescription}</p>
        </div>
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="mb-5 break-inside-avoid overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
            >
              <div className="h-56 animate-pulse bg-gradient-to-br from-stone-100 to-stone-200" />
              <div className="space-y-3 p-4 sm:p-5">
                <div className="h-4 w-20 animate-pulse rounded bg-stone-200" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-stone-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
                <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-stone-200" />
                <div className="border-t border-stone-200 pt-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-stone-950">{sectionTitle}</h2>
          <p className="mt-1 text-sm text-stone-500">{sectionDescription}</p>
        </div>
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-stone-500">
          目前沒有符合條件的情報，請調整搜尋或篩選條件後再試。也可以發佈第一篇情報，分享最新美食動態。
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-stone-950">{sectionTitle}</h2>
        <p className="mt-1 text-sm text-stone-500">{sectionDescription}</p>
      </div>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {posts.map((post) => (
          <div key={post.id} className="mb-5 break-inside-avoid">
            <PostCard
              post={post}
              onClick={onPostClick}
              onLike={onPostLike}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
