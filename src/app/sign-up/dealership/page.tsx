import { DealershipInquiryForm } from "@/components/auth/DealershipInquiryForm";

export default function DealershipSignUpPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 bg-[#050505] overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_45%_45%,rgba(16,185,129,0.06),transparent_52%)]" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
      <DealershipInquiryForm />
    </div>
  );
}
