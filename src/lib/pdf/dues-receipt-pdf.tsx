import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottom: "2pt solid #166534",
    paddingBottom: 12,
  },
  logo: { width: 56, height: 56, objectFit: "contain" },
  clubInfo: { textAlign: "right", fontSize: 9, color: "#64748b" },
  title: { fontSize: 18, fontWeight: "bold", color: "#166534", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 20 },
  box: { padding: 14, backgroundColor: "#f0fdf4", borderRadius: 4, marginBottom: 16 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 130, color: "#64748b" },
  value: { flex: 1, fontWeight: "bold" },
  amount: { fontSize: 22, fontWeight: "bold", color: "#166534", marginTop: 8 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1pt solid #e2e8f0",
    paddingTop: 8,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export interface DuesReceiptPDFData {
  club: { name: string; address?: string; logoUrl?: string };
  member: { firstName: string; lastName: string };
  receiptNumber: string;
  fiscalYear: string;
  periodLabel: string;
  amount: string;
  paidAt: string;
  method?: string;
  locale: string;
}

export function DuesReceiptPDFDocument({ data }: { data: DuesReceiptPDFData }) {
  const isFr = data.locale === "fr";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {data.club.logoUrl ? <Image src={data.club.logoUrl} style={styles.logo} /> : null}
          </View>
          <View style={styles.clubInfo}>
            <Text>{data.club.name}</Text>
            {data.club.address ? <Text>{data.club.address}</Text> : null}
          </View>
        </View>
        <Text style={styles.title}>{isFr ? "REÇU DE PAIEMENT" : "PAYMENT RECEIPT"}</Text>
        <Text style={styles.subtitle}>
          {data.receiptNumber} · {isFr ? "Exercice" : "Fiscal year"} {data.fiscalYear}
        </Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>{isFr ? "Membre" : "Member"}</Text>
            <Text style={styles.value}>
              {data.member.firstName} {data.member.lastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{isFr ? "Période" : "Period"}</Text>
            <Text style={styles.value}>{data.periodLabel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{isFr ? "Date de paiement" : "Payment date"}</Text>
            <Text style={styles.value}>{data.paidAt}</Text>
          </View>
          {data.method ? (
            <View style={styles.row}>
              <Text style={styles.label}>{isFr ? "Mode" : "Method"}</Text>
              <Text style={styles.value}>{data.method}</Text>
            </View>
          ) : null}
          <Text style={styles.amount}>{data.amount}</Text>
        </View>
        <Text style={styles.footer}>
          {data.club.name} — {isFr ? "Merci pour votre cotisation" : "Thank you for your dues payment"}
        </Text>
      </Page>
    </Document>
  );
}