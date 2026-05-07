"use client";

import { useState, type MouseEvent } from "react";
import type { Post } from "@/types/foodie";
import { getExpiryLabel, getExpiryTone, isExpired } from "@/lib/time";

type PostCardProps = {
  post: Post;
  onClick: (post: Post) => void;
  onLike: (post: Post) => void;
};

export function PostCard({ post, onClick, onLike }: PostCardProps) {
  const expired = isExpired(post.expiry);
  const expiryTone = getExpiryTone(post.expiry);
  const commentCount = post.comment_count ?? 0;
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const categoryLabel = post.category === "other" ? "其他" : post.category;
  const expiryBadgeClass =
    expiryTone === "expired"
      ? "bg-stone-500"
      : expiryTone === "ending_soon"
        ? "bg-amber-600"
        : "bg-red-600";

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
      className={`group overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition duration-200 ${
        expired
          ? "border-stone-300 bg-stone-50 opacity-70"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
      }`}
      aria-disabled={expired}
    >
      <div className="relative overflow-hidden bg-stone-100">
        {!isImageLoaded ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-100 to-stone-200" />
        ) : null}
        <img
          src={post.img || "/placeholder-food.jpg"}
          alt={post.title}
          className={`h-auto min-h-52 w-full object-cover transition duration-300 group-hover:scale-105 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsImageLoaded(true)}
          onError={(event) => {
            setIsImageLoaded(true);
            event.currentTarget.src = "/placeholder-food.jpg";
          }}
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${expiryBadgeClass}`}
        >
          {getExpiryLabel(post.expiry)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-stone-700 shadow-sm">
          {post.district}
        </span>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {categoryLabel}
            </span>
            {expired ? (
              <span className="text-xs font-medium text-stone-500">已過期</span>
            ) : null}
          </div>
          <p className="text-xs font-medium text-red-700">
            {post.city} / {post.district}
          </p>
          <h2 className="text-base font-bold leading-snug text-stone-950 sm:text-lg">
            {post.title}
          </h2>
          <p className="text-sm font-medium text-stone-700">
            {post.name}
          </p>
          <p className="text-sm leading-6 text-stone-500">
            {post.address}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3 text-sm">
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={expired}
            className="rounded-md px-2 py-1 font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:translate-y-0 disabled:hover:bg-transparent"
            aria-label={`${post.title} 按讚`}
          >
            ♥ <span className="tabular-nums">{post.likes}</span>
          </button>
          <span className="text-stone-600">
            留言 <span className="tabular-nums">{commentCount}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
