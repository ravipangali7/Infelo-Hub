import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import {
  useAdminSale,
  useAdminCreateSale,
  useAdminUpdateSale,
  useAdminAddressList,
  useAdminProductList,
  useAdminUserList,
  useAdminVendorList,
  adminKeys,
} from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaymentMethodSelectOptionContent } from "@/components/PaymentMethodLogo";
import type { PaymentMethod } from "@/api/types";

interface LineItem {
  product: string;
  selling_price: string;
  quantity: string;
}

/** Radix Select forbids empty string as SelectItem value; map to API "" on submit. */
const SELECT_NONE = "__none__" as const;
const DISCOUNT_TYPES = [
  { value: SELECT_NONE, label: "None" },
  { value: "flat", label: "Flat" },
  { value: "percentage", label: "Percentage" },
];

const SALES_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];

const PAYMENT_METHODS = [
  { value: SELECT_NONE, label: "None" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "bank", label: "Bank" },
  { value: "cod", label: "Cash on Delivery (COD)" },
  { value: "wallet", label: "Wallet" },
];

export default function SaleForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const saleId = !isNew && id ? parseInt(id, 10) : null;
  const { data: sale, isLoading } = useAdminSale(saleId);
  const { data: vendors } = useAdminVendorList({ page_size: 200 });
  const { data: users } = useAdminUserList({ page_size: 200 });
  const { data: addresses } = useAdminAddressList({ page_size: 200 });
  const { data: products } = useAdminProductList({ page_size: 300 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [discountType, setDiscountType] = useState<typeof SELECT_NONE | "flat" | "percentage">(SELECT_NONE);
  const [saleStatus, setSaleStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState<
    typeof SELECT_NONE | "esewa" | "khalti" | "bank" | "cod" | "wallet"
  >(SELECT_NONE);
  const [items, setItems] = useState<LineItem[]>([{ product: "", selling_price: "", quantity: "1" }]);
  const [vendorId, setVendorId] = useState("");
  const [userId, setUserId] = useState("");
  const [addressId, setAddressId] = useState("");

  useEffect(() => {
    if (sale) {
      setDiscountType(
        sale.discount_type === "flat" || sale.discount_type === "percentage"
          ? sale.discount_type
          : SELECT_NONE
      );
      setSaleStatus(sale.status || "pending");
      setPaymentStatus(sale.payment_status || "pending");
      setPaymentMethod(
        sale.payment_method === "esewa" || sale.payment_method === "khalti" || sale.payment_method === "bank" || sale.payment_method === "cod" || sale.payment_method === "wallet"
          ? sale.payment_method
          : SELECT_NONE
      );
      if (sale.items && sale.items.length > 0) {
        setItems(
          sale.items.map((item) => ({
            product: String(item.product),
            selling_price: String(item.selling_price),
            quantity: String(item.quantity),
          }))
        );
      }
      setVendorId(sale.vendor != null ? String(sale.vendor) : "");
      setUserId(sale.user != null ? String(sale.user) : "");
      setAddressId(sale.address != null ? String(sale.address) : "");
    }
  }, [sale]);

  const createMut = useAdminCreateSale();
  const updateMut = useAdminUpdateSale(saleId ?? 0);

  const addItem = () => setItems((prev) => [...prev, { product: "", selling_price: "", quantity: "1" }]);

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    for (const item of items) {
      if (!item.product.trim()) {
        toast({ variant: "destructive", title: "Each line item must have a product ID" });
        return;
      }
    }

    const mappedItems = items.map((item) => ({
      product: parseInt(item.product, 10),
      selling_price: parseFloat(item.selling_price) || 0,
      quantity: parseInt(item.quantity, 10) || 1,
    }));

    const body: Record<string, unknown> = {
      discount_type: discountType === SELECT_NONE ? "" : discountType,
      discount: parseFloat((fd.get("discount") as string) || "0"),
      shipping_charge: parseFloat((fd.get("shipping_charge") as string) || "0"),
      status: saleStatus,
      payment_status: paymentStatus,
      payment_method: paymentMethod === SELECT_NONE ? "" : paymentMethod,
      items: mappedItems,
    };

    if (vendorId) body.vendor = parseInt(vendorId, 10);
    else body.vendor = null;
    if (userId) body.user = parseInt(userId, 10);
    else body.user = null;
    if (addressId) body.address = parseInt(addressId, 10);
    else body.address = null;

    if (isNew) {
      createMut.mutate(body, {
        onSuccess: (data) => {
          toast({ title: "Sale created" });
          navigate(`/system/sales/${data.id}`);
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    } else if (saleId) {
      updateMut.mutate(body, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: adminKeys.sale(saleId) });
          toast({ title: "Saved" });
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    }
  };

  if (!isNew && saleId && isLoading && !sale) return <Skeleton className="h-64 w-full" />;
  if (!isNew && saleId && !sale && !isLoading) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/sales">Back</Link>
      </div>
    );
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add Sale" : "Edit Sale"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sale Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 max-w-2xl md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <SearchableSelect
                value={vendorId}
                onChange={setVendorId}
                options={[
                  { value: "", label: "None" },
                  ...(vendors?.results ?? []).map((v) => ({
                    value: String(v.id),
                    label: `#${v.id} ${v.name}`,
                    image: v.logo_url || v.logo || null,
                  })),
                ]}
                placeholder="Select vendor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <SearchableSelect
                value={userId}
                onChange={setUserId}
                options={[
                  { value: "", label: "None" },
                  ...(users?.results ?? []).map((u) => ({ value: String(u.id), label: `#${u.id} ${u.name || u.phone}` })),
                ]}
                placeholder="Select user"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <SearchableSelect
                value={addressId}
                onChange={setAddressId}
                options={[
                  { value: "", label: "None" },
                  ...(addresses?.results ?? []).map((a) => ({ value: String(a.id), label: `#${a.id} ${a.name || a.address}` })),
                ]}
                placeholder="Select address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_charge">Shipping Charge</Label>
              <Input id="shipping_charge" name="shipping_charge" type="number" step="0.01" min="0" defaultValue={sale?.shipping_charge ?? "0"} />
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount Amount</Label>
              <Input id="discount" name="discount" type="number" step="0.01" min="0" defaultValue={sale?.discount ?? "0"} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={saleStatus} onValueChange={setSaleStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.value === SELECT_NONE ? (
                        m.label
                      ) : (
                        <PaymentMethodSelectOptionContent method={m.value as PaymentMethod} />
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 items-end md:grid-cols-[1fr_1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">Product *</Label>
                    <SearchableSelect
                      value={item.product}
                      onChange={(v) => updateItem(idx, "product", v)}
                      options={(products?.results ?? []).map((p) => ({
                        value: String(p.id),
                        label: `#${p.id} ${p.name}`,
                        image: p.image_url || p.image || null,
                      }))}
                      placeholder="Select product"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Selling Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.selling_price}
                      onChange={(e) => updateItem(idx, "selling_price", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isNew ? "Create" : "Save"}
          </Button>
          <Link to={isNew ? "/system/sales" : `/system/sales/${saleId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
        {!isNew && sale && (
          <p className="text-xs text-muted-foreground">Subtotal: {sale.subtotal} | Total: {sale.total} | Created: {sale.created_at} | Updated: {sale.updated_at}</p>
        )}
      </form>
    </div>
  );
}
