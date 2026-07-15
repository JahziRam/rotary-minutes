import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { ClubDefaultLogoPdf } from "@/components/brand/club-default-logo-pdf";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottom: "2pt solid #0d2d52",
    paddingBottom: 10,
  },
  logo: { width: 48, height: 48, objectFit: "contain" },
  title: { fontSize: 16, fontWeight: "bold", color: "#0d2d52", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 16 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 6,
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: { flexDirection: "row", padding: 6, borderBottom: "1pt solid #e2e8f0" },
  colPeriod: { width: "22%" },
  colAmount: { width: "14%" },
  colDue: { width: "16%" },
  colStatus: { width: "14%" },
  colPaid: { width: "16%" },
  colRef: { width: "18%" },
  summary: { marginTop: 16, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export interface DuesHistoryRow {
  periodLabel: string;
  amount: string;
  dueDate: string;
  status: string;
  paidAt?: string;
  reference?: string;
}

export interface DuesHistoryPDFData {
  club: { name: string; address?: string; logoUrl?: string };
  member: { firstName: string; lastName: string; email?: string };
  fiscalYear: string;
  paymentPlan: string;
  rows: DuesHistoryRow[];
  totalPaid: string;
  totalPending: string;
  generatedAt: string;
  locale: string;
  appName: string;
}

export function DuesHistoryPDFDocument({ data }: { data: DuesHistoryPDFData }) {
  const isFr = data.locale === "fr";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {data.club.logoUrl ? (
              <Image src={data.club.logoUrl} style={styles.logo} />
            ) : (
              <ClubDefaultLogoPdf clubName={data.club.name} />
            )}
          </View>
          <View style={{ textAlign: "right", fontSize: 9, color: "#64748b" }}>
            <Text>{data.club.name}</Text>
          </View>
        </View>
        <Text style={styles.title}>
          {isFr ? "HISTORIQUE DES COTISATIONS" : "DUES PAYMENT HISTORY"}
        </Text>
        <Text style={styles.subtitle}>
          {data.member.firstName} {data.member.lastName}
          {data.member.email ? ` · ${data.member.email}` : ""} · {isFr ? "Exercice" : "FY"}{" "}
          {data.fiscalYear} · {data.paymentPlan}
        </Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colPeriod}>{isFr ? "Période" : "Period"}</Text>
          <Text style={styles.colAmount}>{isFr ? "Montant" : "Amount"}</Text>
          <Text style={styles.colDue}>{isFr ? "Échéance" : "Due"}</Text>
          <Text style={styles.colStatus}>{isFr ? "Statut" : "Status"}</Text>
          <Text style={styles.colPaid}>{isFr ? "Payé le" : "Paid"}</Text>
          <Text style={styles.colRef}>{isFr ? "Référence" : "Reference"}</Text>
        </View>
        {data.rows.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colPeriod}>{row.periodLabel}</Text>
            <Text style={styles.colAmount}>{row.amount}</Text>
            <Text style={styles.colDue}>{row.dueDate}</Text>
            <Text style={styles.colStatus}>{row.status}</Text>
            <Text style={styles.colPaid}>{row.paidAt ?? "—"}</Text>
            <Text style={styles.colRef}>{row.reference ?? "—"}</Text>
          </View>
        ))}
        <View style={styles.summary}>
          <Text>
            {isFr ? "Total payé" : "Total paid"}: {data.totalPaid} ·{" "}
            {isFr ? "Reste à payer" : "Outstanding"}: {data.totalPending}
          </Text>
        </View>
        <Text style={styles.footer}>
          {isFr ? "Généré le" : "Generated on"} {data.generatedAt} — {data.appName}
        </Text>
      </Page>
    </Document>
  );
}