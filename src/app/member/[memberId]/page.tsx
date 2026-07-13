import Link from "next/link";
import { CarFront, CheckCircle2, CreditCard, ShieldCheck, Tag, Wrench } from "lucide-react";
import { ACTION_AUTO_BENEFITS_REP, ACTION_AUTO_SERVICE_DISCOUNT_PERCENT } from "@/lib/customer-benefits";

type MemberBenefitsPageProps = {
  params: Promise<{ memberId: string }>;
  searchParams?: Promise<{ name?: string; dealer?: string }>;
};

function shortMemberId(memberId: string) {
  const raw = String(memberId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (raw.length <= 12) return raw || "MEMBER";
  const tail = raw.slice(-12);
  return `${tail.slice(0, 4)} ${tail.slice(4, 8)} ${tail.slice(8, 12)}`;
}

export default async function MemberBenefitsPage({ params, searchParams }: MemberBenefitsPageProps) {
  const { memberId } = await params;
  const query = searchParams ? await searchParams : {};
  const memberName = query.name?.trim() || "Action Auto Utah Customer";
  const dealer = query.dealer?.trim() || "Action Auto Utah";
  const memberCode = shortMemberId(memberId);

  return (
    <main className="min-h-screen bg-[#050807] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
              {dealer}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">
              Customer Service Benefit
            </h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-300/25">
            <Tag className="h-6 w-6 text-emerald-300" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-[linear-gradient(145deg,#071511,#0d2a1f_55%,#07110e)] p-5 shadow-2xl shadow-black/50 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-100 ring-1 ring-white/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Verified customer benefit
            </div>

            <p className="mt-5 text-5xl font-black tracking-tight text-emerald-300 sm:text-7xl">
              {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}%
            </p>
            <p className="mt-1 text-xl font-black uppercase tracking-tight sm:text-2xl">
              off eligible services
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              This customer receives {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% off eligible service work for being an Action Auto Utah customer.
              Please confirm customer status and service eligibility before checkout.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/7 p-4 ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Customer</p>
                <p className="mt-1 text-lg font-bold">{memberName}</p>
              </div>
              <div className="rounded-2xl bg-white/7 p-4 ring-1 ring-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Member ID</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider">{memberCode}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <CreditCard className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm font-bold">Show the virtual card</p>
            <p className="mt-1 text-xs leading-5 text-white/55">The QR code on the customer card opens this benefit page.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <CarFront className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm font-bold">Register VIN</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Customers can add their VIN in My Garage to keep vehicle records connected.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Wrench className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm font-bold">Apply service discount</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Use the customer benefit for eligible service work at participating locations.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <p className="text-sm font-black">Store verification</p>
              <p className="mt-1 text-sm leading-6 text-white/70">
                If a store needs confirmation, contact {ACTION_AUTO_BENEFITS_REP.name} at corporate for verification.
              </p>
              <p className="mt-2 text-xs text-white/45">
                {ACTION_AUTO_BENEFITS_REP.title} - {ACTION_AUTO_BENEFITS_REP.company}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/customer?tab=vehicles"
            className="flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-4 text-sm font-black text-zinc-950 transition hover:bg-emerald-400"
          >
            Register VIN in My Garage
          </Link>
          <Link
            href="/customer/network"
            className="flex h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-white transition hover:bg-white/[0.08]"
          >
            Find Service Network
          </Link>
        </div>
      </section>
    </main>
  );
}
