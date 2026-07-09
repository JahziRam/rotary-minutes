/** Legal entity operating Rotary Minutes / Club Minutes. */
export const COMPANY_LEGAL = {
  productName: "Rotary Minutes",
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