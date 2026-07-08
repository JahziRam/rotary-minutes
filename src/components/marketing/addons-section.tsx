import { getTranslations } from "next-intl/server";
import { getActivePublicAddons } from "@/lib/plans";
import { formatPrice } from "@/lib/plans-utils";
import { Puzzle } from "lucide-react";

export const dynamic = "force-dynamic";

export async function AddonsSection({ locale }: { locale: string }) {
  const t = await getTranslations("landing.addons");
  const { addons, billing } = await getActivePublicAddons(locale);

  if (addons.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 bg-white border-t">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-gray-900">{t("title")}</h2>
          <p className="text-gray-500 mt-2 max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {addons.map((addon) => (
            <div
              key={addon.key}
              className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 flex flex-col gap-2"
            >
              <div className="h-9 w-9 rounded-lg bg-navy/10 flex items-center justify-center">
                <Puzzle className="h-4 w-4 text-navy" />
              </div>
              <h3 className="font-semibold text-gray-900">{addon.name}</h3>
              <p className="text-sm text-navy font-medium mt-auto">
                +{formatPrice(addon.priceMonthly, billing.currency, locale)}
                <span className="text-gray-500 font-normal">/{t("perMonth")}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">{t("note")}</p>
      </div>
    </section>
  );
}