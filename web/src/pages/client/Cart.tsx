import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const Cart = () => {
  const { items, removeFromCart, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center bg-background/80 backdrop-blur-xl border-b border-border">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold font-display">Cart</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 pt-20 px-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold font-display">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm">Add some products to get started.</p>
          <Button asChild className="mt-2">
            <Link to="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-lg font-bold font-display">Cart ({items.length})</h1>
      </header>

      <div className="client-page-container client-page-content pt-20 pb-56 lg:pb-36 space-y-3">
        {items.map(({ product, quantity }) => {
          const image = product.image_url || product.image || "";
          const stock = Number(product.stock) || 0;
          const cannotIncrease = stock <= 0 || quantity >= stock;
          return (
            <div
              key={product.id}
              className="floating-card p-3 flex gap-3 items-start"
            >
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</p>
                <p className="text-primary font-bold mt-1">रु {Number(product.selling_price) * quantity}</p>
                <p className="text-muted-foreground text-xs">रु {product.selling_price} each</p>
                {stock > 0 ? (
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Max {stock} in stock{cannotIncrease ? " (cart at max)" : ""}
                  </p>
                ) : null}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-7 h-7 rounded-lg bg-background flex items-center justify-center disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-semibold text-sm w-6 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      disabled={cannotIncrease}
                      className="w-7 h-7 rounded-lg bg-background flex items-center justify-center disabled:opacity-40"
                      aria-label={cannotIncrease ? "Maximum quantity reached" : "Increase quantity"}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id)}
                    className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 lg:px-8 bg-background border-t border-border space-y-3 z-40">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-bold text-lg">रु {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-3 lg:max-w-2xl lg:ml-auto">
          <Button variant="outline" asChild className="flex-1">
            <Link to="/shop">Continue Shopping</Link>
          </Button>
          <Button className="flex-1" onClick={() => navigate("/checkout")}>
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
