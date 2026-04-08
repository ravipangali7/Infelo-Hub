import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import type { TrackEventPayload } from "@/api/endpoints";

interface TrackerOptions {
  platform?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 5_000;   // flush queue every 5 seconds
const MAX_QUEUE_SIZE = 20;          // flush immediately if queue hits this size
const API_TRACK_URL = (() => {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");
  return `${base}/track/`;
})();

// ── Session helpers ────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem("_track_sid");
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("_track_sid", sid);
  }
  return sid;
}

function getSessionNumber(): number {
  const key = "_track_snum";
  const prev = parseInt(localStorage.getItem(key) || "0", 10);
  if (!sessionStorage.getItem("_track_snum_set")) {
    const next = prev + 1;
    localStorage.setItem(key, String(next));
    sessionStorage.setItem("_track_snum_set", "1");
    return next;
  }
  return prev;
}

function getAuthToken(): string | null {
  try {
    return localStorage.getItem("infelo_token");
  } catch {
    return null;
  }
}

// ── Global event queue (shared across hook instances) ─────────────────────────
// Using a module-level ref so multiple renders don't create multiple queues.

const _queue: TrackEventPayload[] = [];

function enqueue(evt: TrackEventPayload) {
  _queue.push(evt);
}

async function flushQueue(): Promise<void> {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length); // drain atomically
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  try {
    await fetch(API_TRACK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ events: batch }),
      // keepalive ensures the request completes even if the page is unloading
      keepalive: true,
    });
  } catch {
    // Network error — silently discard. Tracking must never affect the UI.
  }
}

/** Called on page unload — uses sendBeacon for reliability, falls back to fetch keepalive. */
function flushOnUnload(): void {
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length);
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  const body = JSON.stringify({ events: batch });

  // sendBeacon is the most reliable way to send data on page unload.
  // It doesn't support custom headers, so we put the token in the body instead.
  const blob = new Blob([JSON.stringify({ events: batch, _token: token })], {
    type: "application/json",
  });
  const sent = navigator.sendBeacon?.(API_TRACK_URL, blob);
  if (!sent) {
    // Fall back to keepalive fetch if sendBeacon fails or isn't available
    fetch(API_TRACK_URL, { method: "POST", headers, body, keepalive: true }).catch(() => {});
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useActivityTracker({ platform = "web" }: TrackerOptions = {}) {
  const location = useLocation();
  const sessionId = useRef(getOrCreateSessionId());
  const sessionNumber = useRef(getSessionNumber());
  const pageEnteredAt = useRef<number>(Date.now());
  const pageClickCount = useRef<number>(0);
  const lastPath = useRef<string>("");
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = useCallback((): Partial<TrackEventPayload> => ({
    platform,
    session_id: sessionId.current,
    session_number: sessionNumber.current,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }), [platform]);

  const push = useCallback((evt: TrackEventPayload) => {
    enqueue(evt);
    if (_queue.length >= MAX_QUEUE_SIZE) {
      flushQueue();
    }
  }, []);

  // ── Flush timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    flushTimer.current = setInterval(flushQueue, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimer.current) clearInterval(flushTimer.current);
      flushQueue(); // flush remaining on unmount
    };
  }, []);

  // ── Page unload ────────────────────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("pagehide", flushOnUnload);
    window.addEventListener("beforeunload", flushOnUnload);
    return () => {
      window.removeEventListener("pagehide", flushOnUnload);
      window.removeEventListener("beforeunload", flushOnUnload);
    };
  }, []);

  // ── Route change → page_view ───────────────────────────────────────────────
  useEffect(() => {
    const path = location.pathname + location.search;
    const title = document.title;
    const url = window.location.href;
    const referrer = document.referrer;

    // Emit page_leave for the previous page
    if (lastPath.current && lastPath.current !== path) {
      const timeOnPage = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      const scrollDepth = Math.min(
        Math.round(
          (window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100
        ),
        100
      );
      push({
        ...base(),
        event_name: "page_leave",
        page_path: lastPath.current,
        page_url: url,
        time_on_page: timeOnPage,
        scroll_depth: scrollDepth,
        clicks_count: pageClickCount.current,
      } as TrackEventPayload);
    }

    // Reset per-page counters
    pageEnteredAt.current = Date.now();
    pageClickCount.current = 0;
    lastPath.current = path;

    push({
      ...base(),
      event_name: "page_view",
      page_path: path,
      page_title: title,
      page_url: url,
      referrer_url: referrer,
    } as TrackEventPayload);
  }, [location, base, push]);

  // ── Global click listener ──────────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      pageClickCount.current += 1;
      const target = e.target as HTMLElement;
      const closest = target.closest<HTMLElement>("[data-track], button, a, [role='button']");
      if (!closest) return;

      const eventName = closest.getAttribute("data-track") || "element_click";
      const label =
        closest.getAttribute("data-track-label") ||
        closest.getAttribute("aria-label") ||
        (closest.textContent?.trim().slice(0, 80) ?? "");
      const href = (closest as HTMLAnchorElement).href || "";

      push({
        ...base(),
        event_name: eventName,
        page_path: location.pathname + location.search,
        page_title: document.title,
        page_url: window.location.href,
        event_value: label,
        event_properties: {
          tag: closest.tagName.toLowerCase(),
          href: href || undefined,
          text: label || undefined,
        },
      } as TrackEventPayload);
    };

    document.addEventListener("click", handleClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [base, location, push]);

  // ── Scroll depth milestones (25 / 50 / 75 / 100 %) ───────────────────────
  useEffect(() => {
    let maxDepth = 0;
    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const depth = Math.min(
          Math.round(
            (window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1)) * 100
          ),
          100
        );
        if (depth >= maxDepth + 25) {
          maxDepth = depth;
          push({
            ...base(),
            event_name: "scroll_depth",
            page_path: location.pathname + location.search,
            page_title: document.title,
            page_url: window.location.href,
            scroll_depth: depth,
          } as TrackEventPayload);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [base, location, push]);

  // ── Tab visibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const timeOnPage = Math.round((Date.now() - pageEnteredAt.current) / 1000);
        push({
          ...base(),
          event_name: "tab_hidden",
          page_path: location.pathname + location.search,
          page_title: document.title,
          page_url: window.location.href,
          time_on_page: timeOnPage,
        } as TrackEventPayload);
        // Flush immediately when hiding — the user may not return
        flushQueue();
      } else {
        pageEnteredAt.current = Date.now();
        push({
          ...base(),
          event_name: "tab_visible",
          page_path: location.pathname + location.search,
          page_title: document.title,
          page_url: window.location.href,
        } as TrackEventPayload);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [base, location, push]);
}
