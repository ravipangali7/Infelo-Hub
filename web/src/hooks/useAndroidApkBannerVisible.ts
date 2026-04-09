import { useEffect, useState } from "react";
import { isInfeloHubFlutterEmbedded, isIOSClient } from "@/lib/clientDevice";

const LG_MAX_PX = 1023;

/** Show the Android APK promo only below the Tailwind lg breakpoint, not on iOS, not in Flutter WebView. */
export function useAndroidApkBannerVisible(androidApkUrl: string): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const trimmed = androidApkUrl.trim();
    if (!trimmed || isInfeloHubFlutterEmbedded()) {
      setVisible(false);
      return;
    }

    const mq = window.matchMedia(`(max-width: ${LG_MAX_PX}px)`);
    const sync = () => {
      setVisible(mq.matches && !isIOSClient());
    };

    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [androidApkUrl]);

  return visible;
}
