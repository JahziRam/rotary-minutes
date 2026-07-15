#!/usr/bin/env python3
"""Generate French configuration guide PDF for Minute AI assistant."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from fpdf import FPDF
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2", "-q"])
    from fpdf import FPDF


class GuidePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(88, 28, 135)
        self.cell(0, 8, "Rotary Minutes — Guide configuration Assistant IA PV", align="L")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}} — Juillet 2026", align="C")

    def section_title(self, title: str):
        self.ln(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 30, 30)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")

    def subsection(self, title: str):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(55, 55, 55)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")

    def body(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, f"  - {text}")

    def code_block(self, text: str):
        self.set_fill_color(245, 245, 250)
        self.set_font("Courier", "", 9)
        self.set_text_color(30, 30, 30)
        for line in text.splitlines():
            self.cell(0, 5.5, "  " + line, new_x="LMARGIN", new_y="NEXT", fill=True)
        self.ln(2)


def build_pdf(output_path: Path) -> None:
    pdf = GuidePDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(88, 28, 135)
    pdf.cell(0, 12, "Assistant IA — Rédaction des PV", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        0,
        6,
        "Guide pas à pas pour activer et utiliser la reformulation IA des procès-verbaux "
        "dans Rotary Minutes (Club Minutes).",
    )
    pdf.ln(4)

    pdf.section_title("1. Vue d'ensemble")
    pdf.body(
        "L'assistant IA transforme des notes brutes saisies pendant une réunion en phrases "
        "structurées de PV : description, décisions, actions, responsable et échéance. "
        "Trois niveaux de configuration doivent être satisfaits pour qu'un club puisse l'utiliser."
    )
    pdf.bullet("Niveau serveur : clé API xAI (XAI_API_KEY)")
    pdf.bullet("Niveau plateforme : activation globale + quota (super admin)")
    pdf.bullet("Niveau club : module MINUTE_AI ou toggle super admin")

    pdf.section_title("2. Prérequis techniques")
    pdf.subsection("2.1 Obtenir une clé API xAI")
    pdf.body(
        "1. Créez un compte sur https://console.x.ai\n"
        "2. Générez une clé API (format xai-...)\n"
        "3. Conservez-la en lieu sûr — elle ne doit jamais être exposée côté navigateur"
    )

    pdf.subsection("2.2 Variables d'environnement")
    pdf.body("Ajoutez ces variables sur votre hébergeur (Render, VPS, etc.) ou dans .env en local :")
    pdf.code_block(
        "XAI_API_KEY=xai-votre-cle-api\n"
        "# Optionnel — modèle par défaut si non défini dans Admin :\n"
        "XAI_MINUTE_AI_MODEL=grok-3-mini"
    )
    pdf.body("Redémarrez l'application après modification des variables.")

    pdf.subsection("2.3 Migration base de données")
    pdf.body("Sur l'environnement de production, exécutez :")
    pdf.code_block("npx prisma migrate deploy\nnpx prisma generate")
    pdf.body(
        "Migration concernée : 20260715170000_minute_ai_assist\n"
        "(enum AddonKey.MINUTE_AI + colonne ClubFeatures.minuteAiAssistEnabled)"
    )

    pdf.section_title("3. Configuration plateforme (super admin)")
    pdf.body("Connectez-vous en super admin, puis ouvrez : Admin → Paramètres")
    pdf.bullet("Vérifiez le badge « Clé API détectée » (sinon, XAI_API_KEY manquante)")
    pdf.bullet("Cochez « Activer l'assistant IA sur la plateforme »")
    pdf.bullet("Quota mensuel par club : 50 par défaut (1 à 500)")
    pdf.bullet("Modèle xAI : grok-3-mini par défaut (modifiable)")
    pdf.bullet("Cliquez Enregistrer")
    pdf.body(
        "Sans activation plateforme, les clubs voient le message "
        "« Assistant IA désactivé par la plateforme »."
    )

    pdf.section_title("4. Activer pour un club")
    pdf.subsection("Option A — Achat module complémentaire (club)")
    pdf.body(
        "Le président ou admin club ouvre : Paramètres → Abonnement → Modules complémentaires\n"
        "Module : « Assistant IA — rédaction PV » (MINUTE_AI, 12 EUR/mois)\n"
        "Cliquez Activer. La fonctionnalité minuteAiAssistEnabled est alors activée pour le club."
    )

    pdf.subsection("Option B — Attribution manuelle (super admin)")
    pdf.body("Admin → Clubs → sélectionner le club → onglet Fonctionnalités")
    pdf.bullet("Activer le toggle « Assistant IA rédaction PV »")
    pdf.bullet("Enregistrer")
    pdf.body(
        "Le super admin peut aussi attribuer le module depuis Admin → Abonnements → Addons, "
        "sans facturation Stripe."
    )

    pdf.section_title("5. Utilisation par le secrétaire")
    pdf.body("1. Ouvrir un PV : Réunions → PV → Modifier")
    pdf.body("2. Pour chaque point d'ordre du jour, saisir des notes brutes dans le champ « Notes / brouillon »")
    pdf.body("3. Cliquer « Reformuler avec l'IA »")
    pdf.body("4. Les champs description, décisions, actions, responsable et échéance sont remplis automatiquement")
    pdf.body("5. Relire et corriger avant validation du PV")
    pdf.body(
        "Permissions requises : minutes.view pour voir le statut, minutes.edit pour reformuler. "
        "Le PV verrouillé (finalisé ou archivé) bloque la reformulation."
    )

    pdf.section_title("6. Quotas et suivi")
    pdf.bullet("Chaque reformulation consomme 1 unité du quota mensuel du club")
    pdf.bullet("Compteur affiché dans l'éditeur : reformulations restantes ce mois")
    pdf.bullet("Le super admin n'est pas limité par le quota")
    pdf.bullet("Chaque utilisation est journalisée (audit MINUTE_AI_POLISH)")

    pdf.section_title("7. Dépannage")
    pdf.subsection("Message affiché → Cause → Solution")
    pdf.bullet("Service IA non configuré → XAI_API_KEY absente → Ajouter la variable et redémarrer")
    pdf.bullet("Assistant IA désactivé par la plateforme → globallyEnabled = false → Admin → Paramètres")
    pdf.bullet("Module IA non activé pour ce club → minuteAiAssistEnabled = false → Module ou toggle club")
    pdf.bullet("Quota mensuel atteint → 50 reformulations utilisées → Attendre le mois suivant ou augmenter le quota")
    pdf.bullet("Service IA indisponible → Erreur réseau xAI → Réessayer plus tard")
    pdf.bullet("Saisissez des notes avant de reformuler → Champ notes vide → Remplir le brouillon")

    pdf.section_title("8. Checklist de mise en service")
    pdf.bullet("[ ] Clé XAI_API_KEY configurée sur le serveur")
    pdf.bullet("[ ] Migration Prisma déployée")
    pdf.bullet("[ ] Assistant activé dans Admin → Paramètres")
    pdf.bullet("[ ] Quota mensuel défini")
    pdf.bullet("[ ] Module MINUTE_AI activé pour le club test OU toggle super admin")
    pdf.bullet("[ ] Test : reformuler un point ODJ sur un PV brouillon")
    pdf.bullet("[ ] Vérifier l'audit MINUTE_AI_POLISH dans le journal d'activité")

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        "Document généré pour Rotary Minutes. Pour toute évolution (modèle, tarif module, quota), "
        "consultez CHANGELOG.md et src/lib/minute-ai-config.ts.",
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output_path))


if __name__ == "__main__":
    desktop = Path.home() / "Desktop"
    out = desktop / "Guide-Assistant-IA-PV-Rotary-Minutes.pdf"
    build_pdf(out)
    print(f"PDF créé : {out}")