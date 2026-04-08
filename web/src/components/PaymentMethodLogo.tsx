import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/api/types";
import esewaSrc from "@/assets/images/esewa.png";
import khaltiSrc from "@/assets/images/khalti.png";
import bankSrc from "@/assets/images/bank.png";

export const PAYMENT_METHOD_SRC: Partial<Record<PaymentMethod, string>> = {
  esewa: esewaSrc,
  khalti: khaltiSrc,
  bank: bankSrc,
};

/** Labels for screen readers, alt text, and display. */
export const PAYMENT_METHOD_DISPLAY_LABEL: Record<PaymentMethod, string> = {
  esewa: "eSewa",
  khalti: "Khalti",
  bank: "Bank",
  cod: "Cash on Delivery (COD)",
  wallet: "Wallet",
};

type PaymentMethodLogoProps = {
  method: PaymentMethod;
  className?: string;
  /** Classes on the img (e.g. h-8 w-full) */
  imgClassName?: string;
  /** When true (default for standalone logos), img gets a proper alt; when false, alt is empty (decorative next to text). */
  decorative?: boolean;
};

export function PaymentMethodLogo({
  method,
  className,
  imgClassName,
  decorative = false,
}: PaymentMethodLogoProps) {
  const src = PAYMENT_METHOD_SRC[method];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
      {src ? (
        <img
          src={src}
          alt={decorative ? "" : PAYMENT_METHOD_DISPLAY_LABEL[method]}
          className={cn("max-h-full max-w-full object-contain", imgClassName)}
        />
      ) : (
        <span className="text-sm font-medium">{PAYMENT_METHOD_DISPLAY_LABEL[method]}</span>
      )}
    </span>
  );
}

/** Select dropdown row: brand image (if available) + method name. */
export function PaymentMethodSelectOptionContent({ method }: { method: PaymentMethod }) {
  const src = PAYMENT_METHOD_SRC[method];
  return (
    <span className="inline-flex items-center gap-2">
      {src ? (
        <>
          <PaymentMethodLogo method={method} decorative imgClassName="h-7 max-w-[5.5rem]" />
          <span className="sr-only">{PAYMENT_METHOD_DISPLAY_LABEL[method]}</span>
        </>
      ) : (
        <span>{PAYMENT_METHOD_DISPLAY_LABEL[method]}</span>
      )}
    </span>
  );
}
