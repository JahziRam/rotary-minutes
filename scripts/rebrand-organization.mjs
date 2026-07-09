#!/usr/bin/env node
/**
 * Rebrand a copied Rotary Minutes codebase for another service organization.
 * Usage: node scripts/rebrand-organization.mjs <targetDir> <brandKey>
 * brandKey: lions | jci | innerwheel
 */
import fs from "fs";
import path from "path";

const BRANDS = {
  lions: {
    packageName: "lions-minutes",
    productName: "Lions Minutes",
    productAlias: "Lions Club Minutes",
    domain: "lionsminutes.app",
    supportEmail: "support@lionsminutes.app",
    superAdminEmail: "superadmin@lionsminutes.app",
    superAdminPassword: "LionsAdmin2026!",
    organization: "Lions Clubs International",
    organizationShort: "Lions",
    clubTypePrimary: "LIONS",
    clubTypeYouth: "LEO",
    guestPrimary: "LIONS_GUEST",
    guestYouth: "LEO_GUEST",
    guestExternal: "NON_LIONS_GUEST",
    youthLabel: "Leo",
    youthLabelFr: "Leo",
    primaryLabel: "Lions",
    primaryLabelFr: "Lions",
    demoSlug: "lions-club-paris-demo",
    demoClubNameFr: "Lions Club de Paris (Démo)",
    demoClubNameEn: "Paris Lions Club (Demo)",
    demoClubSlugPrefix: "lions-club",
    stripeYouthPromo: "Leo -15%",
    bankId: "LIONS",
    msgKeyPrimary: "lions",
    msgKeyYouth: "leo",
    msgKeyYouthDiscount: "leoDiscount",
    msgKeyPrimaryGuest: "lionsGuest",
    msgKeyYouthGuest: "leoGuest",
    msgKeyExternalGuest: "nonLionsGuest",
    disclaimerFr:
      "Lions Minutes est un outil indépendant. Il n'est pas affilié, approuvé ni sponsorisé par Lions Clubs International.",
    disclaimerEn:
      "Lions Minutes is an independent tool. It is not affiliated with, endorsed by, or sponsored by Lions Clubs International.",
  },
  jci: {
    packageName: "jci-minutes",
    productName: "JCI Minutes",
    productAlias: "JCI Local Minutes",
    domain: "jciminutes.app",
    supportEmail: "support@jciminutes.app",
    superAdminEmail: "superadmin@jciminutes.app",
    superAdminPassword: "JCIAdmin2026!",
    organization: "Junior Chamber International",
    organizationShort: "JCI",
    clubTypePrimary: "JCI",
    clubTypeYouth: "JCI_JUNIOR",
    guestPrimary: "JCI_GUEST",
    guestYouth: "JCI_JUNIOR_GUEST",
    guestExternal: "NON_JCI_GUEST",
    youthLabel: "JCI Junior",
    youthLabelFr: "JCI Junior",
    primaryLabel: "JCI",
    primaryLabelFr: "JCI",
    demoSlug: "jci-paris-demo",
    demoClubNameFr: "JCI Paris (Démo)",
    demoClubNameEn: "JCI Paris (Demo)",
    demoClubSlugPrefix: "jci",
    stripeYouthPromo: "JCI Junior -15%",
    bankId: "JCI",
    msgKeyPrimary: "jci",
    msgKeyYouth: "jciJunior",
    msgKeyYouthDiscount: "jciJuniorDiscount",
    msgKeyPrimaryGuest: "jciGuest",
    msgKeyYouthGuest: "jciJuniorGuest",
    msgKeyExternalGuest: "nonJciGuest",
    disclaimerFr:
      "JCI Minutes est un outil indépendant. Il n'est pas affilié, approuvé ni sponsorisé par Junior Chamber International (JCI).",
    disclaimerEn:
      "JCI Minutes is an independent tool. It is not affiliated with, endorsed by, or sponsored by Junior Chamber International (JCI).",
  },
  innerwheel: {
    packageName: "innerwheel-minutes",
    productName: "Inner Wheel Minutes",
    productAlias: "Inner Wheel Club Minutes",
    domain: "innerwheelminutes.app",
    supportEmail: "support@innerwheelminutes.app",
    superAdminEmail: "superadmin@innerwheelminutes.app",
    superAdminPassword: "InnerWheelAdmin2026!",
    organization: "Inner Wheel",
    organizationShort: "Inner Wheel",
    clubTypePrimary: "INNER_WHEEL",
    clubTypeYouth: "INNER_WHEEL_LINKED",
    guestPrimary: "INNER_WHEEL_GUEST",
    guestYouth: "LINKED_GUEST",
    guestExternal: "NON_INNER_WHEEL_GUEST",
    youthLabel: "Linked club",
    youthLabelFr: "Club associé",
    primaryLabel: "Inner Wheel",
    primaryLabelFr: "Inner Wheel",
    demoSlug: "inner-wheel-paris-demo",
    demoClubNameFr: "Inner Wheel Club de Paris (Démo)",
    demoClubNameEn: "Paris Inner Wheel Club (Demo)",
    demoClubSlugPrefix: "inner-wheel",
    stripeYouthPromo: "Linked club -15%",
    bankId: "INNERWHEEL",
    msgKeyPrimary: "innerWheel",
    msgKeyYouth: "innerWheelLinked",
    msgKeyYouthDiscount: "linkedClubDiscount",
    msgKeyPrimaryGuest: "innerWheelGuest",
    msgKeyYouthGuest: "linkedGuest",
    msgKeyExternalGuest: "nonInnerWheelGuest",
    disclaimerFr:
      "Inner Wheel Minutes est un outil indépendant. Il n'est pas affilié, approuvé ni sponsorisé par Inner Wheel.",
    disclaimerEn:
      "Inner Wheel Minutes is an independent tool. It is not affiliated with, endorsed by, or sponsored by Inner Wheel.",
  },
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".open-next",
  ".turbo",
  "src/generated",
]);

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".html",
  ".css",
  ".scss",
  ".yml",
  ".yaml",
  ".prisma",
  ".sql",
  ".sh",
  ".ps1",
  ".conf",
  ".jsonc",
  ".env",
  ".env.example",
  ".svg",
]);

function buildReplacements(brand) {
  return [
    // URLs & package (longest first)
    ["rotary-minutes-stats", `${brand.packageName}-stats`],
    ["rotary-minutes", brand.packageName],
    ["rotaryminutes.app", brand.domain],
    ["clubminutes.api.mg", `${brand.domain}`],
    ["support@rotaryminutes.app", brand.supportEmail],
    ["superadmin@rotaryminutes.app", brand.superAdminEmail],
    ["legal@rotaryminutes.app", `legal@${brand.domain}`],
    ["privacy@rotaryminutes.app", `privacy@${brand.domain}`],
    ["RotaryAdmin2026!", brand.superAdminPassword],
    // Prisma / code enums
    ["NON_ROTARY_GUEST", brand.guestExternal],
    ["ROTARACT_GUEST", brand.guestYouth],
    ["ROTARY_GUEST", brand.guestPrimary],
    ["ROTARACT_DISCOUNT_PERCENT", "YOUTH_CLUB_DISCOUNT_PERCENT"],
    ["ROTARY_ATTENDANCE_GOAL", "ATTENDANCE_GOAL"],
    ["getRotaryMandateYear", "getMandateYear"],
    ["isInRotaryMandate", "isInMandateYear"],
    ["ROTARACT", brand.clubTypeYouth],
    ["ROTARY", brand.clubTypePrimary],
    // File / component paths
    ["rotary-disclaimer", "organization-disclaimer"],
    ["RotaryDisclaimer", "OrganizationDisclaimer"],
    ["@/lib/rotary", "@/lib/organization"],
    ["lib/rotary.ts", "lib/organization.ts"],
    ["lib/rotary", "lib/organization"],
    // Demo data
    ["rotary-club-paris-demo", brand.demoSlug],
    ["rotary-club", brand.demoClubSlugPrefix],
    ["rotary-paris.fr", `${brand.demoClubSlugPrefix}-paris.fr`],
    ["Rotary Club de Paris (Démo)", brand.demoClubNameFr],
    ["Rotary Club de Paris — Paris, France", `${brand.demoClubNameFr.replace(" (Démo)", "")} — Paris, France`],
    ["Rotary Club de Paris", brand.demoClubNameFr.replace(" (Démo)", "")],
    ["Rotary Club de Lyon", `${brand.primaryLabelFr} Club de Lyon`],
    ["Rotary Club de Marseille", `${brand.primaryLabelFr} Club de Marseille`],
    ["Rotaract Paris Opéra", `${brand.youthLabelFr} Paris Opéra`],
    ["rotaractDiscountPercent", `${brand.msgKeyYouthDiscount}Percent`],
    // Stripe / misc
    ["Rotaract -15%", brand.stripeYouthPromo],
    ["<BANKID>ROTARY</BANKID>", `<BANKID>${brand.bankId}</BANKID>`],
    // Message JSON keys
    ['"rotaractDiscount"', `"${brand.msgKeyYouthDiscount}"`],
    ['"rotaractDiscountTitle"', `"${brand.msgKeyYouthDiscount}Title"`],
    ['"rotaractDiscountHint"', `"${brand.msgKeyYouthDiscount}Hint"`],
    ['"rotaractGuest"', `"${brand.msgKeyYouthGuest}"`],
    ['"rotaryGuest"', `"${brand.msgKeyPrimaryGuest}"`],
    ['"nonRotaryGuest"', `"${brand.msgKeyExternalGuest}"`],
    ['"rotaract"', `"${brand.msgKeyYouth}"`],
    ['"rotary"', `"${brand.msgKeyPrimary}"`],
    // register-form translation keys
    ['tReg("rotaractDiscount"', `tReg("${brand.msgKeyYouthDiscount}"`],
    ['tReg("rotaract"', `tReg("${brand.msgKeyYouth}"`],
    ['tReg("rotary"', `tReg("${brand.msgKeyPrimary}"`],
    // Product branding
    ["Rotary Minutes (also known as Club Minutes)", `${brand.productName} (also known as ${brand.productAlias})`],
    ["Rotary Minutes (également Club Minutes)", `${brand.productName} (également ${brand.productAlias})`],
    ["also known as Club Minutes", `also known as ${brand.productAlias}`],
    ["également Club Minutes", `également ${brand.productAlias}`],
    ["Club Minutes", brand.productAlias],
    ["Rotary Minutes", brand.productName],
    // Organization names in prose
    ["Rotary International", brand.organization],
    ["Rotary et Rotaract", `${brand.organizationShort} et ${brand.youthLabelFr}`],
    ["Rotary and Rotaract", `${brand.organizationShort} and ${brand.youthLabel}`],
    ["Rotary / Rotaract", `${brand.organizationShort} / ${brand.youthLabel}`],
    ["Rotary & Rotaract", `${brand.organizationShort} & ${brand.youthLabel}`],
    ["procès-verbaux Rotary", `procès-verbaux ${brand.organizationShort}`],
    ["Rotary minutes", `${brand.organizationShort} minutes`],
    ["Rotary club", `${brand.primaryLabel} club`],
    ["Rotary Club", `${brand.primaryLabel} Club`],
    ["Rotaract", brand.youthLabel],
    ["Rotary", brand.primaryLabel],
    // French attendance labels in minute-attendance-annex
    ["Invité rotaractien", `Invité ${brand.youthLabelFr.toLowerCase()}`],
    ["Invité rotarien", `Invité ${brand.primaryLabelFr.toLowerCase()}`],
    ["Invité non rotarien", `Invité externe`],
    ["Rotaract guest", `${brand.youthLabel} guest`],
    ["Rotary guest", `${brand.primaryLabel} guest`],
    ["Non-Rotary guest", `External guest`],
    // Legal product strings in company-legal comment
    ["operating Rotary Minutes / Club Minutes", `operating ${brand.productName}`],
    // App settings default
    ['@default("Rotary Minutes")', `@default("${brand.productName}")`],
    // README / landing
    ["Rotary Minutes", brand.productName],
  ];
}

function shouldProcess(filePath) {
  const base = path.basename(filePath);
  if (base === "package-lock.json") return true;
  if (base === "rebrand-organization.mjs") return false;
  const ext = path.extname(filePath);
  if (!ext && !base.startsWith(".env")) return false;
  if (ext && !TEXT_EXT.has(ext) && !base.startsWith(".env")) return false;
  return true;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (shouldProcess(full)) files.push(full);
  }
  return files;
}

function applyReplacements(content, replacements) {
  let out = content;
  for (const [from, to] of replacements) {
    if (from && out.includes(from)) {
      out = out.split(from).join(to);
    }
  }
  return out;
}

function renameIfExists(root, fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log(`  renamed ${fromRel} → ${toRel}`);
  }
}

function patchCompanyLegal(root, brand) {
  const file = path.join(root, "src/lib/company-legal.ts");
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(
    /productName: "[^"]+"/,
    `productName: "${brand.productName}"`
  );
  content = content.replace(
    /productAlias: "[^"]+"/,
    `productAlias: "${brand.productAlias}"`
  );
  content = content.replace(
    /legalEmail: "[^"]+"/,
    `legalEmail: "legal@${brand.domain}"`
  );
  content = content.replace(
    /privacyEmail: "[^"]+"/,
    `privacyEmail: "privacy@${brand.domain}"`
  );
  fs.writeFileSync(file, content);
}

function patchDisclaimerMessages(root, brand) {
  for (const locale of ["fr.json", "en.json"]) {
    const file = path.join(root, "messages", locale);
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data.legal?.disclaimer) {
      data.legal.disclaimer.text = locale === "fr.json" ? brand.disclaimerFr : brand.disclaimerEn;
    }
    // Update register club type labels
    if (data.auth?.registration && typeof data.auth.registration === "object") {
      const reg = data.auth.registration;
      reg[brand.msgKeyPrimary] =
        locale === "fr.json"
          ? `Club ${brand.primaryLabelFr}`
          : `${brand.primaryLabel} Club`;
      reg[brand.msgKeyYouth] =
        locale === "fr.json"
          ? `Club ${brand.youthLabelFr}`
          : `${brand.youthLabel} Club`;
      reg[brand.msgKeyYouthDiscount] =
        locale === "fr.json"
          ? `Réduction de {percent} % sur l'abonnement pour les clubs ${brand.youthLabelFr}`
          : `{percent}% subscription discount for ${brand.youthLabel} clubs`;
      delete reg.rotary;
      delete reg.rotaract;
      delete reg.rotaractDiscount;
    }
    // Attendance guest labels
    if (data.attendance) {
      data.attendance[brand.msgKeyPrimaryGuest] =
        locale === "fr.json" ? `Invités ${brand.primaryLabelFr.toLowerCase()}` : `${brand.primaryLabel} guests`;
      data.attendance[brand.msgKeyYouthGuest] =
        locale === "fr.json" ? `Invités ${brand.youthLabelFr.toLowerCase()}` : `${brand.youthLabel} guests`;
      data.attendance[brand.msgKeyExternalGuest] =
        locale === "fr.json" ? "Invités externes" : "External guests";
      delete data.attendance.rotaryGuest;
      delete data.attendance.rotaractGuest;
      delete data.attendance.nonRotaryGuest;
    }
    // Attendance category enum labels (member portal)
    if (data.myAccount?.attendanceCategory) {
      const cats = data.myAccount.attendanceCategory;
      cats[brand.guestPrimary] =
        locale === "fr.json" ? `Invité ${brand.primaryLabelFr}` : `${brand.primaryLabel} guest`;
      cats[brand.guestYouth] =
        locale === "fr.json" ? `Invité ${brand.youthLabelFr}` : `${brand.youthLabel} guest`;
      cats[brand.guestExternal] =
        locale === "fr.json" ? "Invité externe" : "External guest";
      delete cats.ROTARY_GUEST;
      delete cats.ROTARACT_GUEST;
      delete cats.NON_ROTARY_GUEST;
    }
    // Demo panel rotaract discount section
    if (data.demo) {
      const key = brand.msgKeyYouthDiscount;
      data.demo[`${key}Title`] =
        locale === "fr.json"
          ? `Avantage clubs ${brand.youthLabelFr}`
          : `${brand.youthLabel} club benefit`;
      data.demo[`${key}Hint`] =
        locale === "fr.json"
          ? `Réduction automatique de {percent} % sur l'abonnement pour tous les clubs ${brand.youthLabelFr}.`
          : `Automatic {percent}% subscription discount for all ${brand.youthLabel} clubs.`;
      delete data.demo.rotaractDiscountTitle;
      delete data.demo.rotaractDiscountHint;
    }
    // Privacy/terms product mentions - replace remaining Rotary Minutes in intro
    const replaceDeep = (obj) => {
      if (typeof obj === "string") {
        return obj
          .replace(/Rotary Minutes/g, brand.productName)
          .replace(/Club Minutes/g, brand.productAlias)
          .replace(/rotaryminutes\.app/g, brand.domain)
          .replace(/Rotary/g, brand.primaryLabel)
          .replace(/Rotaract/g, brand.youthLabel);
      }
      if (Array.isArray(obj)) return obj.map(replaceDeep);
      if (obj && typeof obj === "object") {
        const next = {};
        for (const [k, v] of Object.entries(obj)) next[k] = replaceDeep(v);
        return next;
      }
      return obj;
    };
    const patched = replaceDeep(data);
    fs.writeFileSync(file, JSON.stringify(patched, null, 2) + "\n");
  }
}

function patchRegisterForm(root, brand) {
  const file = path.join(root, "src/components/auth/register-form.tsx");
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, "utf8");
  c = c.replace(
    /type ClubTypeChoice = "[^"]+" \| "[^"]+";/,
    `type ClubTypeChoice = "${brand.clubTypePrimary}" | "${brand.clubTypeYouth}";`
  );
  c = c.replace(
    /useState<ClubTypeChoice>\("[^"]+"\)/,
    `useState<ClubTypeChoice>("${brand.clubTypePrimary}")`
  );
  c = c.replaceAll(`"${brand.clubTypePrimary}"`, `"__PRIMARY__"`);
  c = c.replaceAll("ROTARY", brand.clubTypePrimary);
  c = c.replaceAll("__PRIMARY__", brand.clubTypePrimary);
  c = c.replaceAll("ROTARACT", brand.clubTypeYouth);
  c = c.replace(
    /import \{ ROTARACT_DISCOUNT_PERCENT \}/,
    "import { YOUTH_CLUB_DISCOUNT_PERCENT }"
  );
  c = c.replaceAll("ROTARACT_DISCOUNT_PERCENT", "YOUTH_CLUB_DISCOUNT_PERCENT");
  c = c.replaceAll(`setClubType("${brand.clubTypeYouth}")`, `setClubType("${brand.clubTypeYouth}")`);
  fs.writeFileSync(file, c);
}

function postFixFiles(root, brand) {
  const fixes = [
    [
      path.join(root, "src/lib/permissions.ts"),
      (c) => c.replace(/from "\.\/rotary"/g, 'from "./organization"'),
    ],
    [
      path.join(root, "src/lib/offline-check-in-sync.ts"),
      (c) =>
        c.replace(
          /OFFLINE_CHECKIN_STORAGE_KEY = "[^"]+"/,
          `OFFLINE_CHECKIN_STORAGE_KEY = "${brand.packageName}-offline-checkins"`
        ),
    ],
    [
      path.join(root, "prisma/seed.ts"),
      (c) =>
        c
          .replace(/rotary-lyon-assiduity/g, `${brand.demoClubSlugPrefix}-lyon-assiduity`)
          .replace(/slug: "rotary-/g, `slug: "${brand.demoClubSlugPrefix}-`),
    ],
    [
      path.join(root, "src/components/settings/integrations-panel.tsx"),
      (c) =>
        c.replace(
          /webhooks\/rotary/g,
          `webhooks/${brand.packageName}`
        ),
    ],
    [
      path.join(root, "src/lib/registration.ts"),
      (c) =>
        c
          .replace(/const rotaract =/g, "const youthDiscount =")
          .replace(/rotaract,/g, "youthDiscount,")
          .replace(/return youthDiscount > 0 \? rotaract/g, "return youthDiscount > 0 ? youthDiscount")
          .replace(/return rotaract/g, "return youthDiscount"),
    ],
    [
      path.join(root, "src/components/meetings/mobile-attendance-sheet.tsx"),
      (c) =>
        c
          .replace(/t\("rotaryGuest"\)/g, `t("${brand.msgKeyPrimaryGuest}")`)
          .replace(/t\("rotaractGuest"\)/g, `t("${brand.msgKeyYouthGuest}")`)
          .replace(/t\("nonRotaryGuest"\)/g, `t("${brand.msgKeyExternalGuest}")`),
    ],
  ];

  for (const [file, transform] of fixes) {
    if (!fs.existsSync(file)) continue;
    const original = fs.readFileSync(file, "utf8");
    const updated = transform(original);
    if (updated !== original) fs.writeFileSync(file, updated);
  }
}

function patchOrganizationFile(root, brand) {
  const file = path.join(root, "src/lib/organization.ts");
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, "utf8");
  c = c.replace(
    /\/\*\* Rotary mandate: July 1 → June 30 \*\//,
    `/** ${brand.organizationShort} mandate: July 1 → June 30 */`
  );
  c = c.replace(
    /\/\*\* Rotary International attendance expectation for active members\. \*\//,
    `/** ${brand.organization} attendance expectation for active members. */`
  );
  fs.writeFileSync(file, c);
}

function rebrand(targetDir, brandKey) {
  const brand = BRANDS[brandKey];
  if (!brand) {
    console.error(`Unknown brand: ${brandKey}`);
    process.exit(1);
  }
  const root = path.resolve(targetDir);
  if (!fs.existsSync(root)) {
    console.error(`Directory not found: ${root}`);
    process.exit(1);
  }

  console.log(`\n=== Rebranding ${root} → ${brand.productName} ===`);

  renameIfExists(root, "src/lib/rotary.ts", "src/lib/organization.ts");
  renameIfExists(
    root,
    "src/components/marketing/rotary-disclaimer.tsx",
    "src/components/marketing/organization-disclaimer.tsx"
  );

  const replacements = buildReplacements(brand);
  const files = walk(root);
  let changed = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const updated = applyReplacements(original, replacements);
    if (updated !== original) {
      fs.writeFileSync(file, updated);
      changed++;
    }
  }

  patchCompanyLegal(root, brand);
  patchDisclaimerMessages(root, brand);
  patchRegisterForm(root, brand);
  patchOrganizationFile(root, brand);
  postFixFiles(root, brand);

  // Write README header
  const readme = path.join(root, "README.md");
  if (fs.existsSync(readme)) {
    let r = fs.readFileSync(readme, "utf8");
    r = `# ${brand.productName}\n\nPlateforme SaaS de gestion de club pour **${brand.organization}** : membres, réunions, cotisations, procès-verbaux authentifiés et communications.\n\n> Copie adaptée depuis Rotary Minutes. Produit de Visa Guard USA, LLC.\n\n` + r.replace(/^#.*\n+/m, "");
    fs.writeFileSync(readme, r);
  }

  console.log(`  ${changed} files updated`);
  console.log(`  Done: ${brand.productName} (${brand.domain})\n`);
}

const targetDir = process.argv[2];
const brandKey = process.argv[3];
if (!targetDir || !brandKey) {
  console.log("Usage: node scripts/rebrand-organization.mjs <targetDir> <lions|jci|innerwheel>");
  process.exit(1);
}
rebrand(targetDir, brandKey);