import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CopyUrlField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* ignore */
    }
  };
  if (!value) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">
          Set <code className="rounded bg-muted px-1">VITE_SHARE_BASE_URL</code> in the web app build (API origin without{" "}
          <code className="rounded bg-muted px-1">/api</code>) to generate this URL.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input readOnly value={value} className="font-mono text-xs sm:flex-1" />
        <Button type="button" variant="outline" className="shrink-0" onClick={copy}>
          {done ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
