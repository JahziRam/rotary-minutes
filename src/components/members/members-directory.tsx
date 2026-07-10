"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ListPagination,
  ListToolbar,
  useClientList,
} from "@/components/ui/list-controls";
import { matchesAny } from "@/lib/client-list";
import { MemberDuesBadge } from "@/components/treasury/member-dues-badge";
import { resolveMemberPhotoUrl } from "@/lib/media-url";

export type MemberCard = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string | null;
  isActive: boolean;
  commissionName: string | null;
  email?: string | null;
};

type DuesBadge = {
  status: string;
  amountDue?: number;
  amountPaid?: number;
} | null | undefined;

export function MembersDirectory({
  members,
  locale,
  duesByMemberId,
}: {
  members: MemberCard[];
  locale: string;
  duesByMemberId?: Record<string, DuesBadge>;
}) {
  const t = useTranslations();
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  const filterFn = useCallback(
    (m: MemberCard, q: string) => {
      if (activeFilter === "active" && !m.isActive) return false;
      if (activeFilter === "inactive" && m.isActive) return false;
      return matchesAny(
        [m.firstName, m.lastName, m.position, m.commissionName, m.email],
        q
      );
    },
    [activeFilter]
  );

  const { query, setQuery, page, setPage, pageSlice, filtered } = useClientList(
    members,
    filterFn,
    12
  );

  if (members.length === 0) return null;

  return (
    <div className="space-y-4">
      <ListToolbar query={query} onQueryChange={setQuery}>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(
            [
              ["all", t("common.all")],
              ["active", t("members.active")],
              ["inactive", t("members.inactive")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`px-3 h-10 ${
                activeFilter === key
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </ListToolbar>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          {t("common.noResults")}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageSlice.items.map((member) => (
            <Link key={member.id} href={`/${locale}/members/${member.id}`}>
              <Card
                className={`hover:shadow-md transition-shadow cursor-pointer h-full ${
                  !member.isActive ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  {member.photoUrl ? (
                    <Image
                      src={
                        resolveMemberPhotoUrl(member.id, member.photoUrl) ??
                        member.photoUrl
                      }
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-navy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {member.position || member.commissionName || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {duesByMemberId && member.isActive && (
                      <MemberDuesBadge dues={duesByMemberId[member.id] as never} />
                    )}
                    <Badge variant={member.isActive ? "success" : "muted"}>
                      {member.isActive
                        ? t("members.active")
                        : t("members.inactive")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ListPagination
        page={page}
        totalPages={pageSlice.totalPages}
        total={pageSlice.total}
        start={pageSlice.start}
        end={pageSlice.end}
        onPageChange={setPage}
      />
    </div>
  );
}
