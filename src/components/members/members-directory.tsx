"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { ServerListPagination } from "@/components/ui/list-controls";
import { MemberDuesBadge } from "@/components/treasury/member-dues-badge";
import { MemberRoleSelect } from "@/components/members/member-role-select";
import { SendMemberLoginButton } from "@/components/members/send-member-login-button";
import { resolveMemberPhotoUrl } from "@/lib/media-url";
import type { PaginatedResult } from "@/lib/server-list";

export type MemberCard = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  position: string | null;
  isActive: boolean;
  commissionName: string | null;
  email?: string | null;
  userId?: string | null;
  hasAppAccount?: boolean;
  appRole?: string | null;
  customRoleId?: string | null;
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
  initialQuery = "",
  initialStatus = "all",
  listParams,
  roleLabels = {},
  canManageRoles = false,
  currentUserId,
  roleOptions = [],
  customRoles = [],
}: {
  members: PaginatedResult<MemberCard>;
  locale: string;
  duesByMemberId?: Record<string, DuesBadge>;
  initialQuery?: string;
  initialStatus?: string;
  listParams: Record<string, string | undefined>;
  roleLabels?: Record<string, string>;
  canManageRoles?: boolean;
  currentUserId?: string;
  roleOptions?: Array<{ value: string; label: string }>;
  customRoles?: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const basePath = `/${locale}/members`;

  function applyFilters(fd: FormData) {
    const params = new URLSearchParams();
    const q = (fd.get("q") as string)?.trim();
    const status = fd.get("status") as string;
    if (q) params.set("q", q);
    if (status && status !== "all") params.set("status", status);
    router.push(`${basePath}?${params.toString()}`);
  }

  if (members.total === 0 && !initialQuery && initialStatus === "all") return null;

  return (
    <div className="space-y-4">
      <form action={applyFilters} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[12rem] max-w-md">
          <input
            name="q"
            type="search"
            defaultValue={initialQuery}
            placeholder={t("common.search")}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
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
              type="submit"
              name="status"
              value={key}
              className={`px-3 h-10 ${
                initialStatus === key
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light"
        >
          {t("common.filter")}
        </button>
      </form>

      {members.items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{t("common.noResults")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.items.map((member) => (
            <Card
              key={member.id}
              className={`hover:shadow-md transition-shadow h-full ${
                !member.isActive ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Link
                  href={`/${locale}/members/${member.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {member.photoUrl ? (
                    <Image
                      src={
                        resolveMemberPhotoUrl(member.id, member.photoUrl) ?? member.photoUrl
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
                </Link>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {duesByMemberId && member.isActive && (
                    <MemberDuesBadge dues={duesByMemberId[member.id] as never} />
                  )}
                  {canManageRoles && (
                    <SendMemberLoginButton
                      memberId={member.id}
                      memberEmail={member.email}
                      isCurrentUser={member.userId === currentUserId}
                      compact
                      onSuccess={setToast}
                      onError={setToast}
                    />
                  )}
                  {canManageRoles ? (
                    <MemberRoleSelect
                      memberId={member.id}
                      role={member.appRole ?? null}
                      customRoleId={member.customRoleId ?? null}
                      hasAppAccount={member.hasAppAccount ?? false}
                      isCurrentUser={member.userId === currentUserId}
                      roleOptions={roleOptions}
                      customRoles={customRoles}
                      compact
                      onError={setToast}
                    />
                  ) : (
                    member.appRole &&
                    roleLabels[member.appRole] && (
                      <Badge variant="default" className="text-[10px]">
                        {roleLabels[member.appRole]}
                      </Badge>
                    )
                  )}
                  <Badge variant={member.isActive ? "success" : "muted"}>
                    {member.isActive ? t("members.active") : t("members.inactive")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <ServerListPagination
        basePath={basePath}
        page={members.page}
        totalPages={members.totalPages}
        total={members.total}
        start={members.start}
        end={members.end}
        searchParams={listParams}
      />
    </div>
  );
}