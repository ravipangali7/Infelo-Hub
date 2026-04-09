import { useTranslation } from "react-i18next";
import { NotificationsInbox } from "@/components/NotificationsInbox";

const Notifications = () => {
  const { t } = useTranslation("pages");
  return <NotificationsInbox variant="client" title={t("misc.notifications.title")} />;
};

export default Notifications;
