"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  CreditCard,
  CalendarCheck,
  ListTodo,
  FolderOpen,
  Mail,
  Link2,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { linkMyMemberAccount } from "@/actions/member-portal";
import type { DuesStatus, ClubActionStatus, AttendanceCategory } from "@/generated/prisma/client";

type LinkedData = {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    position: string | null;
    photoUrl: string | null;
  };
  duesSummary: {
    fiscalYear: number;
    totalDue: number;
    totalPaid: number;
    pending: Array<{ id: string; amount: number; status: DuesStatus; dueDate: string; periodLabel: string | null }>;
    paid: Array<{ id: string; amount: number; status: DuesStatus }>;
  };
  attendances: Array<{
    id: string;
    category: AttendanceCategory;
    meeting: { id: string; title: string | null; date: string; type: string };
  }>;
  attendanceStats: { total: number; present: number; rate: number };
  actions: Array<{
    id: string;
    title: string;
    status: ClubActionStatus;
    priority: string;
    dueDate: string | null;
  }>;
  documents: Array<{
    id: string;
    title: string;
    category: string;
    fileUrl: string | null;
    fileName: string | null;
    createdAt: string;
    minuteId: string | null;
  }>;
  emailLogs: Array<{
    id: string;
    status: string;
    createdAt: string;
    campaignName: string;
    subject: string;
    sentAt: string | null;
  }>;
};

type UnlinkedData = {
  canAutoLink: boolean;
  emailMatchMember: { id: string; firstName: string; lastName: string } | null;
  userEmail: string | null;
};

const DUES_VARIANT: Record<DuesStatus, "success" | "warning" | "danger" | "muted"> = {
  PAID: "success",
  PENDING: "warning",
  OVERDUE: "danger",
  WAIVED: "muted",
};

export function MyAccountPanel({
  data,
  locale,
}: {
  data: LinkedData | UnlinkedData;
  locale: string;
}) {
  const t = useTranslations("memberPortal");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const dateLocale = locale === "fr" ? fr : enUS;

  if (!("member" in data)) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-navy/10 flex items-center justify-center">
            <User className="h-7 w-7 text-navy" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t("linkRequired")}</h2>
          <p className="text-sm text-gray-600">{t("linkDescription")}</p>
          {data.canAutoLink && data.emailMatchMember && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-gray-700">
                {t("emailMatchFound", {
                  name: `${data.emailMatchMember.firstName} ${data.emailMatchMember.lastName}`,
                })}
              </p>
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await linkMyMemberAccount();
                    if ("success" in result && result.success) {
                      setToast(t("linkSuccess"));
                      router.refresh();
                    } else if ("error" in result && result.error === "NO_MATCH") {
                      setToast(t("linkError"));
                    }
                  })
                }
              >
                <Link2 className="h-4 w-4" />
                {t("linkAccount")}
              </Button>
            </div>
          )}
          {!data.canAutoLink && (
            <p className="text-xs text-gray-500">{t("contactSecretary")}</p>
          )}
        </CardContent>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </Card>
    );
  }

  const { member, duesSummary, attendances, attendanceStats, actions, documents, emailLogs } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
          <User className="h-7 w-7 text-navy" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {member.firstName} {member.lastName}
          </h2>
          {member.position && (
            <p className="text-sm text-gray-500">{member.position}</p>
          )}
          {member.email && (
            <p className="text-sm text-gray-500">{member.email}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("dues")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-navy">
              {duesSummary.totalPaid.toFixed(0)} / {duesSummary.totalDue.toFixed(0)} €
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("fiscalYear", { year: duesSummary.fiscalYear })}
            </p>
            {duesSummary.pending.length > 0 && (
              <Badge variant="warning" className="mt-2">
                {duesSummary.pending.length} {t("pending")}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              {t("attendance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-navy">{attendanceStats.rate}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {attendanceStats.present} / {attendanceStats.total} {t("meetings")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              {t("actions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-navy">{actions.length}</p>
            <p className="text-xs text-gray-500 mt-1">{t("openActions")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t("documents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-navy">{documents.length}</p>
            <p className="text-xs text-gray-500 mt-1">{t("availableDocs")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("duesDetail")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {duesSummary.pending.length === 0 && duesSummary.paid.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noDues")}</p>
            ) : (
              <>
                {duesSummary.pending.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span>
                      {d.periodLabel ?? t("period")} — {format(new Date(d.dueDate), "PP", { locale: dateLocale })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{Number(d.amount).toFixed(2)} €</span>
                      <Badge variant={DUES_VARIANT[d.status]}>{t(`duesStatus.${d.status}`)}</Badge>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              {t("actionsDetail")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noActions")}</p>
            ) : (
              actions.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{a.title}</p>
                    {a.dueDate && (
                      <p className="text-xs text-gray-500">
                        {format(new Date(a.dueDate), "PP", { locale: dateLocale })}
                      </p>
                    )}
                  </div>
                  <Badge variant="default">{t(`actionStatus.${a.status}`)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              {t("attendanceDetail")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {attendances.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noAttendance")}</p>
            ) : (
              attendances.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{a.meeting.title ?? t("meeting")}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(a.meeting.date), "PP", { locale: dateLocale })}
                    </p>
                  </div>
                  <Badge variant={a.category === "PRESENT" ? "success" : "muted"}>
                    {t(`attendanceCategory.${a.category}`)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t("documentsDetail")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noDocuments")}</p>
            ) : (
              documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-gray-500">{d.category}</p>
                  </div>
                  {d.fileUrl && (
                    <a
                      href={d.fileUrl.startsWith("/") ? d.fileUrl : d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy text-xs hover:underline"
                    >
                      {t("download")}
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("emailsReceived")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emailLogs.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noEmails")}</p>
            ) : (
              emailLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <div>
                    <p className="font-medium">{log.subject}</p>
                    <p className="text-xs text-gray-500">{log.campaignName}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.status === "sent" ? "success" : "muted"}>{log.status}</Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(log.createdAt), "PP", { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}