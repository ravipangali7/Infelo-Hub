import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Inbox,
  MailOpen,
  RotateCcw,
  Sparkles,
} from "lucide-react";
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
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return "Earlier today";
  if (diff < 86_400_000) return "Today";
  if (diff < 172_800_000) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Short, human-readable bucket for the technical `kind` code. */
function friendlyNotificationCategory(kind: string | null | undefined): string | null {
  const k = (kind ?? "").trim();
  if (!k) return null;
  if (k.startsWith("USER_")) {
    const n = k.slice(5);
    if (/^0[1-6]$/.test(n)) return "Wallet";
    if (["07", "26", "29"].includes(n)) return "Transactions";
    if (["08", "09", "10"].includes(n)) return "Verification";
    if (["11", "12", "13"].includes(n)) return "Payout";
    if (["14", "15", "16", "17", "21", "22"].includes(n)) return "Orders";
    if (["18", "19", "20", "27"].includes(n)) return "Campaigns";
    if (["23", "24", "25"].includes(n)) return "Account";
    if (n === "28") return "Wishlist";
  }
  if (k.startsWith("ADMIN_")) return "Team";
  return "News";
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
  const category = friendlyNotificationCategory(n.kind);

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
        "group relative overflow-hidden rounded-2xl border transition-all duration-200",
        "shadow-sm hover:shadow-md",
        n.is_read
          ? "border-border/70 bg-card"
          : "border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card ring-1 ring-primary/10",
        interactive && "cursor-pointer hover:border-primary/35"
      )}
    >
      {!n.is_read && (
        <div
          className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/60"
          aria-hidden
        />
      )}
      <div className="flex gap-3 p-4 pl-5">
        <div className="shrink-0">
          {n.image_url ? (
            <img
              src={n.image_url}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover shadow-inner ring-1 ring-black/5"
            />
          ) : (
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-black/5",
                n.is_read ? "bg-muted" : "bg-primary/12"
              )}
            >
              <Bell className={cn("h-7 w-7", n.is_read ? "text-muted-foreground" : "text-primary")} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-[15px] leading-snug text-foreground">{n.title}</h2>
                {!n.is_read && (
                  <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_rgba(21,101,192,0.25)]" />
                )}
              </div>
              {category ? (
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-primary/80">{category}</p>
              ) : null}
            </div>
            <time
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
              dateTime={n.created_at}
            >
              {formatRelativeTime(n.created_at)}
            </time>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {n.message}
          </p>
          {interactive && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary/90">
              Open related screen
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3">
            <Button
              type="button"
              variant="secondary"
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

function EmptyNotificationsState({ variant }: { variant: "unread" | "read" }) {
  const isUnread = variant === "unread";
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/30 to-muted/5 px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {isUnread ? <Inbox className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
      </div>
      <p className="font-display text-lg font-semibold text-foreground">
        {isUnread ? "You're all caught up" : "No read items yet"}
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {isUnread
          ? "New alerts about orders, wallet, and campaigns will show up here."
          : "When you mark messages as read, they move here so you can review them later."}
      </p>
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
      ? "Alerts for your staff account (same inbox as the client API)."
      : "Orders, wallet, campaigns, and updates — tap a card to jump to the right screen.";

  const outerClass =
    variant === "admin"
      ? "min-h-[calc(100vh-8rem)] bg-background"
      : "min-h-screen bg-gradient-to-b from-background via-background to-muted/20";

  return (
    <div className={outerClass}>
      <header
        className={
          variant === "admin"
            ? "border-b border-border bg-card/40 px-4 py-4 md:px-6"
            : "sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl"
        }
      >
        <div
          className={cn(
            "py-3",
            variant === "admin" ? "max-w-4xl mx-auto px-4 md:px-6" : "client-page-container client-page-content"
          )}
        >
          <div className="flex items-center gap-4">
            <Link
              to={backHref}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors hover:bg-muted/70"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className={cn("font-semibold font-display", variant === "admin" ? "text-xl" : "text-xl")}>{title}</h1>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">{subtitle}</p>
            </div>
          </div>

          {variant === "client" && !isLoading && !error && (
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                  <Bell className="h-3.5 w-3.5" />
                </span>
                {unreadList.length} unread
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                {readList.length} read
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
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
        </div>
      </header>

      <div
        className={cn(
          "space-y-4 pb-12 pt-5",
          variant === "admin" ? "max-w-4xl mx-auto px-4 md:px-6" : "client-page-container client-page-content"
        )}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as "unread" | "read")} className="w-full">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="unread" className="rounded-lg text-sm font-medium data-[state=active]:shadow-sm">
              Unread {unreadList.length > 0 ? `(${unreadList.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="read" className="rounded-lg text-sm font-medium data-[state=active]:shadow-sm">
              Read {readList.length > 0 ? `(${readList.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="unread" className="mt-5 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Could not load notifications.</p>
            ) : unreadList.length === 0 ? (
              <EmptyNotificationsState variant="unread" />
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
          <TabsContent value="read" className="mt-5 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Could not load notifications.</p>
            ) : readList.length === 0 ? (
              <EmptyNotificationsState variant="read" />
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
