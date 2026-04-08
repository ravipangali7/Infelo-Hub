import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { useAdminKycList, useAdminApproveKyc, useAdminRejectKyc, adminKeys } from "@/api/hooks";
import type { UserKycListItem } from "@/api/types";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminModuleSummary,
} from "@/components/admin";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 20;

export default function KycManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const kyc_status = searchParams.get("kyc_status") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, kyc_status, search, date_from, date_to };
  const { data, isLoading, error } = useAdminKycList(params);
  const qc = useQueryClient();
  const approveKyc = useAdminApproveKyc();
  const rejectKyc = useAdminRejectKyc();

  const users = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const [rejectUserId, setRejectUserId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewerUser, setViewerUser] = useState<UserKycListItem | null>(null);
  const [approveUserId, setApproveUserId] = useState<number | null>(null);

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.kycList(params) });

  const hasAnyDocument = (u: UserKycListItem) => Boolean(u.kyc_document_front_url || u.kyc_document_back_url);

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">KYC Management</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Review and approve KYC</p>
        </div>
        <AdminListSkeleton statsCount={4} filterRows={2} tableColumns={8} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (u: UserKycListItem) => <Link className="text-primary underline font-medium" to={`/system/users/${u.id}`}>#{u.id}</Link>,
    },
    {
      id: "phone",
      label: "Phone",
      sortKey: "phone",
      render: (u: UserKycListItem) => (
        <Link className="text-primary underline" to={`/system/users/${u.id}`}>
          {u.phone}
        </Link>
      ),
    },
    { id: "name", label: "Name", sortKey: "name", render: (u: UserKycListItem) => u.name || "—" },
    {
      id: "kyc_status",
      label: "KYC",
      sortKey: "kyc_status",
      render: (u: UserKycListItem) => (
        <Badge variant={u.kyc_status === "approved" ? "default" : u.kyc_status === "rejected" ? "destructive" : "secondary"}>
          {u.kyc_status}
        </Badge>
      ),
    },
    { id: "kyc_reject_reason", label: "Reject reason", render: (u: UserKycListItem) => <span className="max-w-[180px] truncate block">{u.kyc_reject_reason || "—"}</span> },
    {
      id: "docs",
      label: "Documents",
      render: (u: UserKycListItem) =>
        hasAnyDocument(u) ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setViewerUser(u)}>
            <Eye className="h-4 w-4" />
            View
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (u: UserKycListItem) =>
        u.kyc_status === "pending" ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setApproveUserId(u.id)} disabled={approveKyc.isPending}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectUserId(u.id)}>
              Reject
            </Button>
          </div>
        ) : (
          <Link to={`/system/users/${u.id}`}>
            <Button variant="ghost" size="sm">
              Profile
            </Button>
          </Link>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">KYC Management</h1>
        <p className="text-muted-foreground text-xs md:text-sm">Dashboard metrics, search, and review queue</p>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          {
            type: "select",
            name: "kyc_status",
            label: "KYC status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Phone, name, or user ID..."
        searchParamName="search"
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={users}
            keyFn={(u) => u.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No users in KYC queue."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load KYC list.</p>}

      <AlertDialog open={approveUserId != null} onOpenChange={(o) => !o && setApproveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve KYC?</AlertDialogTitle>
            <AlertDialogDescription>Marks this user as KYC approved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (approveUserId == null) return;
                approveKyc.mutate(approveUserId, {
                  onSuccess: () => {
                    setApproveUserId(null);
                    invalidate();
                  },
                });
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectUserId != null} onOpenChange={(open) => !open && (setRejectUserId(null), setRejectReason(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Provide a reason (required).</p>
          <Input placeholder="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => (setRejectUserId(null), setRejectReason(""))}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectKyc.isPending}
              onClick={() => {
                if (rejectUserId == null || !rejectReason.trim()) return;
                rejectKyc.mutate(
                  { userId: rejectUserId, reason: rejectReason },
                  {
                    onSuccess: () => {
                      setRejectUserId(null);
                      setRejectReason("");
                      invalidate();
                    },
                  }
                );
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewerUser != null} onOpenChange={(open) => !open && setViewerUser(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              KYC documents
              {viewerUser && (
                <span className="mt-1 block text-sm font-normal text-muted-foreground">
                  {viewerUser.name || "—"} · {viewerUser.phone}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewerUser && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">ID — front</p>
                <div className="rounded-lg border bg-muted/30 p-2">
                  {viewerUser.kyc_document_front_url ? (
                    <a href={viewerUser.kyc_document_front_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={viewerUser.kyc_document_front_url} alt="KYC front" className="mx-auto max-h-[min(50vh,420px)] w-full object-contain" />
                    </a>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No file uploaded</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">ID — back</p>
                <div className="rounded-lg border bg-muted/30 p-2">
                  {viewerUser.kyc_document_back_url ? (
                    <a href={viewerUser.kyc_document_back_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={viewerUser.kyc_document_back_url} alt="KYC back" className="mx-auto max-h-[min(50vh,420px)] w-full object-contain" />
                    </a>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No file uploaded</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewerUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
