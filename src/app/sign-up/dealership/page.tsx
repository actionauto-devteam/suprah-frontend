import { DealershipInquiryForm } from "@/components/auth/DealershipInquiryForm";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

export default function DealershipSignUpPage() {
  return (
    <AuthSplitLayout>
      <DealershipInquiryForm />
    </AuthSplitLayout>
  );
}
