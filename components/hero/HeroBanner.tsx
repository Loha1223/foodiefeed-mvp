"use client";

import { useEffect, useRef, useState } from "react";
import {
  getOrCreateAdSessionId,
  trackAdClick,
  trackAdImpression,
} from "@/lib/ads";
import type { Post, SponsoredPost } from "@/types/foodie";

type HeroBannerProps =
  | {
      variant: "sponsored";
      ad: SponsoredPost;
      onCtaClick?: () => void;
    }
  | {
      variant: "post";
      post: Post;
      onPostClick: (post: Post) => void;
    };

const fallbackImage = "/placeholder-food.jpg";

function getPagePath() {
  return typeof window === "undefined" ? undefined : window.location.pathname;
}

export function HeroBanner(props: HeroBannerProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const bannerRef = useRef<HTMLElement | null>(null);
  const hasTrackedImpressionRef = useRef(false);
  const isSponsored = props.variant === "sponsored";
  const imageUrl = isSponsored
    ? props.ad.image_url || fallbackImage
    : props.post.img || fallbackImage;
  const displayImageUrl = hasImageError ? fallbackImage : imageUrl;

  useEffect(() => {
    setHasImageError(false);
    hasTrackedImpressionRef.current = false;
  }, [isSponsored, isSponsored ? props.ad.id : props.post.id, imageUrl]);

  useEffect(() => {
    if (!isSponsored) {
      return;
    }

    const bannerElement = bannerRef.current;

    if (!bannerElement) {
      return;
    }

    function trackImpressionOnce() {
      if (hasTrackedImpressionRef.current || props.variant !== "sponsored") {
        return;
      }

      hasTrackedImpressionRef.current = true;
      void trackAdImpression({
        adId: props.ad.id,
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
  }, [isSponsored, props]);

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

  return (
    <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
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
        className={`grid overflow-hidden rounded-lg border shadow-sm md:grid-cols-[1.08fr_0.92fr] ${
          props.variant === "sponsored"
            ? "border-amber-200 bg-amber-50"
            : "border-stone-200 bg-white"
        } ${props.variant === "post" ? "cursor-pointer hover:shadow-md" : ""}`}
      >
        <div className="relative min-h-56 overflow-hidden bg-stone-100 md:min-h-72">
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
              <div className="space-y-3">
                <p className="text-sm font-semibold text-amber-800">
                  {props.ad.brand_name}
                </p>
                <h1 className="text-2xl font-bold leading-tight text-stone-950 sm:text-3xl">
                  {props.ad.title}
                </h1>
                {props.ad.description ? (
                  <p className="text-sm leading-6 text-stone-600 sm:text-base">
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
              <div className="space-y-3">
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
                <h1 className="text-2xl font-bold leading-tight text-stone-950 sm:text-3xl">
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
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePostClick();
                }}
                className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                查看情報
              </button>
            </>
          )}
        </div>
      </article>
    </section>
  );
}
