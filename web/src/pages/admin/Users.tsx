import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  AdminStatsCards,
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminUserList } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { adminKeys } from "@/api/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/api/types";

const PAGE_SIZE = 20;

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const kyc_status = searchParams.get("kyc_status") || undefined;
  const status = searchParams.get("status") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const { toast } = useToast();

  const params = {
    page,
    page_size: pageSize,
    order_by: orderBy,
    search,
    kyc_status,
    status,
    date_from,
    date_to,
  };

  const { data, isLoading, error } = useAdminUserList(params);
  const qc = useQueryClient();

  const results = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  if (isLoading && results.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all users</p>
        </div>
        <AdminListSkeleton statsCount={4} filterRows={3} tableColumns={7} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (row: User) => <Link className="text-primary underline font-medium" to={`/system/users/${row.id}`}>#{row.id}</Link>,
    },
    { id: "phone", label: "Phone", sortKey: "phone" },
    { id: "name", label: "Name", sortKey: "name" },
    {
      id: "kyc_status",
      label: "KYC",
      sortKey: "kyc_status",
      render: (row: User) => (
        <Badge variant={row.kyc_status === "approved" ? "default" : row.kyc_status === "rejected" ? "destructive" : "secondary"}>
          {row.kyc_status}
        </Badge>
      ),
    },
    {
      id: "status", label: "Status", sortKey: "status",
      render: (row: User) => (
        <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge>
      ),
    },
    {
      id: "is_active",
      label: "Active",
      sortKey: "id",
      toggle: {
        getValue: (row: User) => row.is_active,
        label: "Active",
        onConfirm: async (row: User, newValue: boolean) => {
          await adminApi.updateUser(row.id, { is_active: newValue });
          qc.invalidateQueries({ queryKey: adminKeys.users(params) });
          qc.invalidateQueries({ queryKey: adminKeys.user(row.id) });
        },
      },
    },
    { id: "package_name", label: "Package", render: (row: User) => row.package_name ?? "—" },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (row: User) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: User) => (
        <AdminRowActions
          viewHref={`/system/users/${row.id}`}
          editHref={`/system/users/${row.id}/edit`}
          onPassword={() => setPasswordUser(row)}
          onDelete={async () => {
            try {
              await adminApi.deleteUser(row.id);
              qc.invalidateQueries({ queryKey: adminKeys.users(params) });
            } catch {
              toast({ variant: "destructive", title: "Failed to delete user", description: "You may not have permission, or this is your own account." });
            }
          }}
          deleteConfirmLabel="Permanently delete this user? Related wallets, requests, addresses, and other linked data will be removed. This cannot be undone."
        />
      ),
    },
  ];

  const handlePasswordSubmit = async () => {
    if (!passwordUser || !newPassword || newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Validation", description: "Passwords must match and not be empty." });
      return;
    }
    setPasswordSubmitting(true);
    try {
      await adminApi.updateUser(passwordUser.id, { password: newPassword });
      toast({ title: "Password updated", description: "User password has been changed." });
      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
      qc.invalidateQueries({ queryKey: adminKeys.users(params) });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update password." });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Manage all users</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/users/new">Add User</Link>
        </Button>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminStatsCards
        loading={isLoading}
        items={[{ label: "Total (filtered)", value: count }, { label: "On this page", value: results.length }]}
      />

      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "select", name: "kyc_status", label: "KYC Status", options: [
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]},
          { type: "select", name: "status", label: "Status", options: [
            { value: "active", label: "Active" },
            { value: "freeze", label: "Freeze" },
            { value: "deactivate", label: "Deactivate" },
          ]},
          { type: "date", name: "date_from", label: "Joined from" },
          { type: "date", name: "date_to", label: "Joined to" },
        ]}
        searchPlaceholder="Search phone or name..."
        searchParamName="search"
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={results}
            keyFn={(row) => (row as User).id}
            orderBy={orderBy}
            onOrderByChange={(v) => setOrderBy(v)}
            isLoading={isLoading}
            emptyMessage="No users found."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>

      {error && (
        <p className="text-destructive text-sm">Failed to load users. Log in as staff.</p>
      )}

      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          {passwordUser && (
            <>
              <p className="text-sm text-muted-foreground">Set a new password for {passwordUser.phone}.</p>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPasswordUser(null)}>Cancel</Button>
                <Button onClick={handlePasswordSubmit} disabled={passwordSubmitting || !newPassword || newPassword !== confirmPassword}>
                  {passwordSubmitting ? "Saving..." : "Update password"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
