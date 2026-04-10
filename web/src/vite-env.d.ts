/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_SHARE_BASE_URL?: string;
}

/** Set by Flutter InAppWebView hub shell; used to hide native-only promos. */
declare global {
  interface Window {
    __infeloHubFlutterClient?: boolean;
  }
}

export {};
