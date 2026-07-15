import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { ClubDefaultLogoPdf } from "@/components/brand/club-default-logo-pdf";
import type { MemberAttendanceRate, PeriodAttendanceRate, MeetingTypeRate } from "@/lib/queries/attendance-reports";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";

const C = ROTARY_BRAND;
const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.charcoal,
  },
  accentBar: {
    height: 3,
    backgroundColor: C.royalBlue,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottom: `1.5pt solid ${C.royalBlue}`,
    paddingBottom: 12,
  },
  logoClearSpace: {
    padding: clear,
    maxWidth: ROTARY_LOGO_DISPLAY.pdfMaxWidthPt + clear * 2,
  },
  logo: {
    width: ROTARY_LOGO_DISPLAY.pdfMaxWidthPt,
    height: ROTARY_LOGO_DISPLAY.pdfMaxHeightPt,
    objectFit: "contain",
  },

  headerMeta: { textAlign: "right", flex: 1, marginLeft: 12 },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.royalBlue,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 2,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.royalBlue,
    marginBottom: 8,
    borderBottom: `1pt solid ${C.border}`,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: `0.5pt solid ${C.offWhite}`,
  },
  rowLabel: { color: C.muted, flex: 1 },
  rowValue: { fontWeight: "bold", width: 60, textAlign: "right", color: C.royalBlue },
  statBox: {
    width: "30%",
    padding: 10,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    marginBottom: 8,
    border: `0.5pt solid ${C.border}`,
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: C.royalBlue },
  statLabel: { fontSize: 8, color: C.muted, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alert: {
    padding: 10,
    backgroundColor: "#FEF9E8",
    borderRadius: 4,
    marginBottom: 6,
    border: `0.5pt solid ${C.gold}`,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: C.muted,
    borderTop: `1pt solid ${C.border}`,
    paddingTop: 8,
    textAlign: "center",
  },
});

export interface AttendanceReportPDFData {
  clubName: string;
  clubAddress?: string;
  logoUrl?: string;
  mandateLabel: string;
  exportedAt: string;
  clubRate: number;
  meetingsCount: number;
  memberRates: MemberAttendanceRate[];
  periodRates: PeriodAttendanceRate[];
  meetingTypeRates: MeetingTypeRate[];
  atRisk: Array<{ firstName: string; lastName: string; rate: number; total: number }>;
  labels: {
    title: string;
    overview: string;
    byMember: string;
    byPeriod: string;
    byType: string;
    atRisk: string;
    rate: string;
    meetings: string;
    generated: string;
  };
  meetingTypeLabels: Record<string, string>;
  appName: string;
}

function ReportHeader({ data }: { data: AttendanceReportPDFData }) {
  return (
    <View style={styles.header}>
      {data.logoUrl ? (
        <View style={styles.logoClearSpace}>
          <Image src={data.logoUrl} style={styles.logo} />
        </View>
      ) : (
        <ClubDefaultLogoPdf clubName={data.clubName} />
      )}
      <View style={styles.headerMeta}>
        <Text style={styles.title}>{data.labels.title}</Text>
        <Text style={styles.subtitle}>
          {data.clubName} — {data.mandateLabel}
        </Text>
        {data.clubAddress ? (
          <Text style={styles.subtitle}>{data.clubAddress}</Text>
        ) : null}
        <Text style={styles.subtitle}>
          {data.labels.generated}: {data.exportedAt}
        </Text>
      </View>
    </View>
  );
}

export function AttendanceReportPDFDocument({ data }: { data: AttendanceReportPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        <ReportHeader data={data} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.labels.overview}</Text>
          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.clubRate}%</Text>
              <Text style={styles.statLabel}>{data.labels.rate}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.meetingsCount}</Text>
              <Text style={styles.statLabel}>{data.labels.meetings}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.atRisk.length}</Text>
              <Text style={styles.statLabel}>{data.labels.atRisk}</Text>
            </View>
          </View>
        </View>

        {data.atRisk.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.labels.atRisk}</Text>
            {data.atRisk.map((m, i) => (
              <View key={i} style={styles.alert}>
                <Text>
                  {m.firstName} {m.lastName} — {m.rate}% ({m.total})
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.labels.byMember}</Text>
          {data.memberRates.slice(0, 25).map((m) => (
            <View key={m.memberId} style={styles.row}>
              <Text style={styles.rowLabel}>
                {m.firstName} {m.lastName}
              </Text>
              <Text style={styles.rowValue}>{m.rate}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{data.clubName}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.labels.byPeriod}</Text>
          {data.periodRates.map((p) => (
            <View key={p.period} style={styles.row}>
              <Text style={styles.rowLabel}>{p.label}</Text>
              <Text style={styles.rowValue}>{p.rate}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{data.labels.byType}</Text>
          {data.meetingTypeRates.map((t) => (
            <View key={t.type} style={styles.row}>
              <Text style={styles.rowLabel}>
                {data.meetingTypeLabels[t.type] ?? t.type}
              </Text>
              <Text style={styles.rowValue}>{t.rate}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{data.clubName}</Text>
      </Page>
    </Document>
  );
}