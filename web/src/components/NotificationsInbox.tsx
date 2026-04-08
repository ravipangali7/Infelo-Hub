import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Check, MailOpen, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientNotifications,
  useMarkAllNotificationsRead,
  useMarkAllNotificationsUnread,
  useMarkNotificationRead,
  useMarkNotificationUnread,
} from "@/api/hooks";
import type { ClientInboxNotification } from "@/api/types";
import { notificationRowToPath } from "@/lib/notificationRoutes";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return "Just now";
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString();
}

function NotificationRow({
  n,
  onToggleRead,
  busyId,
  onOpenRelated,
}: {
  n: ClientInboxNotification;
  onToggleRead: (id: number, isRead: boolean) => void;
  busyId: number | null;
  onOpenRelated?: () => void;
}) {
  const busy = busyId === n.id;
  const interactive = Boolean(onOpenRelated);
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpenRelated : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenRelated?.();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors",
        !n.is_read && "border-primary/25 bg-primary/[0.03]",
        interactive && "cursor-pointer hover:bg-muted/40"
      )}
    >
      <div className="flex gap-3">
        {n.image_url ? (
          <img src={n.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-sm leading-tight">{n.title}</h2>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(n.created_at)}</span>
          </div>
          {n.kind ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/80">{n.kind}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{n.message}</p>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(n.id, n.is_read);
              }}
            >
              {n.is_read ? (
                <>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Mark unread
                </>
              ) : (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Mark read
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type NotificationsInboxVariant = "client" | "admin";

export function NotificationsInbox({ variant = "client" }: { variant?: NotificationsInboxVariant }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const { data, isLoading, error } = useClientNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markAllUnread = useMarkAllNotificationsUnread();
  const markRead = useMarkNotificationRead();
  const markUnread = useMarkNotificationUnread();
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = data ?? [];
  const unreadList = useMemo(() => list.filter((n) => !n.is_read), [list]);
  const readList = useMemo(() => list.filter((n) => n.is_read), [list]);

  const openRelated = (n: ClientInboxNotification) => {
    const path = notificationRowToPath(n);
    navigate(path);
  };

  const onToggleRead = (id: number, isRead: boolean) => {
    setBusyId(id);
    const done = () => setBusyId(null);
    if (isRead) {
      markUnread.mutate(id, { onSettled: done });
    } else {
      markRead.mutate(id, { onSettled: done });
    }
  };

  const backHref = variant === "admin" ? "/system" : "/";
  const title = variant === "admin" ? "My notifications" : "Notifications";
  const subtitle =
    variant === "admin"
      ? "Alerts sent to your staff account (same inbox as the client API)."
      : "Push messages sent to your account";

  const outerClass =
    variant === "admin"
      ? "min-h-[calc(100vh-8rem)] bg-background"
      : "min-h-screen bg-background";

  return (
    <div className={outerClass}>
      <header
        className={
          variant === "admin"
            ? "border-b border-border bg-card/40 px-4 py-4 md:px-6"
            : "client-page-container client-page-content py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40 border-b border-border"
        }
      >
        <div className={cn("flex items-center gap-4", variant === "admin" && "max-w-4xl mx-auto")}>
          <Link
            to={backHref}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors hover:bg-muted/70"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className={cn("font-semibold font-display", variant === "admin" ? "text-xl" : "text-lg")}>{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className={cn("mt-3 flex flex-wrap gap-2", variant === "admin" && "max-w-4xl mx-auto")}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9"
            disabled={unreadList.length === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <MailOpen className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={readList.length === 0 || markAllUnread.isPending}
            onClick={() => markAllUnread.mutate()}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Mark all unread
          </Button>
        </div>
      </header>

      <div
        className={cn(
          "space-y-4 pb-8 pt-4",
          variant === "admin" ? "max-w-4xl mx-auto px-4 md:px-6" : "client-page-container client-page-content"
        )}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as "unread" | "read")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="unread" className="rounded-lg text-sm">
              Unread {unreadList.length > 0 ? `(${unreadList.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="read" className="rounded-lg text-sm">
              Read {readList.length > 0 ? `(${readList.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="unread" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Could not load notifications.</p>
            ) : unreadList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No unread notifications.</p>
            ) : (
              unreadList.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onToggleRead={onToggleRead}
                  busyId={busyId}
                  onOpenRelated={() => openRelated(n)}
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="read" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Could not load notifications.</p>
            ) : readList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No read notifications yet.</p>
            ) : (
              readList.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onToggleRead={onToggleRead}
                  busyId={busyId}
                  onOpenRelated={() => openRelated(n)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
