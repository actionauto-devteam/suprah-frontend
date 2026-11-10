import type { FinanceApplicationData } from "@/lib/schemas/finance-schema";

/*
 * The full-page finance application sends every answer to the car's
 * dealership (2026-11-10): name, contact, date of birth, SSN, address,
 * employer, job title, yearly income and time at the job (the same record the
 * finance pop-up fills), plus application type, marital status, driver's
 * license number (encrypted when stored, like the SSN), housing, work phone,
 * pay frequency, a reference and a trade-in.
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
    applicationType: FinanceApplicationData["personal"]["applicationType"];
    maritalStatus: FinanceApplicationData["personal"]["maritalStatus"];
    driversLicenseNumber: string;
  };
  employmentInfo: {
    employer: string;
    jobTitle: string;
    income: string;
    incomeFrequency: "Yearly";
    yearsAtJob: string;
    workPhone?: string;
    payFrequency: FinanceApplicationData["employment"]["incomeFrequency"];
  };
  residence: {
    housingStatus: FinanceApplicationData["residence"]["housingStatus"];
    monthlyPayment: number;
    yearsAtAddress: number;
    monthsAtAddress: number;
  };
  reference: { name: string; relationship: string; phone: string };
  tradeIn: { hasTradeIn: boolean; year?: string; make?: string; model?: string; mileage?: string };
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

const wholeOrZero = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const optionalText = (value: unknown): string | undefined => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
};

export function financeApplicationPayload(vehicleId: string, data: FinanceApplicationData): FinanceApplicationPayload {
  const { personal, contact, residence, employment, reference, tradeIn } = data;
  const income = Number(employment.annualIncome);
  const hasTradeIn = tradeIn.hasTradeIn === true;
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
      applicationType: personal.applicationType,
      maritalStatus: personal.maritalStatus,
      driversLicenseNumber: personal.dlNumber.trim(),
    },
    employmentInfo: {
      employer: employment.employerName.trim(),
      jobTitle: employment.jobTitle.trim(),
      // The form asks for annual gross income; how often they're paid is kept too.
      income: Number.isFinite(income) ? String(income) : "",
      incomeFrequency: "Yearly",
      yearsAtJob: timeAtJob(employment.employmentYears, employment.employmentMonths),
      workPhone: optionalText(employment.workPhone),
      payFrequency: employment.incomeFrequency,
    },
    residence: {
      housingStatus: residence.housingStatus,
      monthlyPayment: wholeOrZero(residence.monthlyPayment),
      yearsAtAddress: wholeOrZero(residence.yearsAtAddress),
      monthsAtAddress: wholeOrZero(residence.monthsAtAddress),
    },
    reference: {
      name: reference.refName.trim(),
      relationship: reference.refRelationship.trim(),
      phone: reference.refPhone.trim(),
    },
    tradeIn: hasTradeIn
      ? {
          hasTradeIn: true,
          year: optionalText(tradeIn.tradeYear),
          make: optionalText(tradeIn.tradeMake),
          model: optionalText(tradeIn.tradeModel),
          mileage: optionalText(tradeIn.tradeMileage),
        }
      : { hasTradeIn: false },
  };
}
