import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottom: "2pt solid #0d2d52",
    paddingBottom: 12,
  },
  logo: { width: 48, height: 48, objectFit: "contain" },
  clubInfo: { textAlign: "right", fontSize: 9, color: "#64748b" },
  title: { fontSize: 16, fontWeight: "bold", color: "#0d2d52", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#64748b", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  summaryLabel: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: "#0d2d52" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0d2d52",
    color: "#fff",
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #e2e8f0",
    padding: 5,
    fontSize: 8,
  },
  colDate: { width: "12%" },
  colType: { width: "10%" },
  colDesc: { width: "38%" },
  colCat: { width: "18%" },
  colAmount: { width: "22%", textAlign: "right" },
  income: { color: "#16a34a" },
  expense: { color: "#dc2626" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1pt solid #e2e8f0",
    paddingTop: 8,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export interface TreasuryReportPDFData {
  club: { name: string; address?: string; logoUrl?: string };
  periodLabel: string;
  generatedAt: string;
  currency: string;
  summary: { income: string; expense: string; balance: string };
  rows: Array<{
    date: string;
    type: string;
    description: string;
    category: string;
    amount: string;
    amountClass: "income" | "expense";
  }>;
  locale: string;
}

export function TreasuryReportPDFDocument({ data }: { data: TreasuryReportPDFData }) {
  const isFr = data.locale === "fr";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {data.club.logoUrl ? (
              <Image src={data.club.logoUrl} style={styles.logo} />
            ) : null}
          </View>
          <View style={styles.clubInfo}>
            <Text>{data.club.name}</Text>
            {data.club.address ? <Text>{data.club.address}</Text> : null}
          </View>
        </View>

        <Text style={styles.title}>
          {isFr ? "RAPPORT DE TRÉSORERIE" : "TREASURY REPORT"}
        </Text>
        <Text style={styles.subtitle}>
          {data.periodLabel} · {data.generatedAt}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{isFr ? "Recettes" : "Income"}</Text>
            <Text style={[styles.summaryValue, styles.income]}>{data.summary.income}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{isFr ? "Dépenses" : "Expenses"}</Text>
            <Text style={[styles.summaryValue, styles.expense]}>{data.summary.expense}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{isFr ? "Solde" : "Balance"}</Text>
            <Text style={styles.summaryValue}>{data.summary.balance}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDate}>{isFr ? "Date" : "Date"}</Text>
          <Text style={styles.colType}>{isFr ? "Type" : "Type"}</Text>
          <Text style={styles.colDesc}>{isFr ? "Description" : "Description"}</Text>
          <Text style={styles.colCat}>{isFr ? "Catégorie" : "Category"}</Text>
          <Text style={styles.colAmount}>{isFr ? "Montant" : "Amount"}</Text>
        </View>

        {data.rows.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDate}>{row.date}</Text>
            <Text style={styles.colType}>{row.type}</Text>
            <Text style={styles.colDesc}>{row.description}</Text>
            <Text style={styles.colCat}>{row.category}</Text>
            <Text style={[styles.colAmount, styles[row.amountClass]]}>{row.amount}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Rotary Minutes · {isFr ? "Document généré automatiquement" : "Auto-generated document"}
        </Text>
      </Page>
    </Document>
  );
}