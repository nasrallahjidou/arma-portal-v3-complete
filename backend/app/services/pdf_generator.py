import io
import os
import requests
from datetime import datetime
from typing import List, Dict, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether, PageBreak, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Couleurs ARMA 
ARMA_DARK   = colors.HexColor("#0a0f1e")
ARMA_BLUE   = colors.HexColor("#2563eb")
ARMA_LIGHT  = colors.HexColor("#60a5fa")
ARMA_RED    = colors.HexColor("#dc2626")
ARMA_GRAY   = colors.HexColor("#64748b")
ARMA_BORDER = colors.HexColor("#e2e8f0")
WHITE       = colors.white
LIGHT_BG    = colors.HexColor("#f8fafc")
LIGHT_BLUE  = colors.HexColor("#eff6ff")


def fetch_image(url: str, size=(8*cm, 6*cm)):
    """Télécharge une image depuis URL ou chemin local et retourne un objet Image ReportLab."""
    if not url:
        return None
    
    try:
        # Handle local file paths (e.g., /uploads/xxx.jpg)
        if url.startswith('/uploads/') or url.startswith('./') or os.path.exists(url):
            # Convert to absolute path
            if url.startswith('/uploads/'):
                # Try multiple possible base paths
                possible_paths = [
                    os.path.join(os.path.dirname(__file__), '..', '..', url.lstrip('/')),
                    os.path.join(os.path.dirname(__file__), '..', '..', 'uploads', os.path.basename(url)),
                    os.path.abspath(url.lstrip('/')),
                ]
                file_path = None
                for p in possible_paths:
                    if os.path.exists(p):
                        file_path = p
                        break
                
                if not file_path:
                    print(f"Image not found: {url}")
                    return None
            else:
                file_path = url
            
            img = Image(file_path, width=size[0], height=size[1])
            img.hAlign = 'CENTER'
            return img
        
        # Handle HTTP URLs (Google Drive, etc.)
        if "http" in str(url):
            # Handle Google Drive links
            file_id = None
            if "/d/" in url:
                file_id = url.split("/d/")[1].split("/")[0].split("?")[0]
            elif "id=" in url:
                file_id = url.split("id=")[1].split("&")[0]

            if file_id:
                dl_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                resp = requests.get(dl_url, timeout=15)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    img_io = io.BytesIO(resp.content)
                    img = Image(img_io, width=size[0], height=size[1])
                    img.hAlign = 'CENTER'
                    return img
    except Exception as e:
        print(f"Error loading image {url}: {e}")
        pass
    return None

def make_header_footer(canvas, doc, company_name="ARMA Environnement"):
    """En-tête et pied de page sur chaque page."""
    canvas.saveState()
    w, h = A4

    # Bande supérieure bleu foncé
    canvas.setFillColor(ARMA_DARK)
    canvas.rect(0, h - 2.8*cm, w, 2.8*cm, fill=1, stroke=0)

    # Logo texte ARMA 
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawString(1.2*cm, h - 1.8*cm, "ARMA ")
    canvas.setFont("Helvetica", 10)
    canvas.setFillColor(ARMA_LIGHT)
    canvas.drawString(1.2*cm, h - 2.3*cm, "Environnement")

    # Ligne rouge décorative
    canvas.setFillColor(ARMA_RED)
    canvas.rect(w - 1.2*cm, h - 2.8*cm, 0.4*cm, 2.8*cm, fill=1, stroke=0)

    # Numéro de page
    canvas.setFillColor(ARMA_GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 1.5*cm, 0.8*cm, f"Page {doc.page}")
    canvas.drawString(1.2*cm, 0.8*cm, f"{company_name} — Rapport Confidentiel")

    # Ligne de séparation footer
    canvas.setStrokeColor(ARMA_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(1.2*cm, 1.4*cm, w - 1.2*cm, 1.4*cm)

    canvas.restoreState()


def generate_station_pdf(station_data: dict, rapports: List[Dict], include_photos: bool = True) -> bytes:
    """
    Génère un PDF professionnel pour une station.

    station_data = {
        'code': 'AK1233',
        'ville': 'Casablanca',
        'name': 'Station Name',
        'client_name': 'Client X',
        'periode': 'Mai 2026',
        'generated_by': 'admin@ARMA.ma',
        'generated_at': '08/05/2026 14:30',
        'total_interventions': 15,
        'language': 'fr'
    }
    rapports = list of dicts with report data
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=3.5*cm,
        bottomMargin=2*cm,
        title=f"Rapport ARMA — {station_data.get('code', '')}",
        author="ARMA Environnement"
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Styles personnalisés
    title_style = ParagraphStyle("ARMA Title",
        fontName="Helvetica-Bold", fontSize=20,
        textColor=ARMA_DARK, alignment=TA_CENTER, spaceAfter=6)

    subtitle_style = ParagraphStyle("ARMA Sub",
        fontName="Helvetica", fontSize=11,
        textColor=ARMA_GRAY, alignment=TA_CENTER, spaceAfter=20)

    section_style = ParagraphStyle("ARMA Section",
        fontName="Helvetica-Bold", fontSize=13,
        textColor=WHITE, alignment=TA_LEFT,
        spaceAfter=8, spaceBefore=16,
        backColor=ARMA_BLUE, leftIndent=-8,
        borderPadding=(6, 8, 6, 8))

    zone_style = ParagraphStyle("ARMA Zone",
        fontName="Helvetica-Bold", fontSize=11,
        textColor=ARMA_BLUE, alignment=TA_LEFT,
        spaceAfter=4, spaceBefore=12)

    body_style = ParagraphStyle("ARMA Body",
        fontName="Helvetica", fontSize=10,
        textColor=ARMA_DARK, alignment=TA_LEFT,
        spaceAfter=4, leading=14)

    obs_style = ParagraphStyle("ARMA Obs",
        fontName="Helvetica-Oblique", fontSize=10,
        textColor=colors.HexColor("#374151"), alignment=TA_LEFT,
        spaceAfter=4, leading=14,
        backColor=colors.HexColor("#fefce8"),
        borderColor=colors.HexColor("#fbbf24"),
        borderWidth=1, borderPadding=(6, 8, 6, 8),
        leftIndent=4)

    label_style = ParagraphStyle("ARMA Label",
        fontName="Helvetica-Bold", fontSize=9,
        textColor=ARMA_GRAY, alignment=TA_CENTER, spaceAfter=2)

    # ════════════════════════════════════════
    # PAGE DE GARDE
    # ════════════════════════════════════════
    story.append(Spacer(1, 1.5*cm))

    # Titre principal
    story.append(Paragraph("RAPPORT D'INTERVENTION", title_style))
    story.append(Paragraph("Nettoyage & Maintenance des Stations", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ARMA_BLUE, spaceAfter=20))

    # Tableau d'infos station
    info_data = [
        ["📍 Station / Code",  station_data.get('code', '—'),
         "🏙️ Ville",           station_data.get('ville', '—')],
        ["👤 Client",          station_data.get('client_name', '—'),
         "📅 Période",         station_data.get('periode', '—')],
        ["📋 Interventions",   str(station_data.get('total_interventions', 0)),
         "🕐 Généré le",       station_data.get('generated_at', datetime.now().strftime("%d/%m/%Y %H:%M"))],
        ["✍️ Généré par",      station_data.get('generated_by', '—'),
         "🔒 Statut",          "CONFIDENTIEL"],
    ]

    info_table = Table(info_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 5.5*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BACKGROUND', (0,0), (0,-1), LIGHT_BLUE),
        ('BACKGROUND', (2,0), (2,-1), LIGHT_BLUE),
        ('FONTNAME',   (0,0), (-1,-1), 'Helvetica'),
        ('FONTNAME',   (0,0), (0,-1),  'Helvetica-Bold'),
        ('FONTNAME',   (2,0), (2,-1),  'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('TEXTCOLOR',  (0,0), (0,-1),  ARMA_BLUE),
        ('TEXTCOLOR',  (2,0), (2,-1),  ARMA_BLUE),
        ('ALIGN',      (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('GRID',       (0,0), (-1,-1), 0.5, ARMA_BORDER),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [LIGHT_BG, WHITE]),
        ('TOPPADDING',  (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5*cm))

    # Résumé statistique
    zones = list(set(r.get('Zone de nettoyage', '') for r in rapports if r.get('Zone de nettoyage')))
    agents = list(set(r.get('Nom de responsable/Agent', '') for r in rapports if r.get('Nom de responsable/Agent')))

    summary_data = [
        ["Zones nettoyées", "Agents intervenus", "Rapports photo", "Statut global"],
        [str(len(zones)), str(len(agents)), str(len(rapports)), "✅ Complété"],
    ]
    sum_table = Table(summary_data, colWidths=[4.5*cm]*4)
    sum_table.setStyle(TableStyle ([
        ('BACKGROUND',  (0,0), (-1,0), ARMA_BLUE),
        ('BACKGROUND',  (0,1), (-1,1), LIGHT_BG),
        ('TEXTCOLOR',   (0,0), (-1,0), WHITE),
        ('TEXTCOLOR',   (0,1), (-1,1), ARMA_DARK),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTNAME',    (0,1), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0), (-1,-1), 10),
        ('ALIGN',       (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
        ('GRID',        (0,0), (-1,-1), 0.5, ARMA_BORDER),
        ('TOPPADDING',  (0,0), (-1,-1), 10),
        ('BOTTOMPADDING',(0,0), (-1,-1), 10),
            ]))
    story.append(sum_table)

    # ════════════════════════════════════════
    # SECTIONS PAR ZONE DE NETTOYAGE
    # ════════════════════════════════════════
    if rapports:
        # Grouper par zone
        from collections import defaultdict
        grouped = defaultdict(list)
        for r in rapports:
            zone = r.get('Zone de nettoyage', 'Non spécifié')
            grouped[zone].append(r)

        for zone_name, zone_reports in grouped.items():
            story.append(PageBreak())

            # En-tête de zone
            story.append(Paragraph(f"🧹  Zone : {zone_name}", section_style))
            story.append(Spacer(1, 0.3*cm))

            for i, report in enumerate(zone_reports):
                elements = []

                # Infos ligne
                date_val = str(report.get("Date de l'intervention", '—'))
                agent_val = str(report.get('Nom de responsable/Agent', '—'))

                meta_data = [
                    [f"Intervention N°{i+1}", f"Date : {date_val}", f"Agent : {agent_val}"]
                ]
                meta_table = Table(meta_data, colWidths=[4*cm, 5*cm, 9*cm])
                meta_table.setStyle(TableStyle([
                    ('BACKGROUND',   (0,0), (-1,-1), LIGHT_BLUE),
                    ('TEXTCOLOR',    (0,0), (0,-1),  ARMA_BLUE),
                    ('FONTNAME',     (0,0), (0,-1),  'Helvetica-Bold'),
                    ('FONTNAME',     (1,0), (-1,-1), 'Helvetica'),
                    ('FONTSIZE',     (0,0), (-1,-1), 9),
                    ('ALIGN',        (0,0), (-1,-1), 'LEFT'),
                    ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
                    ('GRID',         (0,0), (-1,-1), 0.5, ARMA_BORDER),
                    ('TOPPADDING',   (0,0), (-1,-1), 7),
                    ('BOTTOMPADDING',(0,0), (-1,-1), 7),
                    ('LEFTPADDING',  (0,0), (-1,-1), 10),
                ]))
                elements.append(meta_table)
                elements.append(Spacer(1, 0.3*cm))

                # Photos AVANT / APRÈS
                if include_photos:
                    avant_url = str(report.get('Photo AVANT', ''))
                    apres_url = str(report.get('Photo APRES', ''))

                    img_avant = fetch_image(avant_url, size=(8*cm, 6*cm)) if avant_url else None
                    img_apres = fetch_image(apres_url, size=(8*cm, 6*cm)) if apres_url else None

                    if img_avant or img_apres:
                        label_avant = Paragraph("📸 AVANT", label_style)
                        label_apres = Paragraph("📸 APRÈS", label_style)

                        ph_avant = img_avant if img_avant else Paragraph(
                            '<font color="#94a3b8" size="9">Image non disponible</font>', body_style)
                        ph_apres = img_apres if img_apres else Paragraph(
                            '<font color="#94a3b8" size="9">Image non disponible</font>', body_style)

                        photos_data = [
                            [label_avant,            label_apres],
                            [ph_avant,               ph_apres],
                        ]
                        photos_table = Table(photos_data, colWidths=[9*cm, 9*cm])
                        photos_table.setStyle(TableStyle([
                            ('ALIGN',       (0,0), (-1,-1), 'CENTER'),
                            ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
                            ('BACKGROUND',  (0,0), (0,0),   colors.HexColor("#fef2f2")),
                            ('BACKGROUND',  (1,0), (1,0),   colors.HexColor("#f0fdf4")),
                            ('TEXTCOLOR',   (0,0), (0,0),   ARMA_RED),
                            ('TEXTCOLOR',   (1,0), (1,0),   colors.HexColor("#16a34a")),
                            ('FONTNAME',    (0,0), (-1,0),  'Helvetica-Bold'),
                            ('FONTSIZE',    (0,0), (-1,0),  9),
                            ('GRID',        (0,0), (-1,-1), 0.5, ARMA_BORDER),
                            ('TOPPADDING',  (0,0), (-1,-1), 6),
                            ('BOTTOMPADDING',(0,0), (-1,-1), 6),
                        ]))
                        elements.append(photos_table)
                        elements.append(Spacer(1, 0.3*cm))

                # Observations
                obs_val = str(report.get('Observations', '')).strip()
                if obs_val and obs_val.lower() not in ['nan', 'none', '', 'null']:
                    elements.append(Paragraph(f"💬 Observations : {obs_val}", obs_style))

                elements.append(Spacer(1, 0.4*cm))
                elements.append(HRFlowable(width="100%", thickness=0.5, color=ARMA_BORDER))
                elements.append(Spacer(1, 0.2*cm))

                # Keep together first elements, then add rest
                if len(elements) > 4:
                    story.append(KeepTogether(elements[:4]))
                    for el in elements[4:]:
                        story.append(el)
                else:
                    for el in elements:
                        story.append(el)

    # ════════════════════════════════════════
    # PAGE DE CONCLUSION
    # ════════════════════════════════════════
    story.append(PageBreak())
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("✅ Rapport Complété", title_style))
    story.append(Spacer(1, 0.5*cm))

    concl_data = [
        ["Ce rapport a été généré automatiquement par le système ARMA Digital Portal."],
        [f"Station : {station_data.get('code','—')} — {station_data.get('ville','—')}"],
        [f"Période couverte : {station_data.get('periode','—')}"],
        [f"Document généré le : {station_data.get('generated_at', datetime.now().strftime('%d/%m/%Y à %H:%M'))}"],
        ["ARMA Environnement — Tous droits réservés"],
    ]
    c_table = Table(concl_data, colWidths=[18*cm])
    c_table.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,-1), LIGHT_BG),
        ('BACKGROUND',   (0,0), (-1,0),  ARMA_BLUE),
        ('BACKGROUND',   (0,-1),(-1,-1), ARMA_DARK),
        ('TEXTCOLOR',    (0,0), (-1,0),  WHITE),
        ('TEXTCOLOR',    (0,1), (-1,-2), ARMA_DARK),
        ('TEXTCOLOR',    (0,-1),(-1,-1), ARMA_LIGHT),
        ('FONTNAME',     (0,0), (-1,0),  'Helvetica-Bold'),
        ('FONTNAME',     (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',     (0,0), (-1,-1), 10),
        ('ALIGN',        (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
        ('GRID',         (0,0), (-1,-1), 0.5, ARMA_BORDER),
        ('TOPPADDING',   (0,0), (-1,-1), 12),
        ('BOTTOMPADDING',(0,0), (-1,-1), 12),
    ]))
    story.append(c_table)

    # Build PDF
    company = station_data.get('company_name', 'ARMA Environnement')
    doc.build(story, 
              onFirstPage=lambda canvas, doc: make_header_footer(canvas, doc, company),
              onLaterPages=lambda canvas, doc: make_header_footer(canvas, doc, company))

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
