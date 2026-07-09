"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { processCheckIn } from "@/actions/check-in";
import { queueOfflineCheckIn } from "@/components/pwa/offline-checkin-cache";

export function CheckInForm({
  token,
  meetingId,
  members,
  locale,
}: {
  token: string;
  meetingId: string;
  members: Array<{ id: string; firstName: string; lastName: string }>;
  locale: string;
}) {
  const [done, setDone] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [pending, startTransition] = useTransition();
  const isFr = locale === "fr";

  function queueOrCheckIn(data: { memberId?: string; guestName?: string }) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueOfflineCheckIn({
        token,
        meetingId,
        memberId: data.memberId,
        guestName: data.guestName,
        checkedInAt: new Date().toISOString(),
      });
      setDone(true);
      return;
    }

    startTransition(async () => {
      const r = await processCheckIn(token, data);
      if (r.success) setDone(true);
    });
  }

  function checkInMember(memberId: string) {
    queueOrCheckIn({ memberId });
  }

  function checkInGuest() {
    if (!guestName.trim()) return;
    queueOrCheckIn({ guestName });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-2">
        <Check className="h-10 w-10 text-green-600 mx-auto" />
        <p className="font-semibold text-green-800">
          {isFr ? "Présence enregistrée !" : "Attendance recorded!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">
          {isFr ? "Je suis membre" : "I am a member"}
        </p>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={pending}
              onClick={() => checkInMember(m.id)}
              className="text-left px-3 py-2.5 rounded-lg border border-gray-100 hover:bg-navy/5 text-sm font-medium transition-colors"
            >
              {m.firstName} {m.lastName}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">
          {isFr ? "Je suis invité" : "I am a guest"}
        </p>
        <Input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={isFr ? "Votre nom" : "Your name"}
        />
        <Button variant="gold" className="w-full" disabled={pending} onClick={checkInGuest}>
          {isFr ? "M'enregistrer" : "Check in"}
        </Button>
      </div>
    </div>
  );
}