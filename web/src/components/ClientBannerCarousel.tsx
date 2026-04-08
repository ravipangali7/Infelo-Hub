import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/api/types";
import { cn } from "@/lib/utils";

const AUTO_MS = 5000;

type ClientBannerCarouselProps = {
  banners: Banner[];
  className?: string;
};

export function ClientBannerCarousel({ banners, className }: ClientBannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = banners.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAuto = useCallback(() => {
    clearTimer();
    if (n <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % n);
    }, AUTO_MS);
  }, [clearTimer, n]);

  useEffect(() => {
    scheduleAuto();
    return clearTimer;
  }, [scheduleAuto, clearTimer]);

  useEffect(() => {
    if (current >= n && n > 0) {
      setCurrent(0);
    }
  }, [current, n]);

  const goTo = useCallback(
    (i: number) => {
      if (n <= 0) return;
      const next = ((i % n) + n) % n;
      setCurrent(next);
      scheduleAuto();
    },
    [n, scheduleAuto]
  );

  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);
  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);

  if (n === 0) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl aspect-video border border-border/50 shadow-sm group",
        className
      )}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => {
          const inner = (
            <div className="relative w-full h-full overflow-hidden bg-muted/30">
              {banner.image_url ? (
                <img src={banner.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-primary/5" aria-hidden />
              )}
            </div>
          );
          const href = banner.link?.trim();
          if (href) {
            if (/^https?:\/\//i.test(href)) {
              return (
                <a
                  key={banner.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-w-full flex-shrink-0 block h-full"
                >
                  {inner}
                </a>
              );
            }
            const to = href.startsWith("/") ? href : `/${href}`;
            return (
              <Link key={banner.id} to={to} className="w-full min-w-full flex-shrink-0 block h-full">
                {inner}
              </Link>
            );
          }
          return (
            <div key={banner.id} className="w-full min-w-full flex-shrink-0 h-full">
              {inner}
            </div>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-opacity hover:bg-black/50 opacity-90 md:opacity-0 md:group-hover:opacity-90 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Previous banner"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              goNext();
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-opacity hover:bg-black/50 opacity-90 md:opacity-0 md:group-hover:opacity-90 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Next banner"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  goTo(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
