import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PaymentMethodLogo } from "@/components/PaymentMethodLogo";
import type { PaymentMethod } from "@/api/types";

/** Sentinel for "All" in Select - Radix does not allow SelectItem value="" */
const ALL_VALUE = "__all__";

export type FilterField =
  | { type: "text"; name: string; label: string; placeholder?: string }
  | { type: "date"; name: string; label: string }
  | {
      type: "select";
      name: string;
      label: string;
      options: { value: string; label: string; paymentMethodBrand?: boolean }[];
      placeholder?: string;
    };

export interface AdminFilterFormProps {
  title?: string;
  fields: FilterField[];
  searchPlaceholder?: string;
  searchParamName?: string;
}

export function AdminFilterForm({
  title = "Filters",
  fields,
  searchPlaceholder = "Search...",
  searchParamName = "search",
}: AdminFilterFormProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const next = new URLSearchParams(searchParams);
    next.delete("page"); // reset to first page on new search
    const searchInput = form.querySelector<HTMLInputElement>(`[name="${searchParamName}"]`);
    if (searchInput) {
      const v = searchInput.value?.trim();
      if (v) next.set(searchParamName, v);
      else next.delete(searchParamName);
    }
    fields.forEach((f) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${f.name}"]`);
      const v = el?.value?.trim();
      if (v) next.set(f.name, v);
      else next.delete(f.name);
    });
    setSearchParams(next);
  };

  const currentSearch = searchParams.get(searchParamName) ?? "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="text-sm font-medium">{title}</h3>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
        >
          <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto">
            <Label htmlFor={searchParamName} className="sr-only">
              Search
            </Label>
            <Input
              id={searchParamName}
              name={searchParamName}
              placeholder={searchPlaceholder}
              defaultValue={currentSearch}
              className="w-full min-w-0 md:w-48"
            />
          </div>
          {fields.map((field) => (
            <div key={field.name} className="flex w-full min-w-0 flex-col gap-2 md:w-auto">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "text" ? (
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder={field.placeholder}
                  defaultValue={searchParams.get(field.name) ?? ""}
                  className="w-full min-w-0 md:w-40"
                />
              ) : field.type === "date" ? (
                <Input
                  type="date"
                  id={field.name}
                  name={field.name}
                  defaultValue={searchParams.get(field.name) ?? ""}
                  className="w-full min-w-0 md:w-44"
                />
              ) : (
                <Select
                  name={field.name}
                  value={(searchParams.get(field.name) ?? ALL_VALUE) || ALL_VALUE}
                  onValueChange={(value) => {
                    const next = new URLSearchParams(searchParams);
                    if (value && value !== ALL_VALUE) next.set(field.name, value);
                    else next.delete(field.name);
                    next.delete("page");
                    setSearchParams(next);
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 md:w-40">
                    <SelectValue placeholder={field.placeholder ?? field.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.paymentMethodBrand ? (
                          <span className="inline-flex items-center gap-2">
                            <PaymentMethodLogo method={opt.value as PaymentMethod} decorative imgClassName="h-6 max-w-[4.5rem]" />
                            <span className="sr-only">{opt.label}</span>
                          </span>
                        ) : (
                          opt.label
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
          <Button type="submit" className="w-full md:w-auto shrink-0">
            Search
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
