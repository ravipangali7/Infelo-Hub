import { useParams } from "react-router-dom";
import PushNotificationEditor from "./PushNotificationEditor";

export default function PushNotificationsEdit() {
  const { id } = useParams<{ id: string }>();
  const notificationId = id ? Number(id) : NaN;
  return <PushNotificationEditor notificationId={notificationId} />;
}
