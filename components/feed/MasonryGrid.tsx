"use client";

import type { Post } from "@/types/foodie";
import { PostCard } from "./PostCard";

type MasonryGridProps = {
  posts: Post[];
  onPostClick: (post: Post) => void;
  onPostLike: (post: Post) => void;
};

export function MasonryGrid({
  posts,
  onPostClick,
  onPostLike,
}: MasonryGridProps) {
  if (posts.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-stone-500">
          目前沒有符合條件的美食情報
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
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
