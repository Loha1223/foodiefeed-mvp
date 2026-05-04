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
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-5">
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
        className={`relative grid overflow-hidden rounded-lg border shadow-sm md:grid-cols-[1.08fr_0.92fr] ${
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
        <div className="relative min-h-52 overflow-hidden bg-stone-100 md:min-h-72">
          <img
            src={displayImageUrl}
            alt={
              props.variant === "sponsored" ? props.ad.title : props.post.title
            }
            className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-105"
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

        <div className="flex flex-col justify-center gap-4 p-5 sm:p-6 lg:p-7">
          {props.variant === "sponsored" ? (
            <>
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 sm:text-sm">
                  {props.ad.brand_name}
                </p>
                <h1 className="text-xl font-bold leading-tight text-stone-950 sm:text-3xl">
                  {props.ad.title}
                </h1>
                {props.ad.description ? (
                  <p className="text-sm leading-6 text-stone-600">
                    {props.ad.description}
                  </p>
                ) : null}
              </div>

              {props.ad.target_url ? (
                <a
                  href={props.ad.target_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleSponsoredCtaClick}
                  className="w-fit rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  查看活動
                </a>
              ) : null}
            </>
          ) : (
            <>
              <div className="space-y-2.5">
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
                <h1 className="text-xl font-bold leading-tight text-stone-950 sm:text-3xl">
                  {props.post.title}
                </h1>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-stone-800">
                    {props.post.name}
                  </p>
                  <p className="text-sm leading-6 text-stone-500">
                    {props.post.address}
                  </p>
                </div>
                <p className="text-sm text-stone-600">
                  探索快閃、限定與在地優惠，現在就掌握最新情報。
                </p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePostClick();
                }}
                className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                查看限時情報
              </button>
            </>
          )}
        </div>
      </article>
    </section>
  );
}

export function HeroBannerSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
      <div className="grid overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm md:grid-cols-[1.08fr_0.92fr]">
        <div className="min-h-36 animate-pulse bg-gradient-to-br from-stone-100 to-stone-200 sm:min-h-44 md:min-h-52" />
        <div className="space-y-3 p-5 sm:p-6">
          <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          <div className="h-7 w-4/5 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
          <div className="h-9 w-24 animate-pulse rounded bg-stone-200" />
        </div>
      </div>
    </section>
  );
}
