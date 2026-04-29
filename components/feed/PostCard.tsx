"use client";

import type { MouseEvent } from "react";
import type { Post } from "@/types/foodie";
import { getExpiryLabel, isExpired } from "@/lib/time";

type PostCardProps = {
  post: Post;
  onClick: (post: Post) => void;
  onLike: (post: Post) => void;
};

export function PostCard({ post, onClick, onLike }: PostCardProps) {
  const expired = isExpired(post.expiry);
  const commentCount = post.comment_count ?? 0;

  function handleCardClick() {
    if (!expired) {
      onClick(post);
    }
  }

  function handleLikeClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (!expired) {
      onLike(post);
    }
  }

  return (
    <article
      role={expired ? undefined : "button"}
      tabIndex={expired ? -1 : 0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (!expired && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick(post);
        }
      }}
      className={`overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition duration-200 ${
        expired
          ? "opacity-55"
          : "cursor-pointer hover:-translate-y-1 hover:shadow-md"
      }`}
      aria-disabled={expired}
    >
      <div className="group relative overflow-hidden bg-stone-100">
        <img
          src={post.img || "/placeholder-food.jpg"}
          alt={post.title}
          className="h-auto min-h-52 w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = "/placeholder-food.jpg";
          }}
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${
            expired ? "bg-stone-500" : "bg-red-600"
          }`}
        >
          {getExpiryLabel(post.expiry)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
          {post.district}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs font-medium text-red-700">
            {post.city} / {post.district}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-stone-950">
            {post.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-stone-700">
            {post.name}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            {post.address}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={expired}
            className="rounded-md px-2 py-1 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent"
            aria-label={`${post.title} 按讚`}
          >
            ♥ {post.likes}
          </button>
          <span className="text-stone-500">留言 {commentCount}</span>
        </div>
      </div>
    </article>
  );
}
