import { useTranslation } from "react-i18next";
import { NotificationsInbox } from "@/components/NotificationsInbox";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const Notifications = () => {
  const { t } = useTranslation(["pages", "client"]);
  return (
    <>
      <ClientAppSeo
        title={`${t("misc.notifications.title")} | ${t("client:brand")}`}
        description={t("misc.notifications.title")}
        canonicalPath="/notifications"
        siteName={t("client:brand")}
      />
      <NotificationsInbox variant="client" title={t("misc.notifications.title")} />
    </>
  );
};

export default Notifications;
