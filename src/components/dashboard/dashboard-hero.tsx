import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export function DashboardHero({
  greeting,
  clubName,
  newMeetingLabel,
  newMinuteLabel,
  locale,
}: {
  greeting: string;
  clubName: string;
  newMeetingLabel: string;
  newMinuteLabel: string;
  locale: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy to-navy-dark text-white p-6 sm:p-8 shadow-lg">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-white/5 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold/90">
          {clubName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight">
          {greeting}
        </h1>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href={`/${locale}/meetings/new`}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-navy-dark hover:bg-gold-light shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            {newMeetingLabel}
          </Link>
          <Link
            href={`/${locale}/minutes/new`}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-lg text-sm font-medium border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <FileText className="h-4 w-4" />
            {newMinuteLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}