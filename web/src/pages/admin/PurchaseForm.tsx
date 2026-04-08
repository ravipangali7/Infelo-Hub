import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import {
  useAdminPurchase,
  useAdminCreatePurchase,
  useAdminUpdatePurchase,
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
import { useState, useEffect, useMemo } from "react";
import { Trash2, Plus } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import type { PaymentMethod } from "@/api/types";
import { PaymentMethodSelectOptionContent } from "@/components/PaymentMethodLogo";

interface LineItem {
  product: string;
  purchasing_price: string;
  quantity: string;
}

/** Radix Select forbids empty string as SelectItem value; map to API "" on submit. */
const DISCOUNT_NONE = "__none__" as const;
const DISCOUNT_TYPES = [
  { value: DISCOUNT_NONE, label: "None" },
  { value: "flat", label: "Flat" },
  { value: "percentage", label: "Percentage" },
];
const PAYMENT_METHODS: PaymentMethod[] = ["esewa", "khalti", "bank"];

export default function PurchaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const purchaseId = !isNew && id ? parseInt(id, 10) : null;
  const { data: purchase, isLoading } = useAdminPurchase(purchaseId);
  const { data: vendors } = useAdminVendorList({ page_size: 200 });
  const { data: users } = useAdminUserList({ page_size: 200 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [discountType, setDiscountType] = useState<typeof DISCOUNT_NONE | "flat" | "percentage">(DISCOUNT_NONE);
  const [discountValue, setDiscountValue] = useState("0");
  const [items, setItems] = useState<LineItem[]>([{ product: "", purchasing_price: "", quantity: "1" }]);
  const [vendorId, setVendorId] = useState("");
  const [userId, setUserId] = useState("");
  const [autoCreatePaidRecord, setAutoCreatePaidRecord] = useState(false);
  const [paidRecordName, setPaidRecordName] = useState("");
  const [paidRecordPaymentMethod, setPaidRecordPaymentMethod] = useState<PaymentMethod>("esewa");
  const [paidRecordRemarks, setPaidRecordRemarks] = useState("");
  const productListParams = useMemo(
    () => (vendorId ? { page_size: 300, vendor: vendorId } : { page_size: 300 }),
    [vendorId]
  );
  const { data: products } = useAdminProductList(productListParams);
  const availableProducts = products?.results ?? [];
  const productsById = useMemo(
    () => new Map(availableProducts.map((product) => [String(product.id), product])),
    [availableProducts]
  );
  const computedSubtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = parseFloat(item.purchasing_price) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + price * quantity;
      }, 0),
    [items]
  );
  const computedDiscount = useMemo(() => parseFloat(discountValue) || 0, [discountValue]);
  const computedTotal = useMemo(
    () => Math.max(0, computedSubtotal - computedDiscount),
    [computedSubtotal, computedDiscount]
  );

  useEffect(() => {
    if (purchase) {
      setDiscountType(
        purchase.discount_type === "flat" || purchase.discount_type === "percentage"
          ? purchase.discount_type
          : DISCOUNT_NONE
      );
      setDiscountValue(String(purchase.discount ?? "0"));
      if (purchase.items && purchase.items.length > 0) {
        setItems(
          purchase.items.map((item) => ({
            product: String(item.product),
            purchasing_price: String(item.purchasing_price),
            quantity: String(item.quantity),
          }))
        );
      }
      setVendorId(purchase.vendor != null ? String(purchase.vendor) : "");
      setUserId(purchase.user != null ? String(purchase.user) : "");
    }
  }, [purchase]);

  useEffect(() => {
    if (!vendorId || !products?.results) return;
    const allowedProductIds = new Set(availableProducts.map((p) => String(p.id)));
    setItems((prev) =>
      prev.map((item) =>
        item.product && !allowedProductIds.has(item.product) ? { ...item, product: "", purchasing_price: "" } : item
      )
    );
  }, [vendorId, products?.results, availableProducts]);

  const createMut = useAdminCreatePurchase();
  const updateMut = useAdminUpdatePurchase(purchaseId ?? 0);

  const addItem = () => setItems((prev) => [...prev, { product: "", purchasing_price: "", quantity: "1" }]);

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const updateItemProduct = (idx: number, productId: string) => {
    const selected = productsById.get(productId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              product: productId,
              purchasing_price: selected ? String(selected.purchasing_price) : "",
            }
          : item
      )
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    for (const item of items) {
      if (!item.product.trim()) {
        toast({ variant: "destructive", title: "Each line item must have a product ID" });
        return;
      }
    }
    if (isNew && autoCreatePaidRecord && !paidRecordName.trim()) {
      toast({ variant: "destructive", title: "Paid record name is required when auto create is enabled" });
      return;
    }

    const mappedItems = items.map((item) => ({
      product: parseInt(item.product, 10),
      purchasing_price: parseFloat(item.purchasing_price) || 0,
      quantity: parseInt(item.quantity, 10) || 1,
    }));

    const body: Record<string, unknown> = {
      discount_type: discountType === DISCOUNT_NONE ? "" : discountType,
      discount: parseFloat(discountValue) || 0,
      items: mappedItems,
    };

    if (vendorId) body.vendor = parseInt(vendorId, 10);
    else body.vendor = null;
    if (userId) body.user = parseInt(userId, 10);
    else body.user = null;
    if (isNew && autoCreatePaidRecord) {
      body.auto_create_paid_record = true;
      body.paid_record_name = paidRecordName.trim();
      body.paid_record_payment_method = paidRecordPaymentMethod;
      body.paid_record_remarks = paidRecordRemarks.trim();
    }

    if (isNew) {
      createMut.mutate(body, {
        onSuccess: (data) => {
          toast({ title: "Purchase created" });
          navigate(`/system/purchases/${data.id}`);
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    } else if (purchaseId) {
      updateMut.mutate(body, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: adminKeys.purchase(purchaseId) });
          toast({ title: "Saved" });
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    }
  };

  if (!isNew && purchaseId && isLoading && !purchase) return <Skeleton className="h-64 w-full" />;
  if (!isNew && purchaseId && !purchase && !isLoading) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/purchases">Back</Link>
      </div>
    );
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add Purchase" : "Edit Purchase"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {vendorId && (
                  <p className="text-xs text-muted-foreground">Products are limited to the selected vendor.</p>
                )}
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
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              {isNew && (
                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">Auto Paid Record</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="auto-paid-record" className="text-sm">Auto create paid record</Label>
                      <Switch
                        id="auto-paid-record"
                        checked={autoCreatePaidRecord}
                        onCheckedChange={setAutoCreatePaidRecord}
                      />
                    </div>
                    {autoCreatePaidRecord && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="paid_record_name">Paid Record Name *</Label>
                          <Input
                            id="paid_record_name"
                            value={paidRecordName}
                            onChange={(e) => setPaidRecordName(e.target.value)}
                            placeholder="Purchase payment"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Paid Record Payment Method *</Label>
                          <Select
                            value={paidRecordPaymentMethod}
                            onValueChange={(v) => setPaidRecordPaymentMethod(v as PaymentMethod)}
                          >
                            <SelectTrigger className="min-h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map((m) => (
                                <SelectItem key={m} value={m}>
                                  <PaymentMethodSelectOptionContent method={m} />
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paid_record_remarks">Paid Record Remarks</Label>
                          <Input
                            id="paid_record_remarks"
                            value={paidRecordRemarks}
                            onChange={(e) => setPaidRecordRemarks(e.target.value)}
                            placeholder="Optional note"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{computedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>{computedDiscount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{computedTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Read Only Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Purchase ID</span>
                  <span>{purchase?.id ?? "Will be generated"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span>{purchase?.vendor_name || "Not selected"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{purchase?.created_at ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{purchase?.updated_at ?? "-"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
                      onChange={(v) => updateItemProduct(idx, v)}
                      options={availableProducts.map((p) => ({
                        value: String(p.id),
                        label: `#${p.id} ${p.name}`,
                        image: p.image_url || p.image || null,
                      }))}
                      placeholder="Select product"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Purchase Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.purchasing_price}
                      onChange={(e) => updateItem(idx, "purchasing_price", e.target.value)}
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
          <Link to={isNew ? "/system/purchases" : `/system/purchases/${purchaseId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
