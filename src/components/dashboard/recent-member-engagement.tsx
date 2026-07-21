import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS, es } from "date-fns/locale";
import {
  Bell,
  FileText,
  LogIn,
  MailOpen,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberEngagementItem } from "@/lib/queries/member-engagement";

const KIND_ICON = {
  login: LogIn,
  minute_read: FileText,
  notification: Bell,
  email_open: MailOpen,
} as const;

export async function RecentMemberEngagement({
  locale,
  items,
}: {
  locale: string;
  items: MemberEngagementItem[];
}) {
  const t = await getTranslations("dashboard.memberEngagement");
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : fr;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-navy shrink-0" aria-hidden />
          <CardTitle className="truncate">{t("title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">{t("empty")}</p>
        ) : (
          <ul className="space-y-1.5 max-h-[22rem] overflow-y-auto pr-1">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              const relative = formatDistanceToNow(item.at, {
                addSuffix: true,
                locale: dateLocale,
              });
              const kindLabel = t(`kinds.${item.kind}`);
              const profileHref = item.memberId
                ? `/${locale}/members/${item.memberId}`
                : null;
              const minuteHref =
                item.kind === "minute_read" && item.href
                  ? `/${locale}${item.href}`
                  : null;

              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-navy" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="text-sm font-medium text-gray-900 truncate hover:text-navy hover:underline"
                        >
                          {item.displayName}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.displayName}
                        </p>
                      )}
                      <time
                        className="text-[10px] text-gray-400 shrink-0"
                        dateTime={item.at.toISOString()}
                        title={item.at.toLocaleString(locale)}
                      >
                        {relative}
                      </time>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-navy/70">{kindLabel}</span>
                      {item.detail ? (
                        <>
                          {" · "}
                          {minuteHref ? (
                            <Link
                              href={minuteHref}
                              className="hover:underline text-gray-600"
                            >
                              {item.detail}
                            </Link>
                          ) : (
                            <span className="text-gray-600">{item.detail}</span>
                          )}
                        </>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[10px] text-gray-400 mt-3">{t("hint")}</p>
      </CardContent>
    </Card>
  );
}
