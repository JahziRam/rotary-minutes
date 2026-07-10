import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MemberAttendanceRate, PeriodAttendanceRate, MeetingTypeRate } from "@/lib/queries/attendance-reports";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    marginBottom: 24,
    borderBottom: "2pt solid #0d2d52",
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0d2d52",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0d2d52",
    marginBottom: 8,
    borderBottom: "1pt solid #e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "0.5pt solid #f1f5f9",
  },
  rowLabel: { color: "#64748b", flex: 1 },
  rowValue: { fontWeight: "bold", width: 60, textAlign: "right" },
  statBox: {
    width: "30%",
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    marginBottom: 8,
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#0d2d52" },
  statLabel: { fontSize: 8, color: "#64748b", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alert: {
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    borderTop: "1pt solid #e2e8f0",
    paddingTop: 8,
    textAlign: "center",
  },
});

export interface AttendanceReportPDFData {
  clubName: string;
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

export function AttendanceReportPDFDocument({ data }: { data: AttendanceReportPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.labels.title}</Text>
          <Text style={styles.subtitle}>
            {data.clubName} — {data.mandateLabel}
          </Text>
          <Text style={styles.subtitle}>
            {data.labels.generated}: {data.exportedAt}
          </Text>
        </View>

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

        <Text style={styles.footer}>{data.appName} — {data.clubName}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
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

        <Text style={styles.footer}>{data.appName} — {data.clubName}</Text>
      </Page>
    </Document>
  );
}