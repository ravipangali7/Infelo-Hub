import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Plus, CheckCircle2, Truck, Wallet, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAddresses, useWallet, useShippingCharges } from "@/api/hooks";
import { clientApi } from "@/api/endpoints";
import { toast } from "sonner";
import type { Address } from "@/api/types";
import { clearStoredAffiliateRef, getStoredAffiliateRef } from "@/lib/affiliate";

type PaymentOption = "wallet" | "cod";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { data: addressData, isLoading: addressLoading } = useAddresses();
  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: shippingData } = useShippingCharges();
  const addresses: Address[] = addressData?.results ?? [];
  const shippingCharges = shippingData?.results ?? [];

  const topupBalance = walletData?.topup_wallet ?? 0;

  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>("cod");
  const selectedAddressObj = addresses.find((addr) => addr.id === selectedAddress) ?? null;
  const shippingCharge = Number(
    shippingCharges.find((row) => row.city === selectedAddressObj?.city)?.charge ?? 0
  );
  const grandTotal = subtotal + shippingCharge;
  const hasEnoughBalance = topupBalance >= grandTotal;

  // Auto-select wallet when balance is confirmed sufficient
  useEffect(() => {
    if (!walletLoading && hasEnoughBalance) {
      setPaymentMethod("wallet");
    }
  }, [walletLoading, hasEnoughBalance]);

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () => {
      if (!selectedAddress) throw new Error("Please select a delivery address.");
      if (items.length === 0) throw new Error("Your cart is empty.");
      const affiliateRef = getStoredAffiliateRef();
      return clientApi.createOrder({
        address: selectedAddress,
        payment_method: paymentMethod,
        items: items.map((i) => ({ product: i.product.id, quantity: i.quantity })),
        ...(affiliateRef != null ? { affiliate_user_id: affiliateRef } : {}),
      });
    },
    onSuccess: (order) => {
      clearCart();
      clearStoredAffiliateRef();
      toast.success("Order placed!", { description: `Order #${order.id} is confirmed.` });
      navigate(`/orders/${order.id}`);
    },
    onError: (err: Error) => {
      toast.error("Failed to place order", { description: err.message });
    },
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild>
          <Link to="/shop">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const shortfall = grandTotal - topupBalance;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center bg-background/80 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold font-display">Checkout</h1>
      </header>

      <div className="client-page-container client-page-content pt-20 pb-52 lg:pb-36 space-y-6">
        {/* Delivery Address */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Delivery Address
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/addresses">
                <Plus className="w-4 h-4 mr-1" />
                Add New
              </Link>
            </Button>
          </div>

          {addressLoading ? (
            <div className="space-y-2">
              {[1, 2].map((n) => (
                <div key={n} className="h-20 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="floating-card p-4 text-center">
              <p className="text-muted-foreground text-sm">No saved addresses.</p>
              <Button variant="link" size="sm" asChild>
                <Link to="/addresses">Add an address</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => {
                const isSelected = selectedAddress === addr.id;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddress(addr.id)}
                    className={`w-full text-left floating-card p-4 flex gap-3 items-start transition-all ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{addr.name}</p>
                      <p className="text-muted-foreground text-xs">{addr.phone}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {[addr.address, addr.city_name, addr.district, addr.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Payment Method */}
        <section>
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            Payment Method
          </h2>

          {walletLoading ? (
            <div className="h-24 rounded-2xl bg-muted animate-pulse" />
          ) : (
            <div className="space-y-2">
              {/* Wallet option */}
              {hasEnoughBalance ? (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  className={`w-full text-left floating-card p-4 flex items-center gap-3 transition-all ${
                    paymentMethod === "wallet" ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMethod === "wallet" ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}
                  >
                    {paymentMethod === "wallet" && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Pay from Wallet</p>
                    <p className="text-xs text-muted-foreground">
                      Balance: रु {topupBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Instant
                  </span>
                </button>
              ) : (
                /* Insufficient balance banner */
                <div className="floating-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Insufficient Wallet Balance</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Balance: रु {topupBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {" · "}
                        Need रु {shortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/deposit">Load Wallet</Link>
                  </Button>
                </div>
              )}

              {/* COD option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("cod")}
                className={`w-full text-left floating-card p-4 flex items-center gap-3 transition-all ${
                  paymentMethod === "cod" ? "ring-2 ring-primary" : ""
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    paymentMethod === "cod" ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                >
                  {paymentMethod === "cod" && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                </div>
                <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground">Pay when order arrives</p>
                </div>
              </button>
            </div>
          )}
        </section>

        {/* Order Summary */}
        <section>
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="floating-card divide-y divide-border">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center gap-3 p-3">
                {(product.image_url || product.image) && (
                  <img
                    src={product.image_url || product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                  <p className="text-xs text-muted-foreground">×{quantity}</p>
                </div>
                <p className="text-sm font-semibold flex-shrink-0">
                  रु {(Number(product.selling_price) * quantity).toFixed(2)}
                </p>
              </div>
            ))}

            <div className="p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>रु {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {selectedAddressObj?.city ? `रु ${shippingCharge.toFixed(2)}` : "Select city"}
                </span>
              </div>
            </div>

            <div className="flex justify-between p-3">
              <span className="font-bold">Total</span>
              <span className="font-bold text-primary">रु {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 lg:px-8 bg-background border-t border-border z-40">
        <Button
          className="w-full h-12 text-base lg:max-w-2xl lg:ml-auto"
          size="lg"
          disabled={!selectedAddress || isPending || walletLoading}
          onClick={() => placeOrder()}
        >
          {isPending
            ? "Placing Order…"
            : `Place Order · रु ${grandTotal.toFixed(2)}`}
        </Button>
        {!selectedAddress && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Select a delivery address to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default Checkout;
