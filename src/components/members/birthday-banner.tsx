import { Cake } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

export function BirthdayBanner({
  birthdays,
  locale,
}: {
  birthdays: Array<{
    id?: string;
    firstName: string;
    lastName: string;
    nextBirthday: Date;
    kind?: "member" | "spouse";
    relatedMemberName?: string;
  }>;
  locale: string;
}) {
  if (birthdays.length === 0) return null;
  const dateLocale = locale === "fr" ? fr : enUS;
  const isFr = locale === "fr";
  const isEs = locale === "es";

  return (
    <div className="rounded-xl border border-pink-200 bg-pink-50/80 p-4 flex items-start gap-3">
      <Cake className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-pink-900">
          {isFr
            ? "Anniversaires à venir"
            : isEs
              ? "Próximos cumpleaños"
              : "Upcoming birthdays"}
        </p>
        <ul className="mt-1 text-pink-800 space-y-0.5">
          {birthdays.slice(0, 8).map((b, i) => {
            const name = `${b.firstName} ${b.lastName}`.trim();
            const spouseTag =
              b.kind === "spouse"
                ? isFr
                  ? ` (conjoint${b.relatedMemberName ? ` de ${b.relatedMemberName}` : ""})`
                  : isEs
                    ? ` (cónyuge${b.relatedMemberName ? ` de ${b.relatedMemberName}` : ""})`
                    : ` (spouse${b.relatedMemberName ? ` of ${b.relatedMemberName}` : ""})`
                : "";
            return (
              <li key={b.id ?? i}>
                {name}
                {spouseTag} —{" "}
                {format(b.nextBirthday, "d MMMM", { locale: dateLocale })}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}