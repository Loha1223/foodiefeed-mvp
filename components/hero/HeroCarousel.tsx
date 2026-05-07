"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from "react";
import {
  getOrCreateAdSessionId,
  trackAdClick,
  trackAdImpression,
} from "@/lib/ads";
import type { SponsoredPost } from "@/types/foodie";

type HeroCarouselProps = {
  ads: SponsoredPost[];
  onDismiss: () => void;
};

const fallbackImage = "/placeholder-food.jpg";
const rotationIntervalMs = 5000;

function getPagePath() {
  return typeof window === "undefined" ? undefined : window.location.pathname;
}

export function HeroCarousel({ ads, onDismiss }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [isCarouselVisible, setIsCarouselVisible] = useState(false);
  const trackedImpressionIdsRef = useRef<Set<number>>(new Set());
  const carouselRef = useRef<HTMLElement | null>(null);
  const visibleAds = useMemo(() => ads.slice(0, 3), [ads]);
  const activeAd = visibleAds[activeIndex] ?? visibleAds[0] ?? null;
  const hasMultipleAds = visibleAds.length > 1;
  const displayImageUrl = hasImageError
    ? fallbackImage
    : activeAd?.image_url || fallbackImage;

  useEffect(() => {
    setActiveIndex(0);
    setHasImageError(false);
  }, [visibleAds]);

  useEffect(() => {
    setHasImageError(false);
  }, [activeAd?.id, activeAd?.image_url]);

  useEffect(() => {
    const carouselElement = carouselRef.current;

    if (!carouselElement) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsCarouselVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setIsCarouselVisible(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.5 },
    );

    observer.observe(carouselElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeAd || !isCarouselVisible) {
      return;
    }

    if (trackedImpressionIdsRef.current.has(activeAd.id)) {
      return;
    }

    trackedImpressionIdsRef.current.add(activeAd.id);
    void trackAdImpression({
      adId: activeAd.id,
      placement: "hero",
      pagePath: getPagePath(),
      sessionId: getOrCreateAdSessionId(),
    });
  }, [activeAd, isCarouselVisible]);

  useEffect(() => {
    if (!hasMultipleAds || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % visibleAds.length);
    }, rotationIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [hasMultipleAds, isPaused, visibleAds.length]);

  if (!activeAd) {
    return null;
  }

  function handleDismissClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onDismiss();
  }

  function handlePreviousClick() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? visibleAds.length - 1 : currentIndex - 1,
    );
  }

  function handleNextClick() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % visibleAds.length);
  }

  function handleDotClick(index: number) {
    setActiveIndex(index);
  }

  function handleFocusBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsPaused(false);
    }
  }

  function handleCtaClick() {
    void trackAdClick({
      adId: activeAd.id,
      placement: "hero",
      pagePath: getPagePath(),
      sessionId: getOrCreateAdSessionId(),
      targetUrl: activeAd.target_url ?? undefined,
    });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 sm:pt-4">
      <article
        ref={carouselRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={handleFocusBlur}
        className="relative grid max-h-none overflow-hidden rounded-lg border border-amber-200 bg-amber-50 shadow-sm transition duration-200 md:h-[240px] md:max-h-[260px] md:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]"
        aria-roledescription="carousel"
        aria-label="贊助 Hero 推薦"
      >
        <button
          type="button"
          onClick={handleDismissClick}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-stone-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2"
          aria-label="關閉 Hero Banner，本次瀏覽階段不再顯示"
        >
          關閉
        </button>

        <div className="relative h-44 min-h-0 overflow-hidden bg-amber-100 md:h-full md:min-h-0">
          <img
            src={displayImageUrl}
            alt={activeAd.title}
            className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500"
            onError={() => setHasImageError(true)}
          />
          <span className="absolute left-4 top-4 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            贊助｜本週推薦
          </span>

          {hasMultipleAds ? (
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button
                type="button"
                onClick={handlePreviousClick}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-950"
                aria-label="上一張 Hero 廣告"
              >
                上一張
              </button>
              <button
                type="button"
                onClick={handleNextClick}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-950"
                aria-label="下一張 Hero 廣告"
              >
                下一張
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col justify-center gap-3 p-4 sm:p-5 md:overflow-y-auto md:py-4">
          <div className="min-h-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {activeAd.brand_name}
            </p>
            <h1 className="line-clamp-2 text-lg font-bold leading-snug text-stone-950 sm:text-xl md:text-2xl">
              {activeAd.title}
            </h1>
            {activeAd.description ? (
              <p className="line-clamp-2 text-xs leading-5 text-stone-600 sm:text-sm sm:leading-6">
                {activeAd.description}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-shrink-0 flex-wrap items-center gap-3 pt-1">
            {activeAd.target_url ? (
              <a
                href={activeAd.target_url}
                target="_blank"
                rel="noreferrer"
                onClick={handleCtaClick}
                className="inline-flex rounded-md bg-stone-950 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-md"
              >
                查看活動
              </a>
            ) : (
              <p className="text-xs font-medium text-amber-900/80">
                下滑情報牆瀏覽更多限時內容
              </p>
            )}

            {hasMultipleAds ? (
              <div className="flex items-center gap-2" aria-label="Hero 廣告頁數">
                {visibleAds.map((ad, index) => (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => handleDotClick(index)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === activeIndex
                        ? "bg-stone-950"
                        : "bg-stone-300 hover:bg-stone-500"
                    }`}
                    aria-label={`切換到第 ${index + 1} 張 Hero 廣告`}
                    aria-current={index === activeIndex ? "true" : undefined}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
