import type { FinanceApplicationData } from "@/lib/schemas/finance-schema";

/*
 * The full-page finance application sends what the dealership's finance
 * application record keeps (2026-11-09), the same record the finance pop-up
 * fills: name, contact, date of birth, SSN, address, employer, job title,
 * yearly income and time at the job. The form's other answers (license number,
 * marital status, housing, reference, trade-in, pay frequency) have no place
 * in that record yet.
 */

export type FinanceApplicationPayload = {
  vehicleId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: string;
    ssn: string;
    address: { street: string; city: string; state: string; zip: string };
  };
  employmentInfo: {
    employer: string;
    jobTitle: string;
    income: string;
    incomeFrequency: "Yearly";
    yearsAtJob: string;
  };
};

/** "2 years 3 months", "8 months", "1 year" or "Less than a month". */
export function timeAtJob(years: unknown, months: unknown): string {
  const y = Math.max(0, Math.floor(Number(years) || 0));
  const m = Math.max(0, Math.min(11, Math.floor(Number(months) || 0)));
  const parts = [
    y ? `${y} ${y === 1 ? "year" : "years"}` : "",
    m ? `${m} ${m === 1 ? "month" : "months"}` : "",
  ].filter(Boolean);
  return parts.join(" ") || "Less than a month";
}

export function financeApplicationPayload(vehicleId: string, data: FinanceApplicationData): FinanceApplicationPayload {
  const { personal, contact, residence, employment } = data;
  const income = Number(employment.annualIncome);
  return {
    vehicleId,
    personalInfo: {
      firstName: personal.firstName.trim(),
      lastName: personal.lastName.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      dob: personal.dob,
      ssn: personal.ssn,
      address: {
        street: residence.address.trim(),
        city: residence.city.trim(),
        state: residence.state.trim(),
        zip: residence.zipCode.trim(),
      },
    },
    employmentInfo: {
      employer: employment.employerName.trim(),
      jobTitle: employment.jobTitle.trim(),
      // The form asks for annual gross income.
      income: Number.isFinite(income) ? String(income) : "",
      incomeFrequency: "Yearly",
      yearsAtJob: timeAtJob(employment.employmentYears, employment.employmentMonths),
    },
  };
}
