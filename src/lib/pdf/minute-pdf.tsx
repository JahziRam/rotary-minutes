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
  type AnnexPersonEntry,
  type AttendanceAnnexGroup,
  type MinuteAttendanceAnnex,
  type VisitorAnnexRow,
  type WeekBirthdayEntry,
} from "@/lib/minute-attendance-annex";
import {
  DEFAULT_MINUTE_MEMBER_PHOTO_SIZE,
  minuteMemberPhotoPdfStyle,
  type MinuteMemberPhotoSize,
} from "@/lib/minute-member-photo-size";
import { ClubDefaultLogoPdf } from "@/components/brand/club-default-logo-pdf";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "@/lib/rotary-brand";

const C = ROTARY_BRAND;
const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;

/** Reserved band for fixed footer (QR + auth) so body content never overlaps. */
const PAGE_PADDING_X = 40;
const PAGE_PADDING_TOP = 40;
const FOOTER_RESERVED_PT = 100;
const FOOTER_BOTTOM_PT = 22;
const FOOTER_HEIGHT_PT = 72;

/**
 * Layout mix (validé) :
 * - Header : PV actuel (logo + clear space, non détérioré)
 * - Corps : proposition 4 (compte-rendu clair)
 * - Annexe : proposition 3 (compacte multi-colonnes + chips)
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING_TOP,
    paddingHorizontal: PAGE_PADDING_X,
    paddingBottom: FOOTER_RESERVED_PT,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.charcoal,
    backgroundColor: C.white,
  },
  /* ── Header actuel (inchangé) ───────────────────────────────────────── */
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

  /* ── Corps (proposition 4) ──────────────────────────────────────────── */
  title: {
    fontSize: 15,
    fontWeight: "bold",
    color: C.charcoal,
    marginBottom: 6,
  },
  dateBand: {
    backgroundColor: C.offWhite,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateBandText: { fontSize: 9, color: C.charcoal },
  dateBandStrong: { fontFamily: "Helvetica-Bold", color: C.royalBlue },
  metaRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  metaPill: {
    flex: 1,
    padding: 8,
    backgroundColor: "#E8F0FA",
    borderRadius: 4,
  },
  metaLbl: { fontSize: 7, color: C.muted, marginBottom: 2 },
  metaVal: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.royalBlue },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.royalBlue,
  },
  statVal: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.royalBlue },
  statLbl: { fontSize: 7, color: C.muted, marginTop: 2 },
  sectionHead: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    backgroundColor: C.royalBlue,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 10,
  },
  agendaCard: {
    marginBottom: 10,
    padding: 9,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 5,
    backgroundColor: C.white,
  },
  agendaHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  agendaNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  agendaNumText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.charcoal },
  agendaTitle: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold" },
  agendaDesc: { fontSize: 9, lineHeight: 1.35, color: C.charcoal, marginBottom: 4 },
  lineDec: {
    fontSize: 8,
    color: C.royalBlue,
    marginTop: 3,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: C.royalBlue,
  },
  lineAct: {
    fontSize: 8,
    color: "#047857",
    marginTop: 3,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#047857",
  },

  /* ── Footer ─────────────────────────────────────────────────────────── */
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
  footerAuth: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
  },
  footerHint: { fontSize: 7.5, color: C.muted, marginTop: 3 },
  pageNumber: { fontSize: 8, color: C.muted, marginTop: 4 },

  /* ── Annexe (proposition 3) ─────────────────────────────────────────── */
  annexTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    textAlign: "center",
    marginBottom: 4,
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
    marginBottom: 12,
  },
  annexChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  annexChipValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    marginTop: 4,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  annexGroup: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  annexGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  annexCategory: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
  },
  annexCountBadge: {
    fontSize: 8,
    color: C.muted,
    backgroundColor: C.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  annexColumns: {
    flexDirection: "row",
    gap: 6,
  },
  annexColumn: {
    flex: 1,
  },
  annexListItem: {
    fontSize: 8,
    marginBottom: 2,
    color: C.charcoal,
  },
  annexPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 4,
  },
  annexThumb: {
    overflow: "hidden",
    backgroundColor: C.border,
  },
  annexThumbImg: {
    objectFit: "cover",
  },
  annexEmpty: { fontSize: 9, color: C.muted, fontStyle: "italic" },
  visitorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    gap: 4,
  },
  visitorName: { fontSize: 8, flex: 1, color: C.charcoal },
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
  verifyHint,
}: {
  data: MinutePDFData;
  leftLabel: string;
  showQr?: boolean;
  /** Short line under auth label (replaces raw SHA-256). */
  verifyHint?: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerMain}>
        <Text style={styles.footerAuth}>{leftLabel}</Text>
        {showQr && verifyHint ? (
          <Text style={styles.footerHint}>{verifyHint}</Text>
        ) : null}
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

function PersonColumns({
  people,
  showPhotos,
  photoSize,
}: {
  people: AnnexPersonEntry[];
  showPhotos: boolean;
  photoSize: MinuteMemberPhotoSize;
}) {
  const thumb = minuteMemberPhotoPdfStyle(photoSize);
  const cols = splitIntoColumns(
    people,
    annexColumnCount(people.length, showPhotos, photoSize)
  );
  return (
    <View style={styles.annexColumns}>
      {cols.map((col, colIdx) => (
        <View key={`col-${colIdx}`} style={styles.annexColumn}>
          {col.map((person, i) => (
            <View key={`${colIdx}-${i}`} style={styles.annexPersonRow}>
              {showPhotos ? (
                <View style={[styles.annexThumb, thumb]}>
                  <Image
                    src={person.photoUrl || ""}
                    style={[styles.annexThumbImg, thumb]}
                  />
                </View>
              ) : null}
              <Text style={styles.annexListItem}>
                {showPhotos ? person.name : `• ${person.name}`}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function MemberGroupBlock({
  group,
  showPhotos,
  photoSize,
}: {
  group: AttendanceAnnexGroup;
  showPhotos: boolean;
  photoSize: MinuteMemberPhotoSize;
}) {
  return (
    <View style={styles.annexGroup} wrap={false} minPresenceAhead={56}>
      <View style={styles.annexGroupHeader}>
        <Text style={styles.annexCategory}>{group.label}</Text>
        <Text style={styles.annexCountBadge}>{group.people.length}</Text>
      </View>
      <PersonColumns people={group.people} showPhotos={showPhotos} photoSize={photoSize} />
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

function WeekBirthdaysBlock({
  entries,
  noneLabel,
  showPhotos,
  photoSize,
}: {
  entries: WeekBirthdayEntry[];
  noneLabel: string;
  showPhotos: boolean;
  photoSize: MinuteMemberPhotoSize;
}) {
  if (entries.length === 0) {
    return <Text style={styles.annexEmpty}>{noneLabel}</Text>;
  }
  const thumb = minuteMemberPhotoPdfStyle(photoSize);
  const cols = splitIntoColumns(
    entries,
    annexColumnCount(entries.length, showPhotos, photoSize)
  );
  return (
    <View style={styles.annexGroup} wrap={false}>
      <View style={styles.annexColumns}>
        {cols.map((col, colIdx) => (
          <View key={`bcol-${colIdx}`} style={styles.annexColumn}>
            {col.map((entry, i) => (
              <View key={`${colIdx}-${i}`} style={styles.annexPersonRow}>
                {showPhotos && entry.kind === "member" ? (
                  <View style={[styles.annexThumb, thumb]}>
                    <Image
                      src={entry.photoUrl || ""}
                      style={[styles.annexThumbImg, thumb]}
                    />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.annexListItem}>
                    {showPhotos && entry.kind === "member"
                      ? entry.name
                      : `• ${entry.name}`}
                  </Text>
                  <Text style={styles.visitorType}>
                    {entry.dateLabel}
                    {entry.kind === "spouse" ? ` — ${entry.kindLabel}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Annexe — proposition 3 (chips + groupes multi-colonnes). */
function AnnexPage({
  data,
  labels,
}: {
  data: MinutePDFData;
  labels: {
    title: string;
    attendanceList: string;
    visitorsList: string;
    weekBirthdays: string;
    none: string;
    meetingOf: string;
    presentLabel: string;
    absentLabel: string;
    rateLabel: string;
    typeLabel: string;
    presidedLabel: string;
    secretaryLabel: string;
    agendaLabel: string;
    decisionLabel: string;
    actionLabel: string;
  };
}) {
  const annex = data.annex;
  if (!annex) return null;
  const photoSize = annex.memberPhotoSize ?? DEFAULT_MINUTE_MEMBER_PHOTO_SIZE;
  const weekBirthdays = annex.weekBirthdays ?? [];

  return (
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.accentBar} fixed />
      <PdfClubHeader data={data} />

      <Text style={styles.annexTitle}>{labels.title}</Text>
      <Text style={styles.annexMeta}>
        {labels.meetingOf} {data.meeting.date}
        {data.meeting.location ? ` — ${data.meeting.location}` : ""}
      </Text>

      {annex.memberGroups.length > 0 ? (
        <View style={styles.annexSummaryRow} wrap={false}>
          {annex.memberGroups.map((group) => (
            <View key={`chip-${group.category}`} style={styles.annexChip}>
              <Text style={styles.annexChipValue}>{group.people.length}</Text>
              <Text style={styles.annexChipLabel}>{group.label}</Text>
            </View>
          ))}
          {annex.totalVisitors > 0 ? (
            <View style={styles.annexChip}>
              <Text style={styles.annexChipValue}>{annex.totalVisitors}</Text>
              <Text style={styles.annexChipLabel}>{labels.visitorsList}</Text>
            </View>
          ) : null}
          {weekBirthdays.length > 0 ? (
            <View style={styles.annexChip}>
              <Text style={styles.annexChipValue}>{weekBirthdays.length}</Text>
              <Text style={styles.annexChipLabel}>{labels.weekBirthdays}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.annexSubtitle}>
        {labels.attendanceList} ({annex.totalMembers})
      </Text>
      {annex.memberGroups.length === 0 ? (
        <Text style={styles.annexEmpty}>{labels.none}</Text>
      ) : (
        annex.memberGroups.map((group) => (
          <MemberGroupBlock
            key={group.category}
            group={group}
            showPhotos={annex.showMemberPhotos}
            photoSize={photoSize}
          />
        ))
      )}

      <Text style={styles.annexSubtitle}>
        {labels.visitorsList} ({annex.totalVisitors})
      </Text>
      <VisitorsBlock visitors={annex.visitors} noneLabel={labels.none} />

      <Text style={styles.annexSubtitle}>
        {labels.weekBirthdays} ({weekBirthdays.length})
      </Text>
      <WeekBirthdaysBlock
        entries={weekBirthdays}
        noneLabel={labels.none}
        showPhotos={annex.showMemberPhotos}
        photoSize={photoSize}
      />

      <MinutePdfFooter data={data} leftLabel={`Annexe — ${data.club.name}`} />
    </Page>
  );
}

export function MinutePDFDocument({ data }: { data: MinutePDFData }) {
  const isFr = data.locale !== "en" && data.locale !== "es";
  const isEs = data.locale === "es";

  const labels = {
    title: isFr
      ? "Annexe — Présences et visiteurs"
      : isEs
        ? "Anexo — Asistencias y visitantes"
        : "Annex — Attendance and visitors",
    attendanceList: isFr ? "Liste de présence" : isEs ? "Lista de asistencia" : "Attendance list",
    visitorsList: isFr ? "Visiteurs" : isEs ? "Visitantes" : "Visitors",
    weekBirthdays: isFr
      ? "Anniversaires de la semaine"
      : isEs
        ? "Cumpleaños de la semana"
        : "Birthdays this week",
    none: isFr ? "Aucune entrée" : isEs ? "Sin entradas" : "No entries",
    meetingOf: isFr ? "Réunion du" : isEs ? "Reunión del" : "Meeting of",
    presentLabel: isFr ? "Présents" : isEs ? "Presentes" : "Present",
    absentLabel: isFr ? "Absents" : isEs ? "Ausentes" : "Absent",
    rateLabel: isFr ? "Assiduité" : isEs ? "Asistencia" : "Attendance",
    typeLabel: isFr ? "Type" : isEs ? "Tipo" : "Type",
    presidedLabel: isFr ? "Présidée par" : isEs ? "Presidida por" : "Presided by",
    secretaryLabel: isFr ? "Secrétaire" : isEs ? "Secretario/a" : "Secretary",
    agendaLabel: isFr ? "Ordre du jour" : isEs ? "Orden del día" : "Agenda",
    decisionLabel: isFr ? "Décision" : isEs ? "Decisión" : "Decision",
    actionLabel: isFr ? "Action" : isEs ? "Acción" : "Action",
    verifyHint: isFr
      ? "Scannez le QR pour vérifier l’authenticité en ligne"
      : isEs
        ? "Escanee el QR para verificar la autenticidad en línea"
        : "Scan the QR code to verify authenticity online",
  };

  const authLabel = isFr
    ? `Document authentifié — ${data.club.name}`
    : isEs
      ? `Documento autenticado — ${data.club.name}`
      : `Authenticated document — ${data.club.name}`;

  return (
    <Document>
      {/* Corps — proposition 4 */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.accentBar} fixed />
        <PdfClubHeader data={data} />

        <Text style={styles.title}>{data.title}</Text>

        <View style={styles.dateBand} wrap={false}>
          <Text style={styles.dateBandText}>
            <Text style={styles.dateBandStrong}>{data.meeting.date}</Text>
          </Text>
          {data.meeting.location ? (
            <Text style={styles.dateBandText}>{data.meeting.location}</Text>
          ) : null}
        </View>

        <View style={styles.metaRow} wrap={false}>
          <View style={styles.metaPill}>
            <Text style={styles.metaLbl}>{labels.typeLabel}</Text>
            <Text style={styles.metaVal}>{data.meeting.type}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaLbl}>{labels.presidedLabel}</Text>
            <Text style={styles.metaVal}>{data.meeting.presidedBy || "—"}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaLbl}>{labels.secretaryLabel}</Text>
            <Text style={styles.metaVal}>{data.meeting.secretary || "—"}</Text>
          </View>
        </View>

        <View style={styles.stats} wrap={false}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{data.attendances.present}</Text>
            <Text style={styles.statLbl}>{labels.presentLabel}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{data.attendances.absent}</Text>
            <Text style={styles.statLbl}>{labels.absentLabel}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{data.attendances.rate}%</Text>
            <Text style={styles.statLbl}>{labels.rateLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionHead}>{labels.agendaLabel}</Text>
        {data.agendaItems.map((item, i) => (
          <View key={i} style={styles.agendaCard} wrap={false} minPresenceAhead={48}>
            <View style={styles.agendaHead}>
              <View style={styles.agendaNum}>
                <Text style={styles.agendaNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.agendaTitle}>{item.title}</Text>
            </View>
            {item.description ? (
              <Text style={styles.agendaDesc}>{item.description}</Text>
            ) : null}
            {item.decisions ? (
              <Text style={styles.lineDec}>
                {labels.decisionLabel} — {item.decisions}
              </Text>
            ) : null}
            {item.actions ? (
              <Text style={styles.lineAct}>
                {labels.actionLabel} — {item.actions}
              </Text>
            ) : null}
          </View>
        ))}

        <MinutePdfFooter
          data={data}
          leftLabel={authLabel}
          showQr
          verifyHint={labels.verifyHint}
        />
      </Page>

      {data.annex ? <AnnexPage data={data} labels={labels} /> : null}
    </Document>
  );
}
