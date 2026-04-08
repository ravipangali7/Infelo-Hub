import { useEffect } from "react";

const MARKER = "data-infelo-analytics";

function collectInjectableNodes(root: ParentNode): { scripts: HTMLScriptElement[]; noscripts: HTMLElement[] } {
  const scripts: HTMLScriptElement[] = [];
  const noscripts: HTMLElement[] = [];

  const walk = (parent: ParentNode) => {
    parent.childNodes.forEach((node) => {
      if (node.nodeName === "SCRIPT") {
        scripts.push(node as HTMLScriptElement);
      } else if (node.nodeName === "NOSCRIPT") {
        noscripts.push(node as HTMLElement);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        walk(node as HTMLElement);
      }
    });
  };

  walk(root);
  return { scripts, noscripts };
}

/**
 * Parses HTML from site settings and injects <script> into document.head and <noscript> into document.body.
 * Scripts execute (unlike React innerHTML). Cleanup removes injected nodes on unmount or snippet change.
 */
export function SiteAnalyticsScripts({ html }: { html?: string | null }) {
  useEffect(() => {
    const snippet = (html ?? "").trim();
    if (!snippet) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(snippet, "text/html");
    const { scripts, noscripts } = collectInjectableNodes(doc.body);

    const injected: HTMLElement[] = [];

    for (const old of scripts) {
      const s = document.createElement("script");
      s.setAttribute(MARKER, "1");
      for (const attr of Array.from(old.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }
      s.textContent = old.textContent;
      document.head.appendChild(s);
      injected.push(s);
    }

    for (const ns of noscripts) {
      const clone = ns.cloneNode(true) as HTMLElement;
      clone.setAttribute(MARKER, "1");
      document.body.appendChild(clone);
      injected.push(clone);
    }

    return () => {
      injected.forEach((el) => el.remove());
    };
  }, [html]);

  return null;
}
