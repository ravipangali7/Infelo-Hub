import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
  AdminUserColumnCell,
} from "@/components/admin";
import { useAdminSubmissionList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CampaignSubmission } from "@/api/types";

const PAGE_SIZE = 20;

export default function Submissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const campaign = searchParams.get("campaign") || undefined;
  const user = searchParams.get("user") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, status, search, campaign, user, date_from, date_to };
  const { data, isLoading, error } = useAdminSubmissionList(params);
  const qc = useQueryClient();
  const { toast } = useToast();
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.submissions(params) });

  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Submissions</h1>
        </div>
        <AdminListSkeleton statsCount={3} filterRows={2} tableColumns={7} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (s: CampaignSubmission) => <Link className="text-primary underline font-medium" to={`/system/submissions/${s.id}`}>#{s.id}</Link>,
    },
    { id: "campaign_name", label: "Campaign" },
    {
      id: "user",
      label: "User",
      render: (s: CampaignSubmission) => (
        <AdminUserColumnCell userId={s.user} userPhone={s.user_phone} />
      ),
    },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (s: CampaignSubmission) => (
        <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{s.status}</Badge>
      ),
    },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (s: CampaignSubmission) => new Date(s.created_at).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (s: CampaignSubmission) => (
        <div className="flex flex-wrap items-center gap-1">
          <AdminRowActions
            viewHref={`/system/submissions/${s.id}`}
            onDelete={async () => {
              try {
                await adminApi.deleteSubmission(s.id);
                invalidate();
              } catch {
                toast({ variant: "destructive", title: "Failed to delete submission" });
              }
            }}
            deleteConfirmLabel="Delete this submission and its proofs? This cannot be undone."
          />
          {s.status === "pending" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setApproveId(s.id)}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectId(s.id)}>
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Campaign submissions</h1>
        <p className="text-muted-foreground text-xs md:text-sm">Review proofs and statuses</p>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          {
            type: "select",
            name: "status",
            label: "Status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          { type: "text", name: "campaign", label: "Campaign ID" },
          { type: "text", name: "user", label: "User ID" },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Campaign, user phone, name..."
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(s) => s.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No submissions."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}

      <AlertDialog open={approveId != null} onOpenChange={(o) => !o && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve submission?</AlertDialogTitle>
            <AlertDialogDescription>Confirm approval.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (approveId == null) return;
                await adminApi.approveSubmission(approveId);
                setApproveId(null);
                invalidate();
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectId != null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject</DialogTitle>
          </DialogHeader>
          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={async () => {
                if (rejectId == null) return;
                await adminApi.rejectSubmission(rejectId, rejectReason);
                setRejectId(null);
                setRejectReason("");
                invalidate();
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
