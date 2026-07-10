import { DEFAULT_APP_NAME } from "@/lib/app-branding-shared";

/** Legal entity operating the SaaS platform (default product name). */
export const COMPANY_LEGAL = {
  productName: DEFAULT_APP_NAME,
  productAlias: "Club Minutes",
  companyName: "Visa Guard USA, LLC",
  addressLine1: "169 Madison Ave STE 15839",
  city: "New York",
  state: "NY",
  postalCode: "10016",
  country: "US",
  legalEmail: "legal@rotaryminutes.app",
  privacyEmail: "privacy@rotaryminutes.app",
} as const;

export function formatCompanyAddress(inline = false): string {
  const cityLine = `${COMPANY_LEGAL.city}, ${COMPANY_LEGAL.state} ${COMPANY_LEGAL.postalCode}`;
  if (inline) {
    return `${COMPANY_LEGAL.addressLine1}, ${cityLine}, ${COMPANY_LEGAL.country}`;
  }
  return `${COMPANY_LEGAL.addressLine1}\n${cityLine}, ${COMPANY_LEGAL.country}`;
}

export function privacyControllerBlock(): string {
  return `${COMPANY_LEGAL.companyName}\n${formatCompanyAddress()}\nEmail: ${COMPANY_LEGAL.privacyEmail}`;
}