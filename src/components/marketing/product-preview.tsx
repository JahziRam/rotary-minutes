import { CheckCircle2, FileText, Users } from "lucide-react";

export function ProductPreview({ locale }: { locale: string }) {
  const isFr = locale === "fr";

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-gold/20 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-navy-dark/80 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs text-white/40">clubminutes.api.mg</span>
        </div>
        <div className="grid min-h-[320px] grid-cols-[88px_1fr] sm:min-h-[360px]">
          <aside className="border-r border-white/10 bg-navy-dark p-3">
            <div className="mb-4 h-8 w-8 rounded-lg bg-gold/20" />
            {[FileText, Users, CheckCircle2].map((Icon, i) => (
              <div
                key={i}
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                  i === 0 ? "bg-gold text-navy-dark" : "text-white/40"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </aside>
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                  {isFr ? "Procès-verbal" : "Meeting minutes"}
                </p>
                <p className="text-sm font-semibold text-white">
                  {isFr ? "Réunion statutaire — Mars 2026" : "Statutory meeting — Mar 2026"}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                {isFr ? "En révision" : "In review"}
              </span>
            </div>
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              {[
                isFr ? "Ouverture & quorum validé" : "Opening & quorum confirmed",
                isFr ? "Décisions du conseil d'administration" : "Board decisions recorded",
                isFr ? "Actions assignées aux membres" : "Action items assigned",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-xs text-white/75">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-dark">
                {isFr ? "Exporter PDF" : "Export PDF"}
              </span>
              <span className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70">
                QR {isFr ? "authentifié" : "verified"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}