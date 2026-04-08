/// <reference types="vite/client" />

/** Set by Flutter InAppWebView hub shell; used to hide native-only promos. */
declare global {
  interface Window {
    __infeloHubFlutterClient?: boolean;
  }
}

export {};
