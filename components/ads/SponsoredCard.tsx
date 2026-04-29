"use client";

import { useState } from "react";
import type { SponsoredPost } from "@/types/foodie";

type SponsoredCardProps = {
  sponsoredPost: SponsoredPost;
};

export function SponsoredCard({ sponsoredPost }: SponsoredCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageUrl = sponsoredPost.image_url || "/placeholder-food.jpg";

  return (
    <aside className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
      <div className="group relative overflow-hidden bg-amber-100">
        {!isImageLoaded ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-amber-100 to-stone-200" />
        ) : null}
        <img
          src={imageUrl}
          alt={sponsoredPost.title}
          className={`h-auto min-h-48 w-full object-cover transition duration-300 group-hover:scale-105 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsImageLoaded(true)}
          onError={(event) => {
            setIsImageLoaded(true);
            event.currentTarget.src = "/placeholder-food.jpg";
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          贊助
        </span>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-800">
            {sponsoredPost.brand_name}
          </p>
          <h2 className="text-base font-bold leading-snug text-stone-950 sm:text-lg">
            {sponsoredPost.title}
          </h2>
          {sponsoredPost.description ? (
            <p className="text-sm leading-6 text-stone-600">
              {sponsoredPost.description}
            </p>
          ) : null}
        </div>

        {sponsoredPost.target_url ? (
          <div className="border-t border-amber-200 pt-3">
            <a
              href={sponsoredPost.target_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              查看活動
            </a>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
