import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    width: "30%",
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    marginBottom: 8,
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#0d2d52" },
  statLabel: { fontSize: 8, color: "#64748b", marginTop: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "0.5pt solid #f1f5f9",
  },
  rowLabel: { color: "#64748b" },
  rowValue: { fontWeight: "bold" },
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

export interface StatsPDFData {
  exportedAt: string;
  overview: {
    clubsActive: number;
    clubsInactive: number;
    usersCount: number;
    activeSubscriptions: number;
    trialingCount: number;
    minutesThisMonth: number;
    finalizedThisMonth: number;
    totalMeetings: number;
    totalMembers: number;
    newClubsThisMonth: number;
  };
  subscriptions: Array<{ plan: string; status: string; count: number }>;
  minutes: Array<{ status: string; count: number }>;
}

function StatBox({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatsPDFDocument({ data }: { data: StatsPDFData }) {
  const date = new Date(data.exportedAt).toLocaleString("fr-FR");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Rotary Minutes — Statistiques plateforme</Text>
          <Text style={styles.subtitle}>Export généré le {date}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue d&apos;ensemble</Text>
          <View style={styles.grid}>
            <StatBox value={data.overview.clubsActive} label="Clubs actifs" />
            <StatBox value={data.overview.clubsInactive} label="Clubs inactifs" />
            <StatBox value={data.overview.usersCount} label="Utilisateurs" />
            <StatBox value={data.overview.activeSubscriptions} label="Abonnements actifs" />
            <StatBox value={data.overview.trialingCount} label="En essai" />
            <StatBox value={data.overview.minutesThisMonth} label="PV ce mois" />
            <StatBox value={data.overview.finalizedThisMonth} label="PV finalisés (mois)" />
            <StatBox value={data.overview.totalMeetings} label="Réunions totales" />
            <StatBox value={data.overview.totalMembers} label="Membres actifs" />
            <StatBox value={data.overview.newClubsThisMonth} label="Nouveaux clubs (mois)" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnements par plan / statut</Text>
          {data.subscriptions.map((s, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>
                {s.plan} — {s.status}
              </Text>
              <Text style={styles.rowValue}>{s.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procès-verbaux par statut</Text>
          {data.minutes.map((m, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>{m.status}</Text>
              <Text style={styles.rowValue}>{m.count}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Rotary Minutes SaaS — Document confidentiel
        </Text>
      </Page>
    </Document>
  );
}