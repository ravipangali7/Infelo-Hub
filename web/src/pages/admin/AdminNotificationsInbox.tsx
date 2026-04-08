import { NotificationsInbox } from "@/components/NotificationsInbox";

/** Staff inbox: same client notification API and FCM token as the mobile hub WebView. */
export default function AdminNotificationsInbox() {
  return <NotificationsInbox variant="admin" />;
}
