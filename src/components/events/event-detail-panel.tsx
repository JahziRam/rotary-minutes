"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { ArrowLeft, Download, Send, Users, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { RegistrationForm } from "@/components/events/registration-form";
import {
  publishEvent,
  cancelRegistration,
  exportParticipants,
  updateEvent,
} from "@/actions/events";
import type { ClubEventStatus, EventRegistrationStatus } from "@/generated/prisma/client";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: ClubEventStatus;
  maxAttendees: number | null;
  price: number | null;
  currency: string;
  requiresPayment: boolean;
  registrationCount: number;
};

type Registration = {
  id: string;
  memberId: string | null;
  guestName: string | null;
  email: string | null;
  status: EventRegistrationStatus;
  paidAt: string | null;
  paymentMethod: string | null;
  amount: number | null;
  notes: string | null;
  createdAt: string;
  member: { id: string; firstName: string; lastName: string; email: string | null } | null;
};

const REG_STATUS_VARIANT: Record<EventRegistrationStatus, "success" | "warning" | "danger" | "muted"> = {
  CONFIRMED: "success",
  PENDING: "warning",
  CANCELLED: "danger",
  WAITLIST: "muted",
};

export function EventDetailPanel({
  event,
  registrations,
  canManage,
  myMemberId,
  myRegistration,
  locale,
}: {
  event: EventData;
  registrations: Registration[];
  canManage: boolean;
  myMemberId: string | null;
  myRegistration: { id: string; status: EventRegistrationStatus } | null;
  locale: string;
}) {
  const t = useTranslations("events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const dateLocale = locale === "fr" ? fr : enUS;

  function handlePublish() {
    startTransition(async () => {
      const result = await publishEvent(event.id);
      if ("success" in result && result.success) {
        setToast(t("published"));
        router.refresh();
      }
    });
  }

  function handleCancel(registrationId: string) {
    startTransition(async () => {
      const result = await cancelRegistration(registrationId);
      if ("success" in result && result.success) {
        setToast(t("cancelled"));
        router.refresh();
      }
    });
  }

  function handleExport() {
    startTransition(async () => {
      const result = await exportParticipants(event.id);
      if ("success" in result && result.success && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await updateEvent(event.id, { status: "COMPLETED" });
      if ("success" in result && result.success) {
        setToast(t("completed"));
        router.refresh();
      }
    });
  }

  const displayName = (r: Registration) =>
    r.member ? `${r.member.firstName} ${r.member.lastName}` : r.guestName ?? "—";

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/events`} className="inline-flex items-center gap-1 text-sm text-navy hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {t("backToEvents")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <Badge>{t(`statuses.${event.status}`)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(event.startAt), "PPp", { locale: dateLocale })}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {event.registrationCount}
              {event.maxAttendees ? ` / ${event.maxAttendees}` : ""}
            </span>
          </div>
          {event.description && (
            <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
          )}
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {event.status === "DRAFT" && (
              <Button size="sm" disabled={pending} onClick={handlePublish}>
                <Send className="h-4 w-4" />
                {t("publish")}
              </Button>
            )}
            {event.status === "PUBLISHED" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={handleComplete}>
                {t("markCompleted")}
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={pending} onClick={handleExport}>
              <Download className="h-4 w-4" />
              {t("exportParticipants")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {event.status === "PUBLISHED" && !myRegistration && (
          <Card>
            <CardHeader>
              <CardTitle>{t("register")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationForm
                eventId={event.id}
                requiresPayment={event.requiresPayment}
                price={event.price}
                currency={event.currency}
                myMemberId={myMemberId}
                locale={locale}
              />
            </CardContent>
          </Card>
        )}

        {myRegistration && myRegistration.status !== "CANCELLED" && (
          <Card>
            <CardHeader>
              <CardTitle>{t("myRegistration")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={REG_STATUS_VARIANT[myRegistration.status]}>
                {t(`registrationStatuses.${myRegistration.status}`)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handleCancel(myRegistration.id)}
              >
                {t("cancelRegistration")}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={event.status !== "PUBLISHED" || myRegistration ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>{t("participants")} ({registrations.filter((r) => r.status !== "CANCELLED").length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">{t("name")}</th>
                    <th className="pb-2 font-medium">{t("email")}</th>
                    <th className="pb-2 font-medium">{t("status")}</th>
                    {canManage && <th className="pb-2 font-medium">{t("actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {registrations
                    .filter((r) => r.status !== "CANCELLED")
                    .map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2">{displayName(r)}</td>
                        <td className="py-2">{r.email ?? r.member?.email ?? "—"}</td>
                        <td className="py-2">
                          <Badge variant={REG_STATUS_VARIANT[r.status]}>
                            {t(`registrationStatuses.${r.status}`)}
                          </Badge>
                        </td>
                        {canManage && (
                          <td className="py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={pending}
                              onClick={() => handleCancel(r.id)}
                            >
                              {t("cancel")}
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}