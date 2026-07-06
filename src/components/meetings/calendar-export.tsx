"use client";

import { CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  type CalendarMeetingInput,
} from "@/lib/calendar-ics";

interface CalendarExportProps {
  meeting: CalendarMeetingInput;
  locale: string;
  compact?: boolean;
}

export function CalendarExport({ meeting, locale, compact = false }: CalendarExportProps) {
  const googleUrl = buildGoogleCalendarUrl(meeting);
  const outlookUrl = buildOutlookCalendarUrl(meeting);
  const icsUrl = `/api/meetings/${meeting.id}/calendar`;

  const labels = {
    download: locale === "fr" ? "Télécharger ICS" : "Download ICS",
    google: locale === "fr" ? "Google Calendar" : "Google Calendar",
    outlook: locale === "fr" ? "Outlook" : "Outlook",
    add: locale === "fr" ? "Ajouter au calendrier" : "Add to calendar",
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={icsUrl}
          download
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          title={labels.download}
        >
          <Download className="h-3.5 w-3.5" />
          ICS
        </a>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          title={labels.google}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Google
        </a>
        <a
          href={outlookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          title={labels.outlook}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Outlook
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-gray-500 self-center">{labels.add}</span>
      <a href={icsUrl} download>
        <Button variant="outline" size="sm" type="button">
          <Download className="h-4 w-4" />
          {labels.download}
        </Button>
      </a>
      <a href={googleUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" type="button">
          <CalendarPlus className="h-4 w-4" />
          {labels.google}
        </Button>
      </a>
      <a href={outlookUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" type="button">
          <CalendarPlus className="h-4 w-4" />
          {labels.outlook}
        </Button>
      </a>
    </div>
  );
}