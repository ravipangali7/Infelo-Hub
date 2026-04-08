import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DateRange = { from: string; to: string };

const PRESETS: { label: string; days: number }[] = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "1 Year", days: 365 },
];

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function defaultRange(days = 30): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  const applyCustom = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ from: customFrom, to: customTo });
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
      {PRESETS.map((p) => {
        const range = defaultRange(p.days);
        const isActive = value.from === range.from && value.to === range.to;
        return (
          <Button
            key={p.days}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => onChange(range)}
          >
            {p.label}
          </Button>
        );
      })}
      <div className="flex items-center gap-1 ml-auto">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">—</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={applyCustom}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export { defaultRange };
