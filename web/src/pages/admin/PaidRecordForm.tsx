import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminPaidRecord, useAdminPurchaseList, useAdminUserList, useAdminVendorList } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import type { PaymentMethod } from "@/api/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaymentMethodSelectOptionContent } from "@/components/PaymentMethodLogo";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

const METHODS: PaymentMethod[] = ["esewa", "khalti", "bank"];

function fmtMoney(v: string | number) {
  const n = Number(v);
  return isNaN(n) ? String(v) : `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function PaidRecordForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const rid = !isNew && id ? parseInt(id, 10) : null;
  const { data: r, isLoading } = useAdminPaidRecord(rid);
  const { data: vendors } = useAdminVendorList({ page_size: 200 });
  const { data: users } = useAdminUserList({ page_size: 200 });
  const { data: allPurchases } = useAdminPurchaseList({ page_size: 200 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod>("esewa");
  const [vendorId, setVendorId] = useState("");
  const [userId, setUserId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [amount, setAmount] = useState("");

  const { data: vendorPurchases, isLoading: loadingVendorPurchases } = useAdminPurchaseList(
    vendorId ? { vendor: vendorId, payment_status: "pending", page_size: 50 } : undefined
  );

  const selectedVendor = vendors?.results.find((v) => String(v.id) === vendorId);

  useEffect(() => {
    if (r?.payment_method) setMethod(r.payment_method as PaymentMethod);
    if (r) {
      setVendorId(r.vendor != null ? String(r.vendor) : "");
      setUserId(r.user != null ? String(r.user) : "");
      setPurchaseId(r.purchase != null ? String(r.purchase) : "");
      setAmount(r.amount ?? "");
    }
  }, [r]);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createPaidRecord>[0]) => adminApi.createPaidRecord(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.paidRecords() });
      navigate(`/system/paid-records/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updatePaidRecord>[1] }) => adminApi.updatePaidRecord(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.paidRecords() });
      if (rid) qc.invalidateQueries({ queryKey: adminKeys.paidRecord(rid) });
      toast({ title: "Saved" });
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    if (!name || !amount) {
      toast({ variant: "destructive", title: "Name and amount required" });
      return;
    }
    const body: Parameters<typeof adminApi.createPaidRecord>[0] = {
      name,
      amount,
      payment_method: method,
      remarks: (fd.get("remarks") as string) || "",
    };
    if (vendorId) body.vendor = parseInt(vendorId, 10);
    else body.vendor = null;
    if (userId) body.user = parseInt(userId, 10);
    else body.user = null;
    if (purchaseId) body.purchase = parseInt(purchaseId, 10);
    else body.purchase = null;
    if (isNew) createMut.mutate(body);
    else if (rid) updateMut.mutate({ pk: rid, body });
  };

  if (!isNew && rid && isLoading && !r) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!isNew && rid && !r) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/paid-records">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add paid record" : "Edit paid record"}</h1>

      {selectedVendor && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Vendor: {selectedVendor.name}
          </p>
          <AdminStatsCards
            items={[
              { label: "To Pay (Payable)", value: fmtMoney(selectedVendor.payable) },
              { label: "To Receive (Receivable)", value: fmtMoney(selectedVendor.receivable) },
            ]}
          />
        </div>
      )}

      {selectedVendor && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending Purchases — {selectedVendor.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVendorPurchases ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !vendorPurchases?.results?.length ? (
              <p className="text-sm text-muted-foreground">No pending purchases for this vendor.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Total</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {vendorPurchases.results.map((p) => {
                      const isSelected = purchaseId === String(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`border-b last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                          onClick={() => {
                            setPurchaseId(String(p.id));
                            setAmount(p.total);
                          }}
                        >
                          <td className="py-2 pr-4 font-mono">#{p.id}</td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4 text-right font-medium">{fmtMoney(p.total)}</td>
                          <td className="py-2">
                            <Badge variant="secondary">{p.payment_status_display || p.payment_status}</Badge>
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {isSelected && (
                              <span className="text-xs text-primary font-medium">Selected</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Record</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={r?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                name="amount"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      <PaymentMethodSelectOptionContent method={m} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <SearchableSelect
                value={vendorId}
                onChange={(v) => {
                  setVendorId(v);
                  setPurchaseId("");
                  setAmount("");
                }}
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
              <Label htmlFor="purchase">Purchase</Label>
              <SearchableSelect
                value={purchaseId}
                onChange={(v) => {
                  setPurchaseId(v);
                  if (v) {
                    const found = (vendorPurchases?.results ?? allPurchases?.results ?? []).find(
                      (p) => String(p.id) === v
                    );
                    if (found) setAmount(found.total);
                  }
                }}
                options={[
                  { value: "", label: "None" },
                  ...(allPurchases?.results ?? []).map((p) => ({ value: String(p.id), label: `#${p.id} ${p.vendor_name || "Purchase"} — ${fmtMoney(p.total)}` })),
                ]}
                placeholder="Select purchase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" rows={2} defaultValue={r?.remarks} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/paid-records" : `/system/paid-records/${rid}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
            {!isNew && r && (
              <p className="text-xs text-muted-foreground">Created: {r.created_at} | Updated: {r.updated_at}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
