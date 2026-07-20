/**
 * Génère 2 propositions de mise en page PDF pour le PV (avec logos).
 * Usage : npx tsx scripts/generate-pv-design-proposals.tsx
 *
 * Fichiers :
 *   %USERPROFILE%\Downloads\proposition1.pdf  — Institutionnel / timeline
 *   %USERPROFILE%\Downloads\proposition2.pdf  — Éditorial / moderne
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

Font.registerHyphenationCallback((word) => [word]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** Absolute file path → data URL for react-pdf Image. */
function fileToDataUrl(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".svg"
          ? "image/svg+xml"
          : "application/octet-stream";
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

const clubLogoUrl =
  fileToDataUrl(path.join(ROOT, "public", "logo.png")) ||
  fileToDataUrl(path.join(ROOT, "assets", "branding", "logo-master.jpg"));
const rotaryWordmarkUrl = fileToDataUrl(
  path.join(ROOT, "public", "brand", "rotary-wordmark.png")
);

const C = {
  royalBlue: "#17458B",
  gold: "#F7A81B",
  azure: "#0067C8",
  charcoal: "#1B1B1B",
  white: "#FFFFFF",
  offWhite: "#F8F7F4",
  muted: "#64748B",
  border: "#E2E8F0",
  softBlue: "#E8F0FA",
  softGold: "#FFF6E5",
};

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
  verifyUrl: "https://app.example.com/fr/verify/a3f8c91e2b7d4e6f",
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
  const per = Math.ceil(items.length / n);
  items.forEach((item, i) => {
    cols[Math.min(Math.floor(i / per), n - 1)].push(item);
  });
  return cols;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROPOSITION 1 — Institutionnel « Timeline »
 * Bandeau bleu + filet or, méta en cartes, ODJ en fil chronologique numéroté,
 * annexe multi-colonnes, pied d’authentification cadré.
 * ═══════════════════════════════════════════════════════════════════════════ */

const s1 = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 96,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.charcoal,
  },
  topBand: {
    backgroundColor: C.royalBlue,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBandLabel: {
    color: C.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  topBandSub: { color: "#B8C9E0", fontSize: 7, marginTop: 2 },
  brandBar: {
    backgroundColor: C.white,
    paddingVertical: 12,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  clubLogoImg: {
    height: 48,
    width: 48,
    objectFit: "contain",
  },
  wordmarkImg: {
    height: 28,
    objectFit: "contain",
  },
  brandRight: { alignItems: "flex-end", maxWidth: 200 },
  clubName: {
    color: C.royalBlue,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    textAlign: "right",
  },
  clubAddress: { color: C.muted, fontSize: 8, textAlign: "right" },
  goldLine: { height: 4, backgroundColor: C.gold },
  body: { paddingHorizontal: 36, paddingTop: 16 },
  proposalTag: {
    alignSelf: "flex-start",
    backgroundColor: C.softGold,
    color: C.charcoal,
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
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  metaCard: {
    width: "48%",
    backgroundColor: C.offWhite,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 8,
  },
  metaLabel: { fontSize: 7, color: C.muted, marginBottom: 2, textTransform: "uppercase" },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.charcoal },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: C.softBlue,
    borderRadius: 5,
    padding: 8,
    alignItems: "center",
  },
  statVal: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.royalBlue },
  statLbl: { fontSize: 7, color: C.muted, marginTop: 2 },
  sectionHead: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: C.gold,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  timelineLeft: {
    width: 28,
    alignItems: "center",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.royalBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineNum: { color: C.white, fontSize: 8, fontFamily: "Helvetica-Bold" },
  timelineLine: {
    width: 2,
    flexGrow: 1,
    backgroundColor: C.border,
    marginTop: 2,
    minHeight: 8,
  },
  timelineBody: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: C.azure,
    padding: 8,
    marginLeft: 4,
  },
  agendaTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  agendaText: { fontSize: 9, color: C.charcoal, lineHeight: 1.35 },
  callout: {
    marginTop: 5,
    padding: 5,
    borderRadius: 3,
    backgroundColor: C.white,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  calloutDec: { fontSize: 8, color: C.royalBlue },
  calloutAct: { fontSize: 8, color: "#0F766E", marginTop: 2 },
  annexTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    textAlign: "center",
    marginBottom: 4,
  },
  annexMeta: { fontSize: 8, color: C.muted, textAlign: "center", marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: {
    backgroundColor: C.softBlue,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  chipVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.royalBlue, textAlign: "center" },
  chipLbl: { fontSize: 7, color: C.muted, textAlign: "center" },
  groupBox: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: C.offWhite,
    borderRadius: 5,
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
  groupCount: { fontSize: 8, color: C.muted },
  cols: { flexDirection: "row", gap: 6 },
  col: { flex: 1 },
  nameItem: { fontSize: 8, marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    height: 68,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerMain: { flex: 1, paddingRight: 10 },
  footerAuth: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
  },
  footerHash: { fontSize: 6.5, color: C.muted, marginTop: 2 },
  footerPage: { fontSize: 8, color: C.muted, marginTop: 4 },
  qrBox: {
    width: 56,
    height: 56,
    backgroundColor: C.softBlue,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.royalBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  qrText: { fontSize: 7, color: C.royalBlue, fontFamily: "Helvetica-Bold" },
});

function BrandHeaderProp1({ annex = false }: { annex?: boolean }) {
  return (
    <>
      <View style={s1.topBand} fixed>
        <View>
          <Text style={s1.topBandLabel}>
            {annex ? "ANNEXE — PRÉSENCES" : "PROCÈS-VERBAL"}
          </Text>
          <Text style={s1.topBandSub}>Rotary International · Document officiel de club</Text>
        </View>
        {rotaryWordmarkUrl ? (
          <Image
            src={rotaryWordmarkUrl}
            style={{ height: 22, width: 90, objectFit: "contain" }}
          />
        ) : null}
      </View>
      <View style={s1.brandBar} fixed>
        <View style={s1.brandLeft}>
          {clubLogoUrl ? (
            <Image src={clubLogoUrl} style={s1.clubLogoImg} />
          ) : (
            <ClubDefaultLogoPdf clubName={sample.clubName} />
          )}
          {clubLogoUrl && rotaryWordmarkUrl ? (
            <Image src={rotaryWordmarkUrl} style={s1.wordmarkImg} />
          ) : null}
        </View>
        <View style={s1.brandRight}>
          <Text style={s1.clubName}>{sample.clubName}</Text>
          <Text style={s1.clubAddress}>{sample.address}</Text>
        </View>
      </View>
      <View style={s1.goldLine} fixed />
    </>
  );
}

function Proposition1() {
  const presentCols = chunkCols(sample.presentNames, 3);
  return (
    <Document title="Proposition 1 — PV Institutionnel Timeline">
      <Page size="A4" style={s1.page} wrap>
        <BrandHeaderProp1 />

        <View style={s1.body}>
          <Text style={s1.proposalTag}>PROPOSITION 1 — Institutionnel / Timeline</Text>
          <Text style={s1.title}>{sample.title}</Text>
          <Text style={s1.subtitle}>
            {sample.date} · {sample.location}
          </Text>

          <View style={s1.metaGrid} wrap={false}>
            {[
              ["Type", sample.type],
              ["Lieu", sample.location],
              ["Présidée par", sample.presidedBy],
              ["Secrétaire", sample.secretary],
            ].map(([label, value]) => (
              <View key={label} style={s1.metaCard}>
                <Text style={s1.metaLabel}>{label}</Text>
                <Text style={s1.metaValue}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={s1.statsRow} wrap={false}>
            <View style={s1.stat}>
              <Text style={s1.statVal}>{sample.present}</Text>
              <Text style={s1.statLbl}>Présents</Text>
            </View>
            <View style={s1.stat}>
              <Text style={s1.statVal}>{sample.absent}</Text>
              <Text style={s1.statLbl}>Absents</Text>
            </View>
            <View style={s1.stat}>
              <Text style={s1.statVal}>{sample.rate}%</Text>
              <Text style={s1.statLbl}>Assiduité</Text>
            </View>
          </View>

          <Text style={s1.sectionHead}>Ordre du jour</Text>
          {sample.agenda.map((item, i) => (
            <View key={i} style={s1.timelineItem} wrap={false}>
              <View style={s1.timelineLeft}>
                <View style={s1.timelineDot}>
                  <Text style={s1.timelineNum}>{i + 1}</Text>
                </View>
                {i < sample.agenda.length - 1 ? <View style={s1.timelineLine} /> : null}
              </View>
              <View style={s1.timelineBody}>
                <Text style={s1.agendaTitle}>{item.title}</Text>
                {item.description ? <Text style={s1.agendaText}>{item.description}</Text> : null}
                {(item.decisions || item.actions) && (
                  <View style={s1.callout}>
                    {item.decisions ? (
                      <Text style={s1.calloutDec}>Décision — {item.decisions}</Text>
                    ) : null}
                    {item.actions ? (
                      <Text style={s1.calloutAct}>Action — {item.actions}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={s1.footer} fixed>
          <View style={s1.footerMain}>
            <Text style={s1.footerAuth}>Document authentifié — {sample.clubName}</Text>
            <Text style={s1.footerHash}>SHA-256 : {sample.hash.slice(0, 40)}…</Text>
            <Text style={s1.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
          <View style={s1.qrBox}>
            <Text style={s1.qrText}>QR</Text>
            <Text style={{ fontSize: 6, color: C.muted }}>vérif.</Text>
          </View>
        </View>
      </Page>

      {/* Annexe */}
      <Page size="A4" style={s1.page} wrap>
        <BrandHeaderProp1 annex />
        <View style={s1.body}>
          <Text style={s1.annexTitle}>Annexe — Présences et visiteurs</Text>
          <Text style={s1.annexMeta}>Réunion du {sample.date}</Text>

          <View style={s1.chips} wrap={false}>
            <View style={s1.chip}>
              <Text style={s1.chipVal}>{sample.presentNames.length}</Text>
              <Text style={s1.chipLbl}>Présents</Text>
            </View>
            <View style={s1.chip}>
              <Text style={s1.chipVal}>{sample.excusedNames.length}</Text>
              <Text style={s1.chipLbl}>Excusés</Text>
            </View>
            <View style={s1.chip}>
              <Text style={s1.chipVal}>{sample.unexcusedNames.length}</Text>
              <Text style={s1.chipLbl}>Non excusés</Text>
            </View>
            <View style={s1.chip}>
              <Text style={s1.chipVal}>{sample.visitors.length}</Text>
              <Text style={s1.chipLbl}>Visiteurs</Text>
            </View>
          </View>

          <View style={s1.groupBox} wrap={false}>
            <View style={s1.groupHead}>
              <Text style={s1.groupTitle}>Présents</Text>
              <Text style={s1.groupCount}>{sample.presentNames.length}</Text>
            </View>
            <View style={s1.cols}>
              {presentCols.map((col, ci) => (
                <View key={ci} style={s1.col}>
                  {col.map((n) => (
                    <Text key={n} style={s1.nameItem}>
                      • {n}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={s1.groupBox} wrap={false}>
            <View style={s1.groupHead}>
              <Text style={s1.groupTitle}>Excusés</Text>
              <Text style={s1.groupCount}>{sample.excusedNames.length}</Text>
            </View>
            {sample.excusedNames.map((n) => (
              <Text key={n} style={s1.nameItem}>
                • {n}
              </Text>
            ))}
          </View>

          <View style={s1.groupBox} wrap={false}>
            <View style={s1.groupHead}>
              <Text style={s1.groupTitle}>Visiteurs</Text>
              <Text style={s1.groupCount}>{sample.visitors.length}</Text>
            </View>
            {sample.visitors.map((v) => (
              <Text key={v.name} style={s1.nameItem}>
                • {v.name} — {v.type}
              </Text>
            ))}
          </View>
        </View>

        <View style={s1.footer} fixed>
          <View style={s1.footerMain}>
            <Text style={s1.footerAuth}>Annexe — {sample.clubName}</Text>
            <Text style={s1.footerHash}>SHA-256 : {sample.hash.slice(0, 40)}…</Text>
            <Text style={s1.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PROPOSITION 2 — Éditorial moderne
 * Filet latéral bleu, badge type, ODJ en cartes numérotées sobres,
 * décisions/actions en pastilles, annexe dense 2 colonnes type « journal ».
 * ═══════════════════════════════════════════════════════════════════════════ */

const s2 = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 96,
    paddingLeft: 48,
    paddingRight: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.charcoal,
  },
  sideBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: C.royalBlue,
  },
  sideGold: {
    position: "absolute",
    left: 10,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.gold,
  },
  proposalTag: {
    alignSelf: "flex-start",
    backgroundColor: C.royalBlue,
    color: C.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  logoBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  clubLogoImg: {
    height: 52,
    width: 52,
    objectFit: "contain",
  },
  clubBlock: { flex: 1, paddingLeft: 4 },
  clubName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.royalBlue,
    marginBottom: 2,
  },
  clubAddress: { fontSize: 8, color: C.muted },
  badge: {
    backgroundColor: C.softGold,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: C.gold,
  },
  badgeText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.charcoal },
  wordmarkSmall: {
    height: 20,
    width: 80,
    objectFit: "contain",
    marginTop: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.charcoal,
    marginBottom: 4,
  },
  subtitle: { fontSize: 10, color: C.muted, marginBottom: 14 },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 14,
  },
  metaLine: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 16,
  },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 7, color: C.muted, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  statsBar: {
    flexDirection: "row",
    backgroundColor: C.offWhite,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  statsCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: C.border,
  },
  statsVal: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.royalBlue },
  statsLbl: { fontSize: 7, color: C.muted, marginTop: 2 },
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
    marginBottom: 9,
    paddingBottom: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  agendaHead: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  numCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.charcoal },
  agendaTitle: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", paddingTop: 2 },
  agendaDesc: { fontSize: 9, color: C.charcoal, lineHeight: 1.35, marginLeft: 26 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6, marginLeft: 26 },
  tagDec: {
    backgroundColor: C.softBlue,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  tagAct: {
    backgroundColor: "#ECFDF5",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  tagTextDec: { fontSize: 7.5, color: C.royalBlue },
  tagTextAct: { fontSize: 7.5, color: "#047857" },
  annexTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.charcoal,
    marginBottom: 2,
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
    borderBottomWidth: 1,
    borderBottomColor: C.gold,
  },
  nameLine: { fontSize: 8, marginBottom: 2.5 },
  visitorLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  visitorName: { fontSize: 8, flex: 1 },
  visitorType: { fontSize: 7, color: C.muted },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 48,
    right: 36,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerMain: { flex: 1 },
  footerAuth: { fontSize: 8, color: C.muted },
  footerHash: { fontSize: 6.5, color: C.muted, marginTop: 2 },
  footerPage: { fontSize: 8, color: C.muted, marginTop: 3 },
  qrPlaceholder: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.offWhite,
  },
});

function BrandHeaderProp2() {
  return (
    <View style={s2.headerRow} wrap={false}>
      <View style={s2.logoBlock}>
        {clubLogoUrl ? (
          <Image src={clubLogoUrl} style={s2.clubLogoImg} />
        ) : (
          <ClubDefaultLogoPdf clubName={sample.clubName} />
        )}
        <View style={s2.clubBlock}>
          <Text style={s2.clubName}>{sample.clubName}</Text>
          <Text style={s2.clubAddress}>{sample.address}</Text>
          {rotaryWordmarkUrl ? (
            <Image src={rotaryWordmarkUrl} style={s2.wordmarkSmall} />
          ) : null}
        </View>
      </View>
      <View style={s2.badge}>
        <Text style={s2.badgeText}>{sample.type}</Text>
      </View>
    </View>
  );
}

function Proposition2() {
  const presentCols = chunkCols(sample.presentNames, 2);
  return (
    <Document title="Proposition 2 — PV Éditorial moderne">
      <Page size="A4" style={s2.page} wrap>
        <View style={s2.sideBar} fixed />
        <View style={s2.sideGold} fixed />

        <Text style={s2.proposalTag}>PROPOSITION 2 — Éditorial / Moderne</Text>

        <BrandHeaderProp2 />

        <Text style={s2.title}>{sample.title}</Text>
        <Text style={s2.subtitle}>
          {sample.date} · {sample.location}
        </Text>
        <View style={s2.divider} />

        <View style={s2.metaLine} wrap={false}>
          <View style={s2.metaItem}>
            <Text style={s2.metaLabel}>Présidée par</Text>
            <Text style={s2.metaValue}>{sample.presidedBy}</Text>
          </View>
          <View style={s2.metaItem}>
            <Text style={s2.metaLabel}>Secrétaire</Text>
            <Text style={s2.metaValue}>{sample.secretary}</Text>
          </View>
        </View>

        <View style={s2.statsBar} wrap={false}>
          <View style={s2.statsCell}>
            <Text style={s2.statsVal}>{sample.present}</Text>
            <Text style={s2.statsLbl}>Présents</Text>
          </View>
          <View style={s2.statsCell}>
            <Text style={s2.statsVal}>{sample.absent}</Text>
            <Text style={s2.statsLbl}>Absents</Text>
          </View>
          <View style={[s2.statsCell, { borderRightWidth: 0 }]}>
            <Text style={s2.statsVal}>{sample.rate}%</Text>
            <Text style={s2.statsLbl}>Assiduité</Text>
          </View>
        </View>

        <Text style={s2.sectionHead}>Ordre du jour</Text>
        {sample.agenda.map((item, i) => (
          <View key={i} style={s2.agendaCard} wrap={false}>
            <View style={s2.agendaHead}>
              <View style={s2.numCircle}>
                <Text style={s2.numText}>{i + 1}</Text>
              </View>
              <Text style={s2.agendaTitle}>{item.title}</Text>
            </View>
            {item.description ? <Text style={s2.agendaDesc}>{item.description}</Text> : null}
            {(item.decisions || item.actions) && (
              <View style={s2.tagsRow}>
                {item.decisions ? (
                  <View style={s2.tagDec}>
                    <Text style={s2.tagTextDec}>Décision · {item.decisions}</Text>
                  </View>
                ) : null}
                {item.actions ? (
                  <View style={s2.tagAct}>
                    <Text style={s2.tagTextAct}>Action · {item.actions}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        ))}

        <View style={s2.footer} fixed>
          <View style={s2.footerMain}>
            <Text style={s2.footerAuth}>Document authentifié — {sample.clubName}</Text>
            <Text style={s2.footerHash}>SHA-256 : {sample.hash.slice(0, 40)}…</Text>
            <Text
              style={s2.footerPage}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
            />
          </View>
          <View style={s2.qrPlaceholder}>
            <Text style={{ fontSize: 7, color: C.muted }}>QR</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={s2.page} wrap>
        <View style={s2.sideBar} fixed />
        <View style={s2.sideGold} fixed />
        <BrandHeaderProp2 />
        <Text style={s2.annexTitle}>Annexe — Présences et visiteurs</Text>
        <Text style={s2.annexSub}>Réunion du {sample.date} · {sample.clubName}</Text>

        <View style={s2.twoCol}>
          <View style={s2.half}>
            <Text style={s2.blockTitle}>Présents ({sample.presentNames.length})</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {presentCols.map((col, ci) => (
                <View key={ci} style={{ flex: 1 }}>
                  {col.map((n) => (
                    <Text key={n} style={s2.nameLine}>
                      • {n}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={s2.half}>
            <Text style={s2.blockTitle}>Excusés ({sample.excusedNames.length})</Text>
            {sample.excusedNames.map((n) => (
              <Text key={n} style={s2.nameLine}>
                • {n}
              </Text>
            ))}
            <Text style={[s2.blockTitle, { marginTop: 12 }]}>
              Non excusés ({sample.unexcusedNames.length})
            </Text>
            {sample.unexcusedNames.map((n) => (
              <Text key={n} style={s2.nameLine}>
                • {n}
              </Text>
            ))}
            <Text style={[s2.blockTitle, { marginTop: 12 }]}>
              Visiteurs ({sample.visitors.length})
            </Text>
            {sample.visitors.map((v) => (
              <View key={v.name} style={s2.visitorLine}>
                <Text style={s2.visitorName}>• {v.name}</Text>
                <Text style={s2.visitorType}>{v.type}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s2.footer} fixed>
          <View style={s2.footerMain}>
            <Text style={s2.footerAuth}>Annexe — {sample.clubName}</Text>
            <Text style={s2.footerHash}>SHA-256 : {sample.hash.slice(0, 40)}…</Text>
            <Text
              style={s2.footerPage}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}

async function main() {
  const downloads = path.join(process.env.USERPROFILE || process.env.HOME || "", "Downloads");
  if (!fs.existsSync(downloads)) {
    throw new Error(`Dossier Downloads introuvable : ${downloads}`);
  }

  const out1 = path.join(downloads, "proposition1.pdf");
  const out2 = path.join(downloads, "proposition2.pdf");

  const buf1 = await renderToBuffer(<Proposition1 />);
  const buf2 = await renderToBuffer(<Proposition2 />);

  fs.writeFileSync(out1, buf1);
  fs.writeFileSync(out2, buf2);

  console.log("PDF créés :");
  console.log(`  1) ${out1}`);
  console.log(`  2) ${out2}`);
  console.log("");
  console.log(`Logo club : ${clubLogoUrl ? "oui (public/logo.png)" : "repli ClubDefaultLogoPdf"}`);
  console.log(`Wordmark Rotary : ${rotaryWordmarkUrl ? "oui" : "non"}`);
  console.log("");
  console.log("Proposition 1 — Institutionnel / Timeline (+ logos en-tête)");
  console.log("Proposition 2 — Éditorial / Moderne (+ logos en-tête)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
