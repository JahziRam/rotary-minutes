"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { ArrowLeft, Download, Send, Users, MapPin, Calendar, RotateCcw, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { RegistrationForm } from "@/components/events/registration-form";
import { EventAdvancedSettings } from "@/components/events/event-advanced-settings";
import {
  publishEvent,
  cancelRegistration,
  exportParticipants,
  updateEvent,
  reactivateEvent,
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
  priceTiers?: Array<{ id: string; label: string; price: number; sortOrder: number; maxQty: number | null }>;
  ticketSlots?: Array<{
    id: string;
    ticketNumber: string;
    label: string | null;
    isReserved: boolean;
    registrationId: string | null;
  }>;
};

type Registration = {
  id: string;
  memberId: string | null;
  guestName: string | null;
  email: string | null;
  phone: string | null;
  quantity: number;
  orderGroupId: string | null;
  status: EventRegistrationStatus;
  paidAt: string | null;
  paymentMethod: string | null;
  amount: number | null;
  notes: string | null;
  createdAt: string;
  priceTierLabel: string | null;
  ticketNumber: string | null;
  member: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null } | null;
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
  eventsAdvanced = false,
  myMemberId,
  myRegistration,
  locale,
}: {
  event: EventData;
  registrations: Registration[];
  canManage: boolean;
  eventsAdvanced?: boolean;
  myMemberId: string | null;
  myRegistration: { id: string; status: EventRegistrationStatus } | null;
  locale: string;
}) {
  const t = useTranslations("events");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    maxAttendees: event.maxAttendees ? String(event.maxAttendees) : "",
    price: event.price != null ? String(event.price) : "",
  });
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

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateEvent(event.id);
      if ("success" in result && result.success) {
        setToast(t("reactivated"));
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

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await updateEvent(event.id, {
        title: editForm.title,
        description: editForm.description || undefined,
        location: editForm.location || undefined,
        maxAttendees: editForm.maxAttendees ? parseInt(editForm.maxAttendees, 10) : null,
        price: editForm.price ? parseFloat(editForm.price) : null,
      });
      if ("success" in result && result.success) {
        setToast(t("updated"));
        setEditing(false);
        router.refresh();
      }
    });
  }

  const displayName = (r: Registration) =>
    r.member ? `${r.member.firstName} ${r.member.lastName}` : r.guestName ?? "—";

  const canRegister = event.status === "PUBLISHED" && !myRegistration;
  const priceTiers = event.priceTiers ?? [];
  const ticketSlots = event.ticketSlots ?? [];

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
          {priceTiers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {priceTiers.map((tier) => (
                <Badge key={tier.id} variant="default">
                  {tier.label}: {tier.price.toFixed(2)} {event.currency}
                </Badge>
              ))}
            </div>
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
              <>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(!editing)}>
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={handleComplete}>
                  {t("markCompleted")}
                </Button>
              </>
            )}
            {event.status === "COMPLETED" && (
              <Button size="sm" variant="outline" disabled={pending} onClick={handleReactivate}>
                <RotateCcw className="h-4 w-4" />
                {t("reactivate")}
              </Button>
            )}
            {eventsAdvanced && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowAdvanced(!showAdvanced)}>
                {t("advancedSettings")}
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={pending} onClick={handleExport}>
              <Download className="h-4 w-4" />
              {t("exportParticipants")}
            </Button>
          </div>
        )}
      </div>

      {editing && canManage && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              placeholder={t("eventTitle")}
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              placeholder={t("description")}
            />
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                placeholder={t("location")}
              />
              <input
                type="number"
                value={editForm.maxAttendees}
                onChange={(e) => setEditForm({ ...editForm, maxAttendees: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                placeholder={t("maxAttendees")}
              />
              <input
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                placeholder={t("price")}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="gold" disabled={pending} onClick={handleSaveEdit}>
                {t("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showAdvanced && canManage && eventsAdvanced && (
        <EventAdvancedSettings
          eventId={event.id}
          priceTiers={priceTiers}
          ticketSlots={ticketSlots}
          currency={event.currency}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {canRegister && (
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
                eventsAdvanced={eventsAdvanced}
                priceTiers={priceTiers}
                ticketSlots={ticketSlots}
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

        <Card className={!canRegister && !myRegistration ? "lg:col-span-2" : canRegister && myRegistration ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>
              {t("participants")} ({registrations.filter((r) => r.status !== "CANCELLED").length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">{t("name")}</th>
                    <th className="pb-2 font-medium">{t("email")}</th>
                    <th className="pb-2 font-medium">{t("phone")}</th>
                    {eventsAdvanced && <th className="pb-2 font-medium">{t("ticket")}</th>}
                    <th className="pb-2 font-medium">{t("status")}</th>
                    {canManage && <th className="pb-2 font-medium">{t("actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {registrations
                    .filter((r) => r.status !== "CANCELLED")
                    .map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2">
                          {displayName(r)}
                          {r.priceTierLabel && (
                            <span className="block text-xs text-gray-400">{r.priceTierLabel}</span>
                          )}
                        </td>
                        <td className="py-2">{r.email ?? r.member?.email ?? "—"}</td>
                        <td className="py-2">{r.phone ?? r.member?.phone ?? "—"}</td>
                        {eventsAdvanced && (
                          <td className="py-2">{r.ticketNumber ?? "—"}</td>
                        )}
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