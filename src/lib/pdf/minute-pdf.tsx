import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { MinuteAttendanceAnnex } from "@/lib/minute-attendance-annex";
import { ClubDefaultLogoPdf } from "@/components/brand/club-default-logo-pdf";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";

const C = ROTARY_BRAND;
const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.charcoal,
    backgroundColor: C.white,
  },
  accentBar: {
    height: 3,
    backgroundColor: C.royalBlue,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottom: `1.5pt solid ${C.royalBlue}`,
    paddingBottom: 14,
  },
  logoClearSpace: {
    padding: clear,
    maxWidth: ROTARY_LOGO_DISPLAY.pdfMaxWidthPt + clear * 2,
  },
  logo: {
    height: ROTARY_LOGO_DISPLAY.pdfMaxHeightPt,
    objectFit: "contain",
  },

  clubInfo: { textAlign: "right", fontSize: 9, color: C.muted, flex: 1, marginLeft: 16 },
  clubNameSide: { fontWeight: "bold", color: C.royalBlue, fontSize: 11, marginBottom: 4 },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.royalBlue,
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.royalBlue,
    marginBottom: 8,
    borderBottom: `1pt solid ${C.border}`,
    paddingBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 120, color: C.muted },
  value: { flex: 1 },
  agendaItem: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
  },
  agendaTitle: { fontWeight: "bold", marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: `1pt solid ${C.border}`,
    paddingTop: 10,
    fontSize: 8,
    color: C.muted,
  },
  qr: { width: 60, height: 60 },
  hash: { fontSize: 7, color: C.muted, marginTop: 4 },
  stats: { flexDirection: "row", gap: 20, marginBottom: 15 },
  statBox: {
    flex: 1,
    padding: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    textAlign: "center",
    border: `0.5pt solid ${C.border}`,
  },
  statValue: { fontSize: 14, fontWeight: "bold", color: C.royalBlue },
  statLabel: { fontSize: 8, color: C.muted },
  annexTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.royalBlue,
    marginBottom: 12,
    textAlign: "center",
  },
  annexSubtitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: C.royalBlue,
    marginTop: 10,
    marginBottom: 6,
  },
  annexListItem: { fontSize: 9, marginBottom: 2, paddingLeft: 8 },
  annexCategory: { fontSize: 9, fontWeight: "bold", color: C.muted, marginBottom: 3 },
  annexEmpty: { fontSize: 9, color: C.muted, fontStyle: "italic" },
});

export interface MinutePDFData {
  club: {
    name: string;
    address?: string;
    logoUrl?: string;
    /** Logo généré (nom déjà inclus dans le visuel). */
    logoIsGenerated?: boolean;
    logoAspectRatio?: number;
  };
  meeting: {
    date: string;
    location?: string;
    type: string;
    presidedBy?: string;
    secretary?: string;
  };
  title: string;
  attendances: {
    present: number;
    absent: number;
    rate: number;
  };
  agendaItems: Array<{
    title: string;
    description?: string;
    decisions?: string;
    actions?: string;
  }>;
  hash: string;
  qrCodeDataUrl?: string;
  verifyUrl: string;
  annex?: MinuteAttendanceAnnex;
  locale?: string;
}

function PdfClubHeader({ data }: { data: MinutePDFData }) {
  return (
    <View style={styles.header}>
      {data.club.logoUrl ? (
        <View style={styles.logoClearSpace}>
          <Image
            src={data.club.logoUrl}
            style={{
              ...styles.logo,
              width:
                ROTARY_LOGO_DISPLAY.pdfMaxHeightPt *
                (data.club.logoAspectRatio ?? 3.5),
            }}
          />
        </View>
      ) : (
        <ClubDefaultLogoPdf clubName={data.club.name} />
      )}
      <View style={styles.clubInfo}>
        {!data.club.logoIsGenerated ? (
          <Text style={styles.clubNameSide}>{data.club.name}</Text>
        ) : null}
        {data.club.address ? <Text>{data.club.address}</Text> : null}
      </View>
    </View>
  );
}

function AnnexPage({
  data,
  labels,
}: {
  data: MinutePDFData;
  labels: { title: string; attendanceList: string; visitorsList: string; none: string };
}) {
  const annex = data.annex;
  if (!annex) return null;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.accentBar} />
      <Text style={styles.annexTitle}>{labels.title}</Text>

      <Text style={styles.annexSubtitle}>
        {labels.attendanceList} ({annex.totalMembers})
      </Text>
      {annex.memberGroups.length === 0 ? (
        <Text style={styles.annexEmpty}>{labels.none}</Text>
      ) : (
        annex.memberGroups.map((group) => (
          <View key={group.category} style={{ marginBottom: 8 }}>
            <Text style={styles.annexCategory}>
              {group.label} ({group.names.length})
            </Text>
            {group.names.map((name, i) => (
              <Text key={`${group.category}-${i}`} style={styles.annexListItem}>
                • {name}
              </Text>
            ))}
          </View>
        ))
      )}

      <Text style={styles.annexSubtitle}>
        {labels.visitorsList} ({annex.totalVisitors})
      </Text>
      {annex.visitors.length === 0 ? (
        <Text style={styles.annexEmpty}>{labels.none}</Text>
      ) : (
        annex.visitors.map((visitor, i) => (
          <Text key={`visitor-${i}`} style={styles.annexListItem}>
            • {visitor.name} — {visitor.label}
          </Text>
        ))
      )}

      <View style={styles.footer} fixed>
        <View>
          <Text>Annexe — {data.club.name}</Text>
          <Text style={styles.hash}>SHA-256: {data.hash.slice(0, 32)}...</Text>
        </View>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

export function MinutePDFDocument({ data }: { data: MinutePDFData }) {
  const isFr = data.locale !== "en";
  const annexLabels = {
    title: isFr ? "Annexe — Présences et visiteurs" : "Annex — Attendance and visitors",
    attendanceList: isFr ? "Liste de présence" : "Attendance list",
    visitorsList: isFr ? "Liste des visiteurs" : "Visitors list",
    none: isFr ? "Aucune entrée" : "No entries",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        <PdfClubHeader data={data} />

        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>
          {data.meeting.date} — {data.meeting.location}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{data.meeting.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Présidée par</Text>
            <Text style={styles.value}>{data.meeting.presidedBy}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Secrétaire</Text>
            <Text style={styles.value}>{data.meeting.secretary}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.attendances.present}</Text>
            <Text style={styles.statLabel}>Présents</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.attendances.absent}</Text>
            <Text style={styles.statLabel}>Absents</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.attendances.rate}%</Text>
            <Text style={styles.statLabel}>Assiduité</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ordre du jour</Text>
          {data.agendaItems.map((item, i) => (
            <View key={i} style={styles.agendaItem}>
              <Text style={styles.agendaTitle}>
                {i + 1}. {item.title}
              </Text>
              {item.description && <Text>{item.description}</Text>}
              {item.decisions && (
                <Text style={{ marginTop: 4 }}>
                  Décisions : {item.decisions}
                </Text>
              )}
              {item.actions && (
                <Text style={{ marginTop: 2 }}>Actions : {item.actions}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <View>
            <Text>
              Document authentifié — {data.club.name}
            </Text>
            <Text style={styles.hash}>SHA-256: {data.hash.slice(0, 32)}...</Text>
            <Text>{data.verifyUrl}</Text>
          </View>
          {data.qrCodeDataUrl && (
            <Image src={data.qrCodeDataUrl} style={styles.qr} />
          )}
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
      {data.annex && <AnnexPage data={data} labels={annexLabels} />}
    </Document>
  );
}