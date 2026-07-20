/**
 * Propositions 3 & 4 : corps du PV redessiné, HEADER IDENTIQUE au PV actuel
 * (accent bar + logo avec clear space + nom club à droite) pour ne pas détériorer le logo.
 *
 * Usage : npx tsx scripts/generate-pv-design-proposals-v2.tsx
 *
 *   %USERPROFILE%\Downloads\proposition3.pdf
 *   %USERPROFILE%\Downloads\proposition4.pdf
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import { ClubDefaultLogoPdf } from "../src/components/brand/club-default-logo-pdf";
import { ROTARY_BRAND, ROTARY_LOGO_DISPLAY } from "../src/lib/rotary-brand";

Font.registerHyphenationCallback((word) => [word]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const C = ROTARY_BRAND;
const clear = ROTARY_LOGO_DISPLAY.clearSpacePx * 0.75;

const PAGE_PADDING_X = 40;
const PAGE_PADDING_TOP = 40;
const FOOTER_RESERVED_PT = 100;
const FOOTER_BOTTOM_PT = 22;
const FOOTER_HEIGHT_PT = 72;

function fileToDataUrl(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

const clubLogoUrl =
  fileToDataUrl(path.join(ROOT, "public", "logo.png")) ||
  fileToDataUrl(path.join(ROOT, "assets", "branding", "logo-master.jpg"));

const sample = {
  clubName: "Rotary Club de Marseille Provence",
  address: "58 cours Pierre Puget, 13006 Marseille",
  title: "Procès-verbal — Réunion statutaire",
  date: "15 juillet 2026",
  location: "Hôtel NH Collection — Salon Vieux-Port",
  type: "Réunion statutaire",
  presidedBy: "Antoine MOREL",
  secretary: "Valérie COSTA",
  present: 18,
  absent: 4,
  rate: 82,
  hash: "a3f8c91e2b7d4e6f0a1b2c3d4e5f6789abcdef0123456789",
  agenda: [
    {
      title: "Ouverture et tour de table",
      description:
        "La séance est ouverte à 12 h 45. Le président souhaite la bienvenue à 18 membres et 3 invités.",
      decisions: "",
      actions: "",
    },
    {
      title: "Conférence — Économie circulaire en Méditerranée",
      description:
        "Mme Laura Benetti, consultante en développement durable, présente les initiatives des clubs Rotary du littoral.",
      decisions: "Remerciements officiels à la conférencière.",
      actions: "",
    },
    {
      title: "Projet « Parc marin » — Calanques",
      description:
        "La commission environnement propose un partenariat avec une association locale pour la sensibilisation scolaire.",
      decisions: "Budget de 1 200 € alloué pour la rentrée 2026.",
      actions: "Marc DELORME contacte les écoles partenaires avant le 1er septembre.",
    },
    {
      title: "Visite du gouverneur — préparation",
      description:
        "Organisation de la réception prévue le 12 octobre 2026 : programme, salle et liste des intervenants.",
      decisions: "Comité d'organisation de cinq membres constitué.",
      actions: "Valérie COSTA réserve la salle et envoie les invitations avant le 20 août.",
    },
    {
      title: "Clôture",
      description: "Le président remercie l'assemblée et lève la séance à 14 h 15.",
      decisions: "",
      actions: "",
    },
  ],
  presentNames: [
    "Antoine MOREL",
    "Valérie COSTA",
    "Marc DELORME",
    "Nadia FOURNIER",
    "Hugo BERNARD",
    "Élodie MARTIN",
    "Sophie LEROY",
    "Luc MOREAU",
    "Camille PETIT",
    "Thomas GIRARD",
    "Émilie ROUSSEAU",
    "Paul FABRE",
    "Isabelle NOEL",
    "Julien MARCHAND",
    "Claire BONNET",
    "Nicolas ROUX",
    "Amélie GARNIER",
    "François BLANC",
  ],
  excusedNames: ["Claire RENAUD", "David GARCIA", "Pauline MERCIER"],
  unexcusedNames: ["Karim HADDAD"],
  visitors: [
    { name: "Laura BENETTI", type: "Conférencière" },
    { name: "Président RC Aix-en-Provence", type: "Invité rotarien" },
    { name: "Pierre LAMBERT", type: "Invité professionnel" },
  ],
};

function chunkCols(items: string[], n: number): string[][] {
  const cols: string[][] = Array.from({ length: n }, () => []);
  const per = Math.ceil(items.length / n) || 1;
  items.forEach((item, i) => {
    cols[Math.min(Math.floor(i / per), n - 1)].push(item);
  });
  return cols;
}

/* ── Header EXACT du PV actuel (minute-pdf.tsx) ─────────────────────────── */

const headerStyles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING_TOP,
    paddingHorizontal: PAGE_PADDING_X,
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
  clubInfo: {
    textAlign: "right",
    fontSize: 9,
    color: C.muted,
    flex: 1,
    marginLeft: 16,
  },
  clubNameSide: {
    fontWeight: "bold",
    color: C.royalBlue,
    fontSize: 11,
    marginBottom: 4,
  },
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
  footerMain: { flex: 1, paddingRight: 12, justifyContent: "flex-end" },
  footerRight: { alignItems: "flex-end", width: 70 },
  hash: { fontSize: 7, color: C.muted, marginTop: 3 },
  pageNumber: { fontSize: 8, color: C.muted, marginTop: 4 },
  qrBox: {
    width: 52,
    height: 52,
    backgroundColor: "#E8F0FA",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.royalBlue,
    alignItems: "center",
    justifyContent: "center",
  },
});

/** Header production : barre d’accent + logo (clear space) + infos club. */
function CurrentPvHeader({ annex = false }: { annex?: boolean }) {
  const logoAspect = 1;
  return (
    <>
      <View style={headerStyles.accentBar} fixed />
      <View style={headerStyles.header} wrap={false}>
        {clubLogoUrl ? (
          <View style={headerStyles.logoClearSpace}>
            <Image
              src={clubLogoUrl}
              style={{
                ...headerStyles.logo,
                width: ROTARY_LOGO_DISPLAY.pdfMaxHeightPt * logoAspect,
              }}
            />
          </View>
        ) : (
          <ClubDefaultLogoPdf clubName={sample.clubName} />
        )}
        <View style={headerStyles.clubInfo}>
          <Text style={headerStyles.clubNameSide}>{sample.clubName}</Text>
          <Text>{sample.address}</Text>
          {annex ? (
            <Text style={{ marginTop: 4, fontSize: 8 }}>Annexe — Présences</Text>
          ) : null}
        </View>
      </View>
    </>
  );
}

function SharedFooter({ label }: { label: string }) {
  return (
    <View style={headerStyles.footer} fixed>
      <View style={headerStyles.footerMain}>
        <Text style={{ fontFamily: "Helvetica-Bold", color: C.royalBlue }}>{label}</Text>
        <Text style={headerStyles.hash}>SHA-256 : {sample.hash.slice(0, 40)}…</Text>
        <Text
          style={headerStyles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
      <View style={headerStyles.footerRight}>
        <View style={headerStyles.qrBox}>
          <Text style={{ fontSize: 7, color: C.royalBlue, fontFamily: "Helvetica-Bold" }}>QR</Text>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROPOSITION 3 — Compacte structurée (header actuel conservé)
 * Méta en tableau 2 colonnes, stats en bandeau, ODJ avec filet gauche or,
 * blocs Décision / Action séparés, annexe multi-colonnes.
 * ═══════════════════════════════════════════════════════════════════════════ */

const s3 = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF6E5",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.charcoal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: C.muted,
    textAlign: "center",
    marginBottom: 14,
  },
  table: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRowLast: { flexDirection: "row" },
  tableCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: C.border,
  },
  tableCellLast: { flex: 1, paddingVertical: 6, paddingHorizontal: 8 },
  tableLabel: { fontSize: 7, color: C.muted, marginBottom: 2 },
  tableValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  stats: {
    flexDirection: "row",
    marginBottom: 14,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  statCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: C.border,
  },
  statVal: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.royalBlue },
  statLbl: { fontSize: 7, color: C.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  item: {
    marginBottom: 9,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  itemNum: { fontSize: 8, color: C.gold, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  itemTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  itemDesc: { fontSize: 9, lineHeight: 1.35, color: C.charcoal },
  boxes: { flexDirection: "row", gap: 6, marginTop: 6 },
  boxDec: {
    flex: 1,
    backgroundColor: "#E8F0FA",
    borderRadius: 3,
    padding: 5,
  },
  boxAct: {
    flex: 1,
    backgroundColor: "#ECFDF5",
    borderRadius: 3,
    padding: 5,
  },
  boxLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  boxText: { fontSize: 8 },
  annexTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    textAlign: "center",
    marginBottom: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    backgroundColor: C.offWhite,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.royalBlue, textAlign: "center" },
  chipLbl: { fontSize: 7, color: C.muted, textAlign: "center" },
  group: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: C.offWhite,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  groupHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  groupTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.royalBlue },
  cols: { flexDirection: "row", gap: 6 },
  col: { flex: 1 },
  name: { fontSize: 8, marginBottom: 2 },
});

function Proposition3() {
  const presentCols = chunkCols(sample.presentNames, 3);
  return (
    <Document title="Proposition 3 — Compacte structurée (header actuel)">
      <Page size="A4" style={headerStyles.page} wrap>
        <CurrentPvHeader />
        <Text style={s3.tag}>PROPOSITION 3 — Compacte structurée · header PV actuel</Text>
        <Text style={s3.title}>{sample.title}</Text>
        <Text style={s3.subtitle}>
          {sample.date} · {sample.location}
        </Text>

        <View style={s3.table} wrap={false}>
          <View style={s3.tableRow}>
            <View style={s3.tableCell}>
              <Text style={s3.tableLabel}>Type</Text>
              <Text style={s3.tableValue}>{sample.type}</Text>
            </View>
            <View style={s3.tableCellLast}>
              <Text style={s3.tableLabel}>Lieu</Text>
              <Text style={s3.tableValue}>{sample.location}</Text>
            </View>
          </View>
          <View style={s3.tableRowLast}>
            <View style={s3.tableCell}>
              <Text style={s3.tableLabel}>Présidée par</Text>
              <Text style={s3.tableValue}>{sample.presidedBy}</Text>
            </View>
            <View style={s3.tableCellLast}>
              <Text style={s3.tableLabel}>Secrétaire</Text>
              <Text style={s3.tableValue}>{sample.secretary}</Text>
            </View>
          </View>
        </View>

        <View style={s3.stats} wrap={false}>
          <View style={s3.statCell}>
            <Text style={s3.statVal}>{sample.present}</Text>
            <Text style={s3.statLbl}>Présents</Text>
          </View>
          <View style={s3.statCell}>
            <Text style={s3.statVal}>{sample.absent}</Text>
            <Text style={s3.statLbl}>Absents</Text>
          </View>
          <View style={[s3.statCell, { borderRightWidth: 0 }]}>
            <Text style={s3.statVal}>{sample.rate}%</Text>
            <Text style={s3.statLbl}>Assiduité</Text>
          </View>
        </View>

        <Text style={s3.sectionTitle}>Ordre du jour</Text>
        {sample.agenda.map((item, i) => (
          <View key={i} style={s3.item} wrap={false}>
            <Text style={s3.itemNum}>POINT {i + 1}</Text>
            <Text style={s3.itemTitle}>{item.title}</Text>
            {item.description ? <Text style={s3.itemDesc}>{item.description}</Text> : null}
            {(item.decisions || item.actions) && (
              <View style={s3.boxes}>
                {item.decisions ? (
                  <View style={s3.boxDec}>
                    <Text style={[s3.boxLabel, { color: C.royalBlue }]}>DÉCISION</Text>
                    <Text style={s3.boxText}>{item.decisions}</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {item.actions ? (
                  <View style={s3.boxAct}>
                    <Text style={[s3.boxLabel, { color: "#047857" }]}>ACTION</Text>
                    <Text style={s3.boxText}>{item.actions}</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            )}
          </View>
        ))}

        <SharedFooter label={`Document authentifié — ${sample.clubName}`} />
      </Page>

      <Page size="A4" style={headerStyles.page} wrap>
        <CurrentPvHeader annex />
        <Text style={s3.annexTitle}>Annexe — Présences et visiteurs</Text>
        <View style={s3.chips} wrap={false}>
          <View style={s3.chip}>
            <Text style={s3.chipVal}>{sample.presentNames.length}</Text>
            <Text style={s3.chipLbl}>Présents</Text>
          </View>
          <View style={s3.chip}>
            <Text style={s3.chipVal}>{sample.excusedNames.length}</Text>
            <Text style={s3.chipLbl}>Excusés</Text>
          </View>
          <View style={s3.chip}>
            <Text style={s3.chipVal}>{sample.unexcusedNames.length}</Text>
            <Text style={s3.chipLbl}>Non excusés</Text>
          </View>
          <View style={s3.chip}>
            <Text style={s3.chipVal}>{sample.visitors.length}</Text>
            <Text style={s3.chipLbl}>Visiteurs</Text>
          </View>
        </View>

        <View style={s3.group} wrap={false}>
          <View style={s3.groupHead}>
            <Text style={s3.groupTitle}>Présents</Text>
            <Text style={{ fontSize: 8, color: C.muted }}>{sample.presentNames.length}</Text>
          </View>
          <View style={s3.cols}>
            {presentCols.map((col, ci) => (
              <View key={ci} style={s3.col}>
                {col.map((n) => (
                  <Text key={n} style={s3.name}>
                    • {n}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={s3.group} wrap={false}>
          <View style={s3.groupHead}>
            <Text style={s3.groupTitle}>Excusés</Text>
            <Text style={{ fontSize: 8, color: C.muted }}>{sample.excusedNames.length}</Text>
          </View>
          {sample.excusedNames.map((n) => (
            <Text key={n} style={s3.name}>
              • {n}
            </Text>
          ))}
        </View>

        <View style={s3.group} wrap={false}>
          <View style={s3.groupHead}>
            <Text style={s3.groupTitle}>Visiteurs</Text>
            <Text style={{ fontSize: 8, color: C.muted }}>{sample.visitors.length}</Text>
          </View>
          {sample.visitors.map((v) => (
            <Text key={v.name} style={s3.name}>
              • {v.name} — {v.type}
            </Text>
          ))}
        </View>

        <SharedFooter label={`Annexe — ${sample.clubName}`} />
      </Page>
    </Document>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROPOSITION 4 — Clair « compte-rendu » (header actuel conservé)
 * Bande date/lieu, méta horizontale, ODJ type fiche (numéro dans pastille or),
 * décisions/actions en lignes labellisées, annexe 2 colonnes journal.
 * ═══════════════════════════════════════════════════════════════════════════ */

const s4 = StyleSheet.create({
  tag: {
    alignSelf: "flex-start",
    backgroundColor: C.royalBlue,
    color: C.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
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
  card: {
    marginBottom: 10,
    padding: 9,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 5,
    backgroundColor: C.white,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  num: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  numT: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.charcoal },
  cardTitle: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold" },
  cardDesc: { fontSize: 9, lineHeight: 1.35, color: C.charcoal, marginBottom: 4 },
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
  annexTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.charcoal,
    marginBottom: 4,
  },
  annexSub: { fontSize: 8, color: C.muted, marginBottom: 12 },
  twoCol: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  blockTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: C.gold,
  },
  name: { fontSize: 8, marginBottom: 2.5 },
  visitorRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  visitorName: { fontSize: 8, flex: 1 },
  visitorType: { fontSize: 7, color: C.muted },
});

function Proposition4() {
  const presentCols = chunkCols(sample.presentNames, 2);
  return (
    <Document title="Proposition 4 — Compte-rendu clair (header actuel)">
      <Page size="A4" style={headerStyles.page} wrap>
        <CurrentPvHeader />
        <Text style={s4.tag}>PROPOSITION 4 — Compte-rendu clair · header PV actuel</Text>
        <Text style={s4.title}>{sample.title}</Text>

        <View style={s4.dateBand} wrap={false}>
          <Text style={s4.dateBandText}>
            <Text style={s4.dateBandStrong}>{sample.date}</Text>
          </Text>
          <Text style={s4.dateBandText}>{sample.location}</Text>
        </View>

        <View style={s4.metaRow} wrap={false}>
          <View style={s4.metaPill}>
            <Text style={s4.metaLbl}>Type</Text>
            <Text style={s4.metaVal}>{sample.type}</Text>
          </View>
          <View style={s4.metaPill}>
            <Text style={s4.metaLbl}>Présidée par</Text>
            <Text style={s4.metaVal}>{sample.presidedBy}</Text>
          </View>
          <View style={s4.metaPill}>
            <Text style={s4.metaLbl}>Secrétaire</Text>
            <Text style={s4.metaVal}>{sample.secretary}</Text>
          </View>
        </View>

        <View style={s4.stats} wrap={false}>
          <View style={s4.stat}>
            <Text style={s4.statVal}>{sample.present}</Text>
            <Text style={s4.statLbl}>Présents</Text>
          </View>
          <View style={s4.stat}>
            <Text style={s4.statVal}>{sample.absent}</Text>
            <Text style={s4.statLbl}>Absents</Text>
          </View>
          <View style={s4.stat}>
            <Text style={s4.statVal}>{sample.rate}%</Text>
            <Text style={s4.statLbl}>Assiduité</Text>
          </View>
        </View>

        <Text style={s4.sectionHead}>Ordre du jour</Text>
        {sample.agenda.map((item, i) => (
          <View key={i} style={s4.card} wrap={false}>
            <View style={s4.cardHead}>
              <View style={s4.num}>
                <Text style={s4.numT}>{i + 1}</Text>
              </View>
              <Text style={s4.cardTitle}>{item.title}</Text>
            </View>
            {item.description ? <Text style={s4.cardDesc}>{item.description}</Text> : null}
            {item.decisions ? (
              <Text style={s4.lineDec}>Décision — {item.decisions}</Text>
            ) : null}
            {item.actions ? <Text style={s4.lineAct}>Action — {item.actions}</Text> : null}
          </View>
        ))}

        <SharedFooter label={`Document authentifié — ${sample.clubName}`} />
      </Page>

      <Page size="A4" style={headerStyles.page} wrap>
        <CurrentPvHeader annex />
        <Text style={s4.annexTitle}>Annexe — Présences et visiteurs</Text>
        <Text style={s4.annexSub}>Réunion du {sample.date}</Text>

        <View style={s4.twoCol}>
          <View style={s4.half}>
            <Text style={s4.blockTitle}>Présents ({sample.presentNames.length})</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {presentCols.map((col, ci) => (
                <View key={ci} style={{ flex: 1 }}>
                  {col.map((n) => (
                    <Text key={n} style={s4.name}>
                      • {n}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={s4.half}>
            <Text style={s4.blockTitle}>Excusés ({sample.excusedNames.length})</Text>
            {sample.excusedNames.map((n) => (
              <Text key={n} style={s4.name}>
                • {n}
              </Text>
            ))}
            <Text style={[s4.blockTitle, { marginTop: 12 }]}>
              Non excusés ({sample.unexcusedNames.length})
            </Text>
            {sample.unexcusedNames.map((n) => (
              <Text key={n} style={s4.name}>
                • {n}
              </Text>
            ))}
            <Text style={[s4.blockTitle, { marginTop: 12 }]}>
              Visiteurs ({sample.visitors.length})
            </Text>
            {sample.visitors.map((v) => (
              <View key={v.name} style={s4.visitorRow}>
                <Text style={s4.visitorName}>• {v.name}</Text>
                <Text style={s4.visitorType}>{v.type}</Text>
              </View>
            ))}
          </View>
        </View>

        <SharedFooter label={`Annexe — ${sample.clubName}`} />
      </Page>
    </Document>
  );
}

async function main() {
  const downloads = path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads");
  if (!fs.existsSync(downloads)) {
    throw new Error(`Downloads introuvable : ${downloads}`);
  }

  const out3 = path.join(downloads, "proposition3.pdf");
  const out4 = path.join(downloads, "proposition4.pdf");

  const buf3 = await renderToBuffer(<Proposition3 />);
  const buf4 = await renderToBuffer(<Proposition4 />);
  fs.writeFileSync(out3, buf3);
  fs.writeFileSync(out4, buf4);

  console.log("PDF créés (header = PV actuel, logos préservés) :");
  console.log(`  3) ${out3}`);
  console.log(`  4) ${out4}`);
  console.log("");
  console.log("Proposition 3 — Compacte structurée");
  console.log("  Tableau méta 2×2, stats bandeau, ODJ filet or, blocs DÉCISION/ACTION.");
  console.log("Proposition 4 — Compte-rendu clair");
  console.log("  Bande date/lieu, pastilles méta, fiches ODJ numérotées or, annexe 2 col.");
  console.log(`Logo club : ${clubLogoUrl ? "oui" : "ClubDefaultLogoPdf"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
