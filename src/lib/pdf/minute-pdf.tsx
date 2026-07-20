import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import {
  annexColumnCount,
  splitIntoColumns,
  type AttendanceAnnexGroup,
  type MinuteAttendanceAnnex,
  type VisitorAnnexRow,
} from "@/lib/minute-attendance-annex";
import { ClubDefaultLogoPdf } from "@/components/brand/club-default-logo-pdf";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";

const C = ROTARY_BRAND;
const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;

/** Reserved band for fixed footer (QR + hash) so body content never overlaps. */
const PAGE_PADDING_X = 40;
const PAGE_PADDING_TOP = 40;
const FOOTER_RESERVED_PT = 100;
const FOOTER_BOTTOM_PT = 22;
const FOOTER_HEIGHT_PT = 72;

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING_TOP,
    paddingHorizontal: PAGE_PADDING_X,
    // Keep body clear of the absolute footer (QR + SHA-256 + page number).
    paddingBottom: FOOTER_RESERVED_PT,
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
    bottom: FOOTER_BOTTOM_PT,
    left: PAGE_PADDING_X,
    right: PAGE_PADDING_X,
    height: FOOTER_HEIGHT_PT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: `1pt solid ${C.border}`,
    paddingTop: 8,
    fontSize: 8,
    color: C.muted,
  },
  footerMain: {
    flex: 1,
    paddingRight: 12,
    justifyContent: "flex-end",
  },
  footerRight: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    width: 70,
  },
  qr: { width: 52, height: 52 },
  hash: { fontSize: 7, color: C.muted, marginTop: 3 },
  verifyUrl: { fontSize: 6.5, color: C.muted, marginTop: 2 },
  pageNumber: { fontSize: 8, color: C.muted, marginTop: 4 },
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
    marginBottom: 4,
    textAlign: "center",
  },
  annexMeta: {
    fontSize: 9,
    color: C.muted,
    textAlign: "center",
    marginBottom: 12,
  },
  annexSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  annexChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    border: `0.5pt solid ${C.border}`,
  },
  annexChipValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.royalBlue,
    textAlign: "center",
  },
  annexChipLabel: {
    fontSize: 7,
    color: C.muted,
    textAlign: "center",
    marginTop: 1,
  },
  annexSubtitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: C.royalBlue,
    marginTop: 6,
    marginBottom: 8,
    borderBottom: `1pt solid ${C.border}`,
    paddingBottom: 4,
  },
  annexGroup: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    border: `0.5pt solid ${C.border}`,
  },
  annexGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: `0.5pt solid ${C.border}`,
  },
  annexCategory: {
    fontSize: 9,
    fontWeight: "bold",
    color: C.royalBlue,
  },
  annexCountBadge: {
    fontSize: 8,
    color: C.muted,
    backgroundColor: C.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    border: `0.5pt solid ${C.border}`,
  },
  annexColumns: {
    flexDirection: "row",
    gap: 8,
  },
  annexColumn: {
    flex: 1,
  },
  annexListItem: {
    fontSize: 8.5,
    marginBottom: 2.5,
    color: C.charcoal,
  },
  annexEmpty: { fontSize: 9, color: C.muted, fontStyle: "italic" },
  visitorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    gap: 4,
  },
  visitorName: { fontSize: 8.5, flex: 1, color: C.charcoal },
  visitorType: { fontSize: 7.5, color: C.muted, maxWidth: "42%" },
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

function MinutePdfFooter({
  data,
  leftLabel,
  showQr = false,
}: {
  data: MinutePDFData;
  leftLabel: string;
  showQr?: boolean;
}) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerMain}>
        <Text>{leftLabel}</Text>
        <Text style={styles.hash}>SHA-256: {data.hash.slice(0, 32)}…</Text>
        {showQr ? <Text style={styles.verifyUrl}>{data.verifyUrl}</Text> : null}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
      {showQr && data.qrCodeDataUrl ? (
        <View style={styles.footerRight}>
          <Image src={data.qrCodeDataUrl} style={styles.qr} />
        </View>
      ) : null}
    </View>
  );
}

function NameColumns({ names }: { names: string[] }) {
  const cols = splitIntoColumns(names, annexColumnCount(names.length));
  return (
    <View style={styles.annexColumns}>
      {cols.map((col, colIdx) => (
        <View key={`col-${colIdx}`} style={styles.annexColumn}>
          {col.map((name, i) => (
            <Text key={`${colIdx}-${i}`} style={styles.annexListItem}>
              • {name}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function MemberGroupBlock({ group }: { group: AttendanceAnnexGroup }) {
  return (
    <View style={styles.annexGroup} wrap={false} minPresenceAhead={56}>
      <View style={styles.annexGroupHeader}>
        <Text style={styles.annexCategory}>{group.label}</Text>
        <Text style={styles.annexCountBadge}>{group.names.length}</Text>
      </View>
      <NameColumns names={group.names} />
    </View>
  );
}

function VisitorsBlock({
  visitors,
  noneLabel,
}: {
  visitors: VisitorAnnexRow[];
  noneLabel: string;
}) {
  if (visitors.length === 0) {
    return <Text style={styles.annexEmpty}>{noneLabel}</Text>;
  }
  const cols = splitIntoColumns(visitors, annexColumnCount(visitors.length));
  return (
    <View style={styles.annexGroup} wrap={false}>
      <View style={styles.annexColumns}>
        {cols.map((col, colIdx) => (
          <View key={`vcol-${colIdx}`} style={styles.annexColumn}>
            {col.map((visitor, i) => (
              <View key={`${colIdx}-${i}`} style={styles.visitorRow}>
                <Text style={styles.visitorName}>• {visitor.name}</Text>
                <Text style={styles.visitorType}>{visitor.label}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function AnnexPage({
  data,
  labels,
}: {
  data: MinutePDFData;
  labels: {
    title: string;
    attendanceList: string;
    visitorsList: string;
    none: string;
    meetingOf: string;
  };
}) {
  const annex = data.annex;
  if (!annex) return null;

  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.accentBar} fixed />
      <Text style={styles.annexTitle}>{labels.title}</Text>
      <Text style={styles.annexMeta}>
        {labels.meetingOf} {data.meeting.date}
        {data.meeting.location ? ` — ${data.meeting.location}` : ""}
      </Text>

      {/* Compact status summary chips */}
      {annex.memberGroups.length > 0 ? (
        <View style={styles.annexSummaryRow} wrap={false}>
          {annex.memberGroups.map((group) => (
            <View key={`chip-${group.category}`} style={styles.annexChip}>
              <Text style={styles.annexChipValue}>{group.names.length}</Text>
              <Text style={styles.annexChipLabel}>{group.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.annexSubtitle}>
        {labels.attendanceList} ({annex.totalMembers})
      </Text>
      {annex.memberGroups.length === 0 ? (
        <Text style={styles.annexEmpty}>{labels.none}</Text>
      ) : (
        annex.memberGroups.map((group) => (
          <MemberGroupBlock key={group.category} group={group} />
        ))
      )}

      <Text style={styles.annexSubtitle}>
        {labels.visitorsList} ({annex.totalVisitors})
      </Text>
      <VisitorsBlock visitors={annex.visitors} noneLabel={labels.none} />

      <MinutePdfFooter data={data} leftLabel={`Annexe — ${data.club.name}`} />
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
    meetingOf: isFr ? "Réunion du" : "Meeting of",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.accentBar} fixed />
        <PdfClubHeader data={data} />

        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>
          {data.meeting.date} — {data.meeting.location}
        </Text>

        <View style={styles.section} wrap={false}>
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

        <View style={styles.stats} wrap={false}>
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
            <View key={i} style={styles.agendaItem} wrap={false} minPresenceAhead={48}>
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

        <MinutePdfFooter
          data={data}
          leftLabel={`Document authentifié — ${data.club.name}`}
          showQr
        />
      </Page>
      {data.annex && <AnnexPage data={data} labels={annexLabels} />}
    </Document>
  );
}