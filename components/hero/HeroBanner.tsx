"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  getOrCreateAdSessionId,
  trackAdClick,
  trackAdImpression,
} from "@/lib/ads";
import type { Post, SponsoredPost } from "@/types/foodie";

type HeroBannerBaseProps = {
  onDismiss?: () => void;
};

type HeroBannerProps = HeroBannerBaseProps &
  (
    | {
      variant: "sponsored";
      ad: SponsoredPost;
      onCtaClick?: () => void;
    }
    | {
      variant: "post";
      post: Post;
      onPostClick: (post: Post) => void;
    }
  );

const fallbackImage = "/placeholder-food.jpg";

function getPagePath() {
  return typeof window === "undefined" ? undefined : window.location.pathname;
}

export function HeroBanner(props: HeroBannerProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const bannerRef = useRef<HTMLElement | null>(null);
  const hasTrackedImpressionRef = useRef(false);
  const isSponsored = props.variant === "sponsored";
  const sponsoredAd = props.variant === "sponsored" ? props.ad : null;
  const imageUrl = isSponsored
    ? props.ad.image_url || fallbackImage
    : props.post.img || fallbackImage;
  const displayImageUrl = hasImageError ? fallbackImage : imageUrl;

  useEffect(() => {
    setHasImageError(false);
    hasTrackedImpressionRef.current = false;
  }, [isSponsored, isSponsored ? props.ad.id : props.post.id, imageUrl]);

  useEffect(() => {
    if (!sponsoredAd) {
      return;
    }

    const activeSponsoredAd = sponsoredAd;
    const bannerElement = bannerRef.current;

    if (!bannerElement) {
      return;
    }

    function trackImpressionOnce() {
      if (hasTrackedImpressionRef.current) {
        return;
      }

      hasTrackedImpressionRef.current = true;
      void trackAdImpression({
        adId: activeSponsoredAd.id,
        placement: "hero",
        pagePath: getPagePath(),
        sessionId: getOrCreateAdSessionId(),
      });
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

    observer.observe(bannerElement);

    return () => observer.disconnect();
  }, [sponsoredAd]);

  function handleSponsoredCtaClick() {
    if (props.variant !== "sponsored") {
      return;
    }

    props.onCtaClick?.();
    void trackAdClick({
      adId: props.ad.id,
      placement: "hero",
      pagePath: getPagePath(),
      sessionId: getOrCreateAdSessionId(),
      targetUrl: props.ad.target_url ?? undefined,
    });
  }

  function handlePostClick() {
    if (props.variant === "post") {
      props.onPostClick(props.post);
    }
  }

  function handleDismissClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    props.onDismiss?.();
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 sm:pt-4">
      <article
        ref={bannerRef}
        role={props.variant === "post" ? "button" : undefined}
        tabIndex={props.variant === "post" ? 0 : undefined}
        onClick={props.variant === "post" ? handlePostClick : undefined}
        onKeyDown={(event) => {
          if (
            props.variant === "post" &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            handlePostClick();
          }
        }}
        className={`relative grid max-h-none overflow-hidden rounded-lg border shadow-sm md:h-[240px] md:max-h-[260px] md:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] ${
          props.variant === "sponsored"
            ? "border-amber-200 bg-amber-50"
            : "border-stone-200 bg-white"
        } ${props.variant === "post" ? "cursor-pointer hover:shadow-md" : ""}`}
      >
        {props.onDismiss ? (
          <button
            type="button"
            onClick={handleDismissClick}
            className="absolute right-3 top-3 z-20 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-stone-600 shadow-sm transition hover:bg-white hover:text-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
            aria-label="關閉 Hero Banner，本次瀏覽階段不再顯示"
          >
            關閉
          </button>
        ) : null}
        <div className="relative h-44 min-h-0 overflow-hidden bg-stone-100 md:h-full md:min-h-0">
          <img
            src={displayImageUrl}
            alt={
              props.variant === "sponsored" ? props.ad.title : props.post.title
            }
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={() => setHasImageError(true)}
          />
          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${
              props.variant === "sponsored" ? "bg-amber-600" : "bg-red-600"
            }`}
          >
            {props.variant === "sponsored" ? "贊助｜本週推薦" : "熱門情報"}
          </span>
        </div>

        <div className="flex min-h-0 flex-col justify-center gap-3 p-4 sm:p-5 md:overflow-y-auto md:py-4">
          {props.variant === "sponsored" ? (
            <>
              <div className="min-h-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  {props.ad.brand_name}
                </p>
                <h1 className="line-clamp-2 text-lg font-bold leading-snug text-stone-950 sm:text-xl md:text-2xl">
                  {props.ad.title}
                </h1>
                {props.ad.description ? (
                  <p className="line-clamp-2 text-xs leading-5 text-stone-600 sm:text-sm sm:leading-6">
                    {props.ad.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-auto flex flex-shrink-0 flex-wrap items-center gap-2 pt-1">
                {props.ad.target_url ? (
                  <a
                    href={props.ad.target_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleSponsoredCtaClick}
                    className="inline-flex rounded-md bg-stone-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                  >
                    查看活動
                  </a>
                ) : (
                  <p className="text-xs font-medium text-amber-900/80">
                    下滑情報牆瀏覽更多限時內容
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="min-h-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  限時美食情報站
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    {props.post.category === "other"
                      ? "其他"
                      : props.post.category}
                  </span>
                  <span className="text-xs font-semibold text-red-700">
                    {props.post.city} / {props.post.district}
                  </span>
                </div>
                <h1 className="line-clamp-2 text-lg font-bold leading-snug text-stone-950 sm:text-xl md:text-2xl">
                  {props.post.title}
                </h1>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-stone-800">
                    {props.post.name}
                  </p>
                  <p className="line-clamp-2 text-xs leading-5 text-stone-500 sm:text-sm sm:leading-6">
                    {props.post.address}
                  </p>
                </div>
                <p className="line-clamp-2 text-xs text-stone-600 sm:text-sm">
                  探索快閃、限定與在地優惠，現在就掌握最新情報。
                </p>
              </div>

              <div className="mt-auto flex flex-shrink-0 flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePostClick();
                  }}
                  className="inline-flex rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  查看限時情報
                </button>
                <span className="text-xs text-stone-500">或點擊圖片區查看</span>
              </div>
            </>
          )}
        </div>
      </article>
    </section>
  );
}

export function HeroBannerSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 sm:pt-4">
      <div className="grid max-h-none overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm md:h-[240px] md:max-h-[260px] md:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="h-44 animate-pulse bg-gradient-to-br from-stone-100 to-stone-200 md:h-full md:min-h-0" />
        <div className="flex flex-col justify-center space-y-2.5 p-4 sm:p-5 md:py-4">
          <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
          <div className="h-6 w-4/5 animate-pulse rounded bg-stone-200" />
          <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200" />
          <div className="h-8 w-28 animate-pulse rounded bg-stone-200" />
        </div>
      </div>
    </section>
  );
}
