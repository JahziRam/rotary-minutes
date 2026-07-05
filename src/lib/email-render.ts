export type EmailTemplateVars = Record<string, string>;

export function renderEmailContent(
  content: string,
  vars: EmailTemplateVars
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export function buildClubEmailVars(opts: {
  clubName: string;
  locale: string;
  firstName?: string;
  lastName?: string;
  meetingDate?: string;
  meetingLocation?: string;
  minuteTitle?: string;
  verifyUrl?: string;
  dashboardUrl?: string;
}): EmailTemplateVars {
  const name = [opts.firstName, opts.lastName].filter(Boolean).join(" ");
  return {
    clubName: opts.clubName,
    firstName: opts.firstName ?? "",
    lastName: opts.lastName ?? "",
    memberName: name || (opts.locale === "fr" ? "Membre" : "Member"),
    meetingDate: opts.meetingDate ?? "",
    meetingLocation: opts.meetingLocation ?? "",
    minuteTitle: opts.minuteTitle ?? "",
    verifyUrl: opts.verifyUrl ?? "",
    dashboardUrl: opts.dashboardUrl ?? "",
  };
}