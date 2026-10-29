import { redirect } from "next/navigation";

export default function MyCallsRedirect() {
  redirect("/crm/settings/phone-system?tab=my-calls");
}
