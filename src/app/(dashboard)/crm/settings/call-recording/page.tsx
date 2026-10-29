import { redirect } from "next/navigation";

export default function CallRecordingRedirect() {
  redirect("/crm/settings/phone-system?tab=recordings");
}
