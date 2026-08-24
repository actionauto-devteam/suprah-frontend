export const ACTION_AUTO_SERVICE_DISCOUNT_PERCENT = 18;

export const ACTION_AUTO_BENEFITS_REP = {
  name: "Justin Soha",
  title: "VP of Operations & Market Ops Manager",
  company: "Lube Management Corp, Utah",
};

export function buildMemberBenefitsUrl(memberId: string, memberName: string, dealerName: string = "Your Dealership") {
  const params = new URLSearchParams({
    name: memberName,
    dealer: dealerName,
  });

  if (typeof window !== "undefined") {
    return `${window.location.origin}/member/${memberId}?${params.toString()}`;
  }

  return `/member/${memberId}?${params.toString()}`;
}
