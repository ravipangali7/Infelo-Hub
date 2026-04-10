import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Edit2, Trash2, Home } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useShippingCharges, useProfile } from "@/api/hooks";
import type { Address } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientAppSeo } from "@/components/ClientAppSeo";

/** All delivery addresses are within Nepal; enforced on the server as well. */
const DELIVERY_COUNTRY = "Nepal";

const Addresses = () => {
  const { t } = useTranslation(["pages", "client"]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", state: "", district: "", city: "" });

  const { data, isLoading, error } = useAddresses();
  const { data: profile } = useProfile();
  const { data: shippingData } = useShippingCharges();
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();

  const addresses = data?.results ?? [];
  const shippingCharges = shippingData?.results ?? [];

  const openAdd = () => {
    setForm({
      name: "Home",
      phone: profile?.phone ?? "",
      address: "",
      state: "",
      district: "",
      city: "",
    });
    setAddOpen(true);
  };
  const openEdit = (addr: Address) => {
    setEditing(addr);
    setForm({
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      state: addr.state || "",
      district: addr.district || "",
      city: addr.city ? String(addr.city) : "",
    });
  };
  const closeEdit = () => {
    setEditing(null);
  };

  const handleCreate = () => {
    createAddress.mutate(
      { ...form, country: DELIVERY_COUNTRY, city: form.city ? Number(form.city) : null },
      {
        onSuccess: () => {
          setAddOpen(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteAddress.mutate(id, { onSettled: () => setDeletingId(null) });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClientAppSeo
          title={`${t("misc.addresses.title")} | ${t("client:brand")}`}
          description="Failed to load addresses."
          canonicalPath="/addresses"
          siteName={t("client:brand")}
        />
        <p className="text-destructive">Failed to load addresses.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientAppSeo
        title={`${t("misc.addresses.title")} | ${t("client:brand")}`}
        description={t("misc.addresses.title")}
        canonicalPath="/addresses"
        siteName={t("client:brand")}
      />
      <header className="client-page-container client-page-content flex items-center justify-between py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40 border-b border-border">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold font-display">{t("misc.addresses.title")}</h1>
            {!isLoading && (
              <p className="text-xs text-muted-foreground">{addresses.length} saved {addresses.length === 1 ? "address" : "addresses"}</p>
            )}
          </div>
        </div>
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add New
        </Button>
      </header>

      <div className="client-page-container client-page-content py-4 pb-10 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </>
        ) : addresses.length === 0 ? (
          <div className="floating-card p-10 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Home className="w-10 h-10 text-primary/60" />
            </div>
            <div>
              <p className="font-semibold text-lg font-display">No Addresses Yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add a delivery address to use at checkout.</p>
            </div>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Address
            </Button>
          </div>
        ) : (
          addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              addr={addr}
              onEdit={() => openEdit(addr)}
              onDelete={() => handleDelete(addr.id)}
              isDeleting={deletingId === addr.id}
            />
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <AddressForm form={form} setForm={setForm} shippingCharges={shippingCharges} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAddress.isPending}>
              {createAddress.isPending ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditAddressDialog
              addr={editing}
              form={form}
              setForm={setForm}
              shippingCharges={shippingCharges}
              onSave={closeEdit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function AddressCard({
  addr,
  onEdit,
  onDelete,
  isDeleting,
}: {
  addr: Address;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const locationParts = [addr.district, addr.state, addr.country || DELIVERY_COUNTRY].filter(Boolean);

  return (
    <div className="floating-card overflow-hidden">
      {/* Top accent strip */}
      <div className="client-page-container client-page-content bg-gradient-primary py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-white text-sm">{addr.name}</span>
      </div>

      {/* Address details */}
      <div className="p-4 space-y-1">
        <p className="text-sm font-medium">{addr.phone}</p>
        <p className="text-sm text-muted-foreground">{addr.address}</p>
        {locationParts.length > 0 && (
          <p className="text-sm text-muted-foreground">{locationParts.join(", ")}</p>
        )}
      </div>

      {/* Actions */}
      <div className="client-page-container client-page-content pb-4 flex gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-lg"
          onClick={onEdit}
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

function AddressForm({
  form,
  setForm,
  shippingCharges,
}: {
  form: { name: string; phone: string; address: string; state: string; district: string; city: string };
  setForm: (f: typeof form) => void;
  shippingCharges: Array<{
    city: number;
    city_name: string;
    city_district: string;
    city_province: string;
    charge: string;
  }>;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div>
        <Label>Label (e.g. Home, Office)</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Home"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Phone</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="98xxxxxxxx"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Street Address</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Street, area, landmark"
          className="mt-1"
        />
      </div>
      <div>
        <Label>City</Label>
        <Select
          value={form.city || undefined}
          onValueChange={(value) => {
            const row = shippingCharges.find((r) => String(r.city) === value);
            setForm({
              ...form,
              city: value,
              district: row?.city_district ?? "",
              state: row?.city_province ?? "",
            });
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            {shippingCharges.map((row) => (
              <SelectItem key={row.city} value={String(row.city)}>
                {row.city_name} (रु {Number(row.charge).toLocaleString()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>District</Label>
          <Input value={form.district} readOnly className="mt-1 bg-muted/50" placeholder="—" />
        </div>
        <div>
          <Label>Province</Label>
          <Input value={form.state} readOnly className="mt-1 bg-muted/50" placeholder="—" />
        </div>
      </div>
      <div>
        <Label>Country</Label>
        <Input value={DELIVERY_COUNTRY} readOnly className="mt-1 bg-muted/50" />
      </div>
    </div>
  );
}

function EditAddressDialog({
  addr,
  form,
  setForm,
  shippingCharges,
  onSave,
}: {
  addr: Address;
  form: { name: string; phone: string; address: string; state: string; district: string; city: string };
  setForm: (f: typeof form) => void;
  shippingCharges: Array<{
    city: number;
    city_name: string;
    city_district: string;
    city_province: string;
    charge: string;
  }>;
  onSave: () => void;
}) {
  const updateMutation = useUpdateAddress(addr.id);
  const handleSave = () => {
    updateMutation.mutate(
      {
        name: form.name,
        phone: form.phone,
        address: form.address,
        country: DELIVERY_COUNTRY,
        state: form.state,
        district: form.district,
        city: form.city ? Number(form.city) : null,
      },
      { onSuccess: onSave }
    );
  };
  return (
    <>
      <AddressForm form={form} setForm={setForm} shippingCharges={shippingCharges} />
      <DialogFooter>
        <Button variant="outline" onClick={onSave}>Cancel</Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default Addresses;
