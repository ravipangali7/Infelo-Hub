import { useParams, useNavigate, Link } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminPackageList, useAdminUser, useAdminUpdateUser, useAdminUserList } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/api/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useEffect, useState } from "react";

export default function UserForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isNew = useAdminFormNewMode();
  const userId = !isNew && id ? parseInt(id, 10) : null;
  const { data: user, isLoading: loadingUser } = useAdminUser(userId ?? null);
  const { data: packageData } = useAdminPackageList({ page_size: 200, order_by: "name" });
  const { data: usersData } = useAdminUserList({ page_size: 200 });
  const [packageIdValue, setPackageIdValue] = useState("");
  const [referredByValue, setReferredByValue] = useState("");
  const updateUser = useAdminUpdateUser(userId ?? 0);
  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
      toast({ title: "User created.", description: `User ${data.phone} created.` });
      navigate(`/system/users/${data.id}`);
    },
    onError: (err: { detail?: string; errors?: Record<string, string[]> }) => {
      toast({ variant: "destructive", title: "Error", description: err.detail || "Failed to create user." });
    },
  });

  useEffect(() => {
    if (!user) return;
    setPackageIdValue(user.package != null ? String(user.package) : "");
    setReferredByValue(user.referred_by != null ? String(user.referred_by) : "");
  }, [user]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (isNew) {
      const phone = (fd.get("phone") as string)?.trim();
      const password = (fd.get("password") as string) || "";
      const name = (fd.get("name") as string)?.trim();
      if (!phone || !password) {
        toast({ variant: "destructive", title: "Validation", description: "Phone and password are required." });
        return;
      }
      createMutation.mutate({ phone, password, name });
    } else if (user) {
      const payload: Partial<User> = {};
      const name = (fd.get("name") as string)?.trim();
      const username = (fd.get("username") as string)?.trim();
      const email = (fd.get("email") as string)?.trim();
      const status = fd.get("status") as string;
      const packageId = packageIdValue;
      const referredBy = referredByValue;
      const kycStatus = fd.get("kyc_status") as string;
      const kycRejectReason = (fd.get("kyc_reject_reason") as string)?.trim();
      const is_wallet_freeze = (fd.get("is_wallet_freeze") as string) === "on";
      const is_active = (fd.get("is_active") as string) === "on";
      const is_staff = (fd.get("is_staff") as string) === "on";
      if (name !== undefined) payload.name = name;
      payload.username = username || null;
      payload.email = email || "";
      if (status) payload.status = status as User["status"];
      if (kycStatus) payload.kyc_status = kycStatus as User["kyc_status"];
      payload.kyc_reject_reason = kycRejectReason || "";
      if (packageId !== undefined && packageId !== "") payload.package = parseInt(packageId, 10) || null;
      else payload.package = null;
      if (referredBy !== undefined && referredBy !== "") payload.referred_by = parseInt(referredBy, 10) || null;
      else payload.referred_by = null;
      payload.is_wallet_freeze = is_wallet_freeze;
      payload.is_active = is_active;
      payload.is_staff = is_staff;
      updateUser.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Saved.", description: "User updated." });
          qc.invalidateQueries({ queryKey: adminKeys.user(user.id) });
        },
        onError: (err: { detail?: string }) => {
          toast({ variant: "destructive", title: "Error", description: err.detail || "Failed to update." });
        },
      });
    }
  };

  if (!isNew && userId && (loadingUser && !user)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isNew && userId && !loadingUser && !user) {
    return (
      <div>
        <p className="text-destructive">User not found.</p>
        <Link to="/system/users">Back to Users</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{isNew ? "Add User" : "Edit User"}</h1>
        <p className="text-muted-foreground">{isNew ? "Create a new user" : `Editing user #${userId}`}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? "New user" : "User details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {isNew ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" name="phone" required placeholder="98xxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Full name" />
                </div>
              </>
            ) : (
              user && (
                <>
                  <div className="space-y-2">
                    <Label>ID</Label>
                    <p className="text-sm text-muted-foreground">{user.id}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" defaultValue={user.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" defaultValue={user.username ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" defaultValue={user.email ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kyc_status">KYC Status</Label>
                    <select id="kyc_status" name="kyc_status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={user.kyc_status}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kyc_reject_reason">KYC Reject Reason</Label>
                    <Input id="kyc_reject_reason" name="kyc_reject_reason" defaultValue={user.kyc_reject_reason ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Account Status</Label>
                    <select id="status" name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={user.status}>
                      <option value="active">Active</option>
                      <option value="freeze">Freeze</option>
                      <option value="deactivate">Deactivate</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package">Package</Label>
                    <SearchableSelect
                      value={packageIdValue}
                      onChange={setPackageIdValue}
                      options={[
                        { value: "", label: "None" },
                        ...(packageData?.results ?? []).map((pkg) => ({ value: String(pkg.id), label: `#${pkg.id} ${pkg.name}` })),
                      ]}
                      placeholder="Select package"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referred_by">Referred By</Label>
                    <SearchableSelect
                      value={referredByValue}
                      onChange={setReferredByValue}
                      options={[
                        { value: "", label: "None" },
                        ...(usersData?.results ?? []).map((u) => ({ value: String(u.id), label: `#${u.id} ${u.name || u.phone}` })),
                      ]}
                      placeholder="Select referrer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Readonly fields</Label>
                    <p className="text-xs text-muted-foreground">Joined: {user.joined_at || "—"} | Activated: {user.activated_at || "—"} | Earning: {user.earning_wallet} | Topup: {user.topup_wallet}</p>
                    <p className="text-xs text-muted-foreground">Created: {user.created_at} | Updated: {user.updated_at}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_wallet_freeze" name="is_wallet_freeze" defaultChecked={user.is_wallet_freeze} className="rounded border" />
                    <Label htmlFor="is_wallet_freeze">Wallet freeze</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" name="is_active" defaultChecked={user.is_active} className="rounded border" />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_staff" name="is_staff" defaultChecked={user.is_staff} className="rounded border" />
                    <Label htmlFor="is_staff">Staff</Label>
                  </div>
                </>
              )
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateUser.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/users" : `/system/users/${userId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
