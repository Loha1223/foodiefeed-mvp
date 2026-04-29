"use client";

import { useEffect, useRef, useState } from "react";
import {
  getOrCreateAdSessionId,
  trackAdClick,
  trackAdImpression,
} from "@/lib/ads";
import type { SponsoredPost } from "@/types/foodie";

type SponsoredCardProps = {
  sponsoredPost: SponsoredPost;
};

export function SponsoredCard({ sponsoredPost }: SponsoredCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const hasTrackedImpressionRef = useRef(false);
  const imageUrl = sponsoredPost.image_url || "/placeholder-food.jpg";

  function getPagePath() {
    return typeof window === "undefined" ? undefined : window.location.pathname;
  }

  function buildTrackingInput() {
    return {
      adId: sponsoredPost.id,
      placement: sponsoredPost.placement || "feed",
      pagePath: getPagePath(),
      sessionId: getOrCreateAdSessionId(),
    };
  }

  function trackImpressionOnce() {
    if (hasTrackedImpressionRef.current) {
      return;
    }

    hasTrackedImpressionRef.current = true;
    void trackAdImpression(buildTrackingInput());
  }

  useEffect(() => {
    hasTrackedImpressionRef.current = false;

    const cardElement = cardRef.current;

    if (!cardElement) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      trackImpressionOnce();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          trackImpressionOnce();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(cardElement);

    return () => observer.disconnect();
  }, [sponsoredPost.id]);

  function handleCtaClick() {
    void trackAdClick({
      ...buildTrackingInput(),
      targetUrl: sponsoredPost.target_url ?? undefined,
    });
  }

  return (
    <aside
      ref={cardRef}
      className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50 shadow-sm"
    >
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
              onClick={handleCtaClick}
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
