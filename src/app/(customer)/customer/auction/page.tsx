import { redirect } from "next/navigation";

export default function AuctionPage() {
  redirect("/customer?tab=sell");
}
