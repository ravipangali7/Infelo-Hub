/** True when the web client is running inside the Infelo Hub Flutter shell. */
export function isInfeloHubFlutterEmbedded(): boolean {
  return typeof window !== "undefined" && Boolean(window.__infeloHubFlutterClient);
}

/** iPhone / iPod / iPad (incl. iPadOS reporting as MacIntel + touch). */
export function isIOSClient(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}
