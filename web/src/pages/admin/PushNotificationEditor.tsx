import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  useAdminPushNotification,
  useAdminCreatePushNotification,
  useAdminUpdatePushNotification,
} from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/api/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function mergeReceivers(prev: User[], incoming: User[]): User[] {
  const m = new Map<number, User>();
  for (const u of prev) m.set(u.id, u);
  for (const u of incoming) m.set(u.id, u);
  return Array.from(m.values());
}

export default function PushNotificationEditor({ notificationId }: { notificationId?: number }) {
  const navigate = useNavigate();
  const isEdit = notificationId != null && notificationId > 0;
  const { data: existing, isLoading } = useAdminPushNotification(isEdit ? notificationId : null);
  const createMut = useAdminCreatePushNotification();
  const updateMut = useAdminUpdatePushNotification(notificationId ?? 0);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [receivers, setReceivers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [bulkPhones, setBulkPhones] = useState("");
  const [resolving, setResolving] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title ?? "");
      setMessage(existing.message ?? "");
      setReceivers((existing.receivers ?? []) as User[]);
    }
  }, [existing]);

  const searchUsers = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchLoading(true);
    try {
      const res = await adminApi.getUsers({ search: term, page_size: 25 });
      setUserSearchResults(res.results);
    } catch {
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userSearchOpen) return;
    const t = window.setTimeout(() => {
      void searchUsers(userSearch);
    }, 300);
    return () => window.clearTimeout(t);
  }, [userSearch, userSearchOpen, searchUsers]);

  const handleAddAllUsers = async () => {
    setAddingAll(true);
    try {
      const acc: User[] = [];
      let page = 1;
      for (;;) {
        const res = await adminApi.getUsers({ page, page_size: 100 });
        acc.push(...res.results);
        if (!res.next) break;
        page += 1;
      }
      setReceivers((prev) => mergeReceivers(prev, acc));
      toast.success(`Added ${acc.length} users (merged with existing selection).`);
    } catch {
      toast.error("Could not load all users.");
    } finally {
      setAddingAll(false);
    }
  };

  const handleResolvePhones = async () => {
    const lines = bulkPhones
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Paste at least one phone number.");
      return;
    }
    setResolving(true);
    try {
      const { user_ids, missing } = await adminApi.resolvePushReceiverPhones(lines);
      if (missing.length) {
        toast.warning(
          `Unknown phones (${missing.length}): ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}`,
        );
      }
      if (!user_ids.length) {
        toast.error("No matching users.");
        return;
      }
      const fetched = await Promise.all(user_ids.map((id) => adminApi.getUser(id)));
      setReceivers((prev) => mergeReceivers(prev, fetched));
      toast.success(`Resolved ${user_ids.length} user(s).`);
      setBulkPhones("");
    } catch {
      toast.error("Failed to resolve phones.");
    } finally {
      setResolving(false);
    }
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("message", message.trim());
    if (imageFile) fd.append("image", imageFile);
    for (const u of receivers) {
      fd.append("receiver_ids", String(u.id));
    }
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    if (!receivers.length) {
      toast.error("Add at least one receiver.");
      return;
    }
    setSaving(true);
    const fd = buildFormData();
    if (isEdit) {
      updateMut.mutate(fd, {
        onSuccess: () => {
          toast.success("Saved");
          navigate(`/system/push-notifications/${notificationId}`);
        },
        onError: () => {
          toast.error("Failed to save");
          setSaving(false);
        },
      });
    } else {
      createMut.mutate(fd, {
        onSuccess: (created) => {
          toast.success("Created");
          navigate(`/system/push-notifications/${created.id}`);
        },
        onError: () => {
          toast.error("Failed to create");
          setSaving(false);
        },
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/system/push-notifications/${notificationId}` : "/system/push-notifications"}>
          <Button variant="outline" size="icon" type="button">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Edit push notification" : "New push notification"}</h1>
          <p className="text-muted-foreground text-sm">Title, message, optional image, and receivers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pn-title">Title *</Label>
              <Input
                id="pn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pn-message">Message *</Label>
              <Textarea
                id="pn-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Body text shown in the notification"
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Image (optional)</Label>
              <ImageFileField
                label="Attachment"
                currentUrl={imageFile ? undefined : existing?.image_url ?? undefined}
                onFileChange={setImageFile}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receivers ({receivers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={addingAll} onClick={() => void handleAddAllUsers()}>
                {addingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add all users
              </Button>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Search user
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[min(100vw-2rem,22rem)]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Name or phone…"
                      value={userSearch}
                      onValueChange={setUserSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {userSearchLoading ? "Searching…" : userSearch.trim().length < 2 ? "Type 2+ characters" : "No users."}
                      </CommandEmpty>
                      <CommandGroup>
                        {userSearchResults.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.id}-${u.phone}-${u.name}`}
                            onSelect={() => {
                              setReceivers((prev) => mergeReceivers(prev, [u]));
                              setUserSearchOpen(false);
                              setUserSearch("");
                            }}
                          >
                            <span className="truncate">
                              {u.name || u.phone} — {u.phone}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Bulk phones (one per line or comma-separated)</Label>
              <Textarea
                value={bulkPhones}
                onChange={(e) => setBulkPhones(e.target.value)}
                placeholder="9800000000&#10;9800000001"
                rows={3}
              />
              <Button type="button" variant="outline" disabled={resolving} onClick={() => void handleResolvePhones()}>
                {resolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Resolve phones
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
              {receivers.map((u) => (
                <Badge key={u.id} variant="secondary" className="gap-1 pr-1 py-1">
                  <span className="truncate max-w-[200px]">{u.name || u.phone}</span>
                  <span className="text-muted-foreground">({u.phone})</span>
                  <button
                    type="button"
                    className="ml-1 rounded-sm hover:bg-muted px-1"
                    aria-label="Remove"
                    onClick={() => setReceivers((prev) => prev.filter((x) => x.id !== u.id))}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/system/push-notifications/${notificationId}` : "/system/push-notifications")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
