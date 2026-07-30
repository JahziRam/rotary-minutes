import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MinutePDFData } from "@/lib/pdf/minute-pdf";

/**
 * Ultra-safe PDF layout: no images, no gap, no border shorthands, no nested Text.
 * Used as last resort when the full MinutePDFDocument crashes (TypeError 'S').
 */
const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
  },
  club: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#17458F",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  line: { fontSize: 9, marginBottom: 3, color: "#333333" },
  section: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#17458F",
    marginTop: 14,
    marginBottom: 6,
  },
  item: { marginBottom: 8 },
  itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2 },
  itemBody: { fontSize: 9, color: "#333333", marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#666666",
  },
});

function safe(text: string | null | undefined): string {
  if (text == null) return "";
  return String(text)
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    // Common unicode that Helvetica WinAnsi can't encode → replace
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

export function MinimalMinutePDFDocument({ data }: { data: MinutePDFData }) {
  const club = safe(data.club.name);
  const title = safe(data.title);
  const date = safe(data.meeting.date);
  const location = safe(data.meeting.location);
  const type = safe(data.meeting.type);
  const presided = safe(data.meeting.presidedBy) || "-";
  const secretary = safe(data.meeting.secretary) || "-";
  const verify = safe(data.verifyUrl);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.club}>Rotary — {club}</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.line}>
          Date: {date}
          {location ? ` | Lieu: ${location}` : ""}
        </Text>
        <Text style={s.line}>
          Type: {type} | Presidee par: {presided} | Secretaire: {secretary}
        </Text>
        <Text style={s.line}>
          Presents: {data.attendances.present} | Absents: {data.attendances.absent} | Assiduite:{" "}
          {data.attendances.rate}%
        </Text>

        <Text style={s.section}>Ordre du jour</Text>
        {data.agendaItems.length === 0 ? (
          <Text style={s.itemBody}>(Aucun point)</Text>
        ) : (
          data.agendaItems.map((item, i) => (
            <View key={i} style={s.item}>
              <Text style={s.itemTitle}>
                {i + 1}. {safe(item.title)}
              </Text>
              {item.description ? (
                <Text style={s.itemBody}>{safe(item.description)}</Text>
              ) : null}
              {item.decisions ? (
                <Text style={s.itemBody}>Decision: {safe(item.decisions)}</Text>
              ) : null}
              {item.actions ? (
                <Text style={s.itemBody}>Action: {safe(item.actions)}</Text>
              ) : null}
            </View>
          ))
        )}

        {data.annex && data.annex.memberGroups.length > 0 ? (
          <>
            <Text style={s.section}>
              Liste de presence ({data.annex.totalMembers})
            </Text>
            {data.annex.memberGroups.map((group) => (
              <View key={group.category} style={s.item}>
                <Text style={s.itemTitle}>
                  {safe(group.label)} ({group.people.length})
                </Text>
                {group.people.map((p, idx) => (
                  <Text key={idx} style={s.itemBody}>
                    - {safe(p.name)}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : null}

        <Text style={s.footer} fixed>
          Document authentifie — {club}
          {verify ? ` | ${verify}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
