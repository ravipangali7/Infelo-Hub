import { useState, useEffect } from "react";
import { useAdminSettings, useAdminUpdateSettings, useAdminUpdateMobileSettings } from "@/api/hooks";
import type { SystemSetting } from "@/api/types";
import { ApiError } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageFileField } from "@/components/ImageFileField";

const SETTINGS_FORM_KEYS: (keyof SystemSetting)[] = [
  "balance",
  "esewa_phone",
  "khalti_phone",
  "bank_name",
  "bank_branch",
  "bank_account_no",
  "bank_account_holder_name",
  "minimum_withdrawal",
  "maximum_withdrawal",
  "minimum_deposit",
  "maximum_deposit",
  "withdrawal_admin_fee_type",
  "withdrawal_admin_fee",
  "registration_fee",
  "low_stock_threshold",
  "high_value_payment_threshold",
  "is_withdrawal",
  "is_earning_withdrawal",
  "is_topup_withdrawal",
  "earning_limit_percentage",
  "reward_percentage",
  "sms_api_key",
  "sms_sender_id",
];

function appendSettingsFormData(fd: FormData, form: Partial<SystemSetting>) {
  for (const k of SETTINGS_FORM_KEYS) {
    const val = form[k];
    if (val === undefined || val === null) continue;
    if (typeof val === "boolean") fd.append(k as string, val ? "true" : "false");
    else fd.append(k as string, String(val));
  }
}

const emptyForm = (): Partial<SystemSetting> => ({
  balance: "",
  esewa_phone: "",
  khalti_phone: "",
  bank_name: "",
  bank_branch: "",
  bank_account_no: "",
  bank_account_holder_name: "",
  minimum_withdrawal: "",
  maximum_withdrawal: "",
  minimum_deposit: "",
  maximum_deposit: "",
  withdrawal_admin_fee_type: "",
  withdrawal_admin_fee: "",
  registration_fee: "",
  low_stock_threshold: 5,
  high_value_payment_threshold: "0",
  is_withdrawal: true,
  is_earning_withdrawal: true,
  is_topup_withdrawal: true,
  earning_limit_percentage: "",
  reward_percentage: "",
  sms_api_key: "",
  sms_sender_id: "SMSBit",
});

function dataToForm(data: SystemSetting): Partial<SystemSetting> {
  return {
    balance: data.balance ?? "",
    esewa_phone: data.esewa_phone ?? "",
    khalti_phone: data.khalti_phone ?? "",
    bank_name: data.bank_name ?? "",
    bank_branch: data.bank_branch ?? "",
    bank_account_no: data.bank_account_no ?? "",
    bank_account_holder_name: data.bank_account_holder_name ?? "",
    minimum_withdrawal: data.minimum_withdrawal ?? "",
    maximum_withdrawal: data.maximum_withdrawal ?? "",
    minimum_deposit: data.minimum_deposit ?? "",
    maximum_deposit: data.maximum_deposit ?? "",
    withdrawal_admin_fee_type: data.withdrawal_admin_fee_type ?? "",
    withdrawal_admin_fee: data.withdrawal_admin_fee ?? "",
    registration_fee: data.registration_fee ?? "",
    low_stock_threshold: data.low_stock_threshold ?? 5,
    high_value_payment_threshold: data.high_value_payment_threshold ?? "0",
    is_withdrawal: data.is_withdrawal ?? true,
    is_earning_withdrawal: data.is_earning_withdrawal ?? true,
    is_topup_withdrawal: data.is_topup_withdrawal ?? true,
    earning_limit_percentage: data.earning_limit_percentage ?? "",
    reward_percentage: data.reward_percentage ?? "",
    sms_api_key: data.sms_api_key ?? "",
    sms_sender_id: data.sms_sender_id ?? "SMSBit",
  };
}

const Settings = () => {
  const { data, isLoading, error, isError } = useAdminSettings();
  const updateSettings = useAdminUpdateSettings();
  const updateMobileSettings = useAdminUpdateMobileSettings();
  const noSettings = isError && error instanceof ApiError && error.status === 404;

  const [form, setForm] = useState<Partial<SystemSetting>>(emptyForm());
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [esewaQrFile, setEsewaQrFile] = useState<File | null>(null);
  const [khaltiQrFile, setKhaltiQrFile] = useState<File | null>(null);
  const [bankQrFile, setBankQrFile] = useState<File | null>(null);

  const [mobileMode, setMobileMode] = useState<"view" | "edit">("view");
  const [mobileVersion, setMobileVersion] = useState("");
  const [androidApkFile, setAndroidApkFile] = useState<File | null>(null);
  const [mobileUploadPct, setMobileUploadPct] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setForm(dataToForm(data));
      setMobileVersion(data.app_current_version?.trim() ?? "1");
    }
  }, [data]);

  useEffect(() => {
    if (noSettings) {
      setForm(emptyForm());
      setMode("edit");
      setMobileVersion("1");
      setMobileMode("edit");
    }
  }, [noSettings]);

  const handleSave = () => {
    const hasQrFiles = !!(esewaQrFile || khaltiQrFile || bankQrFile);
    if (hasQrFiles) {
      const fd = new FormData();
      appendSettingsFormData(fd, form);
      if (esewaQrFile) fd.append("esewa_qr", esewaQrFile);
      if (khaltiQrFile) fd.append("khalti_qr", khaltiQrFile);
      if (bankQrFile) fd.append("bank_qr", bankQrFile);
      updateSettings.mutate(fd, {
        onSuccess: () => {
          setMode("view");
          setEsewaQrFile(null);
          setKhaltiQrFile(null);
          setBankQrFile(null);
        },
      });
    } else {
      updateSettings.mutate(form, {
        onSuccess: () => setMode("view"),
      });
    }
  };

  const set = (key: keyof SystemSetting, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleMobileSave = () => {
    const v = mobileVersion.trim() || "1";
    if (androidApkFile) {
      const fd = new FormData();
      fd.append("app_current_version", v);
      fd.append("android_file", androidApkFile);
      setMobileUploadPct(0);
      updateMobileSettings.mutate(
        {
          formData: fd,
          onProgress: (loaded, total) => {
            if (total > 0) setMobileUploadPct(Math.round((100 * loaded) / total));
          },
        },
        {
          onSuccess: () => {
            setMobileMode("view");
            setAndroidApkFile(null);
            setMobileUploadPct(null);
          },
          onError: () => setMobileUploadPct(null),
        }
      );
    } else {
      updateMobileSettings.mutate(
        { json: { app_current_version: v } },
        {
          onSuccess: () => setMobileMode("view"),
        }
      );
    }
  };

  if (isLoading && !noSettings) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError && !noSettings) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load settings."}
      </p>
    );
  }

  const isEditMode = noSettings || mode === "edit";
  const showViewEditButtons = !noSettings && data;

  const mobileEdit = noSettings || mobileMode === "edit";
  const showMobileViewEdit = !noSettings && data;

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground text-xs md:text-sm">Configure system settings</p>
      </div>

      <Tabs defaultValue="general" className="w-full max-w-2xl">
        <TabsList className="w-full flex-wrap h-auto justify-start">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="mobile">Mobile App</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {showViewEditButtons && (
              <>
                <Button
                  variant={mode === "view" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("view")}
                >
                  View
                </Button>
                <Button
                  variant={mode === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("edit")}
                >
                  Edit
                </Button>
              </>
            )}
          </div>

          <div className="bg-card rounded-xl border p-6 space-y-6">
        {isEditMode ? (
          <>
            {/* Balance */}
            <div className="space-y-2">
              <Label>Balance</Label>
              <Input
                type="text"
                value={form.balance ?? ""}
                onChange={(e) => set("balance", e.target.value)}
              />
            </div>

            {/* Withdrawal limits */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Withdrawal limits
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Withdrawal</Label>
                  <Input
                    type="text"
                    value={form.minimum_withdrawal ?? ""}
                    onChange={(e) => set("minimum_withdrawal", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Withdrawal</Label>
                  <Input
                    type="text"
                    value={form.maximum_withdrawal ?? ""}
                    onChange={(e) => set("maximum_withdrawal", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Deposit limits */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Deposit limits
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Deposit</Label>
                  <Input
                    type="text"
                    value={form.minimum_deposit ?? ""}
                    onChange={(e) => set("minimum_deposit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Deposit</Label>
                  <Input
                    type="text"
                    value={form.maximum_deposit ?? ""}
                    onChange={(e) => set("maximum_deposit", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Withdrawal admin fee */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Withdrawal admin fee
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fee type</Label>
                  <Select
                    value={form.withdrawal_admin_fee_type ?? ""}
                    onValueChange={(v) => set("withdrawal_admin_fee_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Admin fee</Label>
                  <Input
                    type="text"
                    value={form.withdrawal_admin_fee ?? ""}
                    onChange={(e) => set("withdrawal_admin_fee", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Registration & percentages */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Alerts and notifications</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Low stock threshold</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.low_stock_threshold ?? 5}
                    onChange={(e) => set("low_stock_threshold", parseInt(e.target.value, 10) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    After an order is marked delivered, staff are alerted (ADMIN_A7) when product stock is at or below this value.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>High-value payment alert amount</Label>
                  <Input
                    type="text"
                    value={form.high_value_payment_threshold ?? ""}
                    onChange={(e) => set("high_value_payment_threshold", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If greater than 0, staff also receive ADMIN_A9 when a new deposit or withdrawal request amount is at or above this value.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Registration fee</Label>
                <Input
                  type="text"
                  value={form.registration_fee ?? ""}
                  onChange={(e) => set("registration_fee", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Earning limit (%)</Label>
                <Input
                  type="text"
                  value={form.earning_limit_percentage ?? ""}
                  onChange={(e) =>
                    set("earning_limit_percentage", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Reward percentage</Label>
                <Input
                  type="text"
                  value={form.reward_percentage ?? ""}
                  onChange={(e) => set("reward_percentage", e.target.value)}
                />
              </div>
            </div>

            {/* Withdrawal toggles */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Withdrawal options
              </h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_withdrawal ?? true}
                    onCheckedChange={(v) => set("is_withdrawal", v)}
                  />
                  <Label>Withdrawal enabled</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_earning_withdrawal ?? true}
                    onCheckedChange={(v) => set("is_earning_withdrawal", v)}
                  />
                  <Label>Earning withdrawal</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_topup_withdrawal ?? true}
                    onCheckedChange={(v) => set("is_topup_withdrawal", v)}
                  />
                  <Label>Top-up withdrawal</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">SMS Provider</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMS API key</Label>
                  <Input type="text" value={form.sms_api_key ?? ""} onChange={(e) => set("sms_api_key", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SMS sender ID</Label>
                  <Input type="text" value={form.sms_sender_id ?? ""} onChange={(e) => set("sms_sender_id", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Esewa */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Esewa
              </h3>
              <div className="space-y-2">
                <Label>Esewa phone</Label>
                <Input
                  type="text"
                  value={form.esewa_phone ?? ""}
                  onChange={(e) => set("esewa_phone", e.target.value)}
                />
              </div>
              <ImageFileField label="Esewa QR" currentUrl={data?.esewa_qr_url} onFileChange={setEsewaQrFile} />
            </div>

            {/* Khalti */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Khalti
              </h3>
              <div className="space-y-2">
                <Label>Khalti phone</Label>
                <Input
                  type="text"
                  value={form.khalti_phone ?? ""}
                  onChange={(e) => set("khalti_phone", e.target.value)}
                />
              </div>
              <ImageFileField label="Khalti QR" currentUrl={data?.khalti_qr_url} onFileChange={setKhaltiQrFile} />
            </div>

            {/* Bank */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">
                Bank
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank name</Label>
                  <Input
                    type="text"
                    value={form.bank_name ?? ""}
                    onChange={(e) => set("bank_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    type="text"
                    value={form.bank_branch ?? ""}
                    onChange={(e) => set("bank_branch", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account number</Label>
                  <Input
                    type="text"
                    value={form.bank_account_no ?? ""}
                    onChange={(e) => set("bank_account_no", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account holder name</Label>
                  <Input
                    type="text"
                    value={form.bank_account_holder_name ?? ""}
                    onChange={(e) =>
                      set("bank_account_holder_name", e.target.value)
                    }
                  />
                </div>
              </div>
              <ImageFileField label="Bank QR" currentUrl={data?.bank_qr_url} onFileChange={setBankQrFile} />
            </div>

            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          /* View mode */
          data && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-sm">Balance</p>
                  <p className="font-medium">{data.balance ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Minimum Withdrawal</p>
                  <p className="font-medium">{data.minimum_withdrawal ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Maximum Withdrawal</p>
                  <p className="font-medium">{data.maximum_withdrawal ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Minimum Deposit</p>
                  <p className="font-medium">{data.minimum_deposit ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Maximum Deposit</p>
                  <p className="font-medium">{data.maximum_deposit ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Withdrawal admin fee type</p>
                  <p className="font-medium">{data.withdrawal_admin_fee_type || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Withdrawal admin fee</p>
                  <p className="font-medium">{data.withdrawal_admin_fee ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Registration fee</p>
                  <p className="font-medium">{data.registration_fee ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Low stock threshold</p>
                  <p className="font-medium">{data.low_stock_threshold ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">High-value payment alert</p>
                  <p className="font-medium">{data.high_value_payment_threshold ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Earning limit %</p>
                  <p className="font-medium">{data.earning_limit_percentage ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Reward %</p>
                  <p className="font-medium">{data.reward_percentage ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">SMS API key</p>
                  <p className="font-medium">{data.sms_api_key ? "Configured" : "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">SMS sender ID</p>
                  <p className="font-medium">{data.sms_sender_id || "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className="text-muted-foreground text-sm">Withdrawal enabled:</span>
                <span className="font-medium">{data.is_withdrawal ? "Yes" : "No"}</span>
                <span className="text-muted-foreground text-sm">Earning withdrawal:</span>
                <span className="font-medium">{data.is_earning_withdrawal ? "Yes" : "No"}</span>
                <span className="text-muted-foreground text-sm">Top-up withdrawal:</span>
                <span className="font-medium">{data.is_topup_withdrawal ? "Yes" : "No"}</span>
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Esewa phone</p>
                <p className="font-medium">{data.esewa_phone || "—"}</p>
                {data.esewa_qr_url && (
                  <a href={data.esewa_qr_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">View Esewa QR</a>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Khalti phone</p>
                <p className="font-medium">{data.khalti_phone || "—"}</p>
                {data.khalti_qr_url && (
                  <a href={data.khalti_qr_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">View Khalti QR</a>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-sm">Bank name</p>
                  <p className="font-medium">{data.bank_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Branch</p>
                  <p className="font-medium">{data.bank_branch || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Account number</p>
                  <p className="font-medium">{data.bank_account_no || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Account holder</p>
                  <p className="font-medium">{data.bank_account_holder_name || "—"}</p>
                </div>
              </div>
              {data.bank_qr_url && (
                <a href={data.bank_qr_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">View Bank QR</a>
              )}
            </div>
          )
        )}
          </div>
        </TabsContent>

        <TabsContent value="mobile" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {showMobileViewEdit && (
              <>
                <Button
                  variant={mobileMode === "view" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMobileMode("view")}
                >
                  View
                </Button>
                <Button
                  variant={mobileMode === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMobileMode("edit")}
                >
                  Edit
                </Button>
              </>
            )}
          </div>

          <div className="bg-card rounded-xl border p-6 space-y-6">
            {mobileEdit ? (
              <>
                <div className="space-y-2">
                  <Label>App current version</Label>
                  <Input
                    type="text"
                    value={mobileVersion}
                    onChange={(e) => setMobileVersion(e.target.value)}
                    placeholder="1"
                  />
                  <p className="text-muted-foreground text-xs">
                    Must match the version compiled into the Android app exactly.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Android APK</Label>
                  <Input
                    type="file"
                    accept=".apk,application/vnd.android.package-archive"
                    className="cursor-pointer text-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
                    onChange={(e) => setAndroidApkFile(e.target.files?.[0] ?? null)}
                  />
                  {data?.android_file_url ? (
                    <p className="text-muted-foreground text-xs">
                      Current file on server; choose a file only to replace it.
                    </p>
                  ) : null}
                </div>
                {mobileUploadPct !== null ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Uploading… {mobileUploadPct}%</p>
                    <Progress value={mobileUploadPct} />
                  </div>
                ) : null}
                <Button
                  onClick={handleMobileSave}
                  disabled={updateMobileSettings.isPending}
                >
                  {updateMobileSettings.isPending ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              data && (
                <div className="space-y-4">
                  <div>
                    <p className="text-muted-foreground text-sm">App current version</p>
                    <p className="font-medium">{data.app_current_version?.trim() || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Android APK</p>
                    {data.android_file_url ? (
                      <a
                        href={data.android_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm underline"
                      >
                        Download current APK
                      </a>
                    ) : (
                      <p className="font-medium">Not uploaded</p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
