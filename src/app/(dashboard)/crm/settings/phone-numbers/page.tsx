import { redirect } from "next/navigation";

export default function PhoneNumbersRedirect() {
  redirect("/crm/settings/phone-system?tab=numbers");
}
