import { redirect } from "next/navigation";

export default function CallRoutingRedirect() {
  redirect("/crm/settings/phone-system?tab=menu");
}
