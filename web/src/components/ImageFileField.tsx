import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImageFileFieldProps = {
  id?: string;
  label: string;
  /** Existing image URL from API (e.g. logo_url, image_url). */
  currentUrl?: string | null;
  onFileChange: (file: File | null) => void;
  className?: string;
};

const fileInputClassName =
  "cursor-pointer text-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5";

export function ImageFileField({ id, label, currentUrl, onFileChange, className }: ImageFileFieldProps) {
  const genId = useId();
  const inputId = id ?? `img-file-${genId}`;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    onFileChange(f);
  };

  const displaySrc = objectUrl ?? currentUrl ?? null;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} type="file" accept="image/*" className={fileInputClassName} onChange={handleChange} />
      {displaySrc ? (
        <img src={displaySrc} alt="" className="max-h-40 max-w-full rounded-md border object-contain" />
      ) : null}
    </div>
  );
}
