"""
Modulo de Estampado e Incrustado de Hojas de Firma en PDF.
Utiliza ReportLab para construir una Hoja Institucional de Firmas con QR y metadatos criptográficos,
y PyPDF para fusionarla al final del documento PDF original.
"""

import io
import qrcode
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_signature_sheet_pdf(
    doc_name: str,
    doc_hash: str,
    signed_by: str,
    signer_role: str,
    signed_at_str: str,
    rsa_sig_hex: str,
    mldsa_sig_hex: str,
    verify_url: str
) -> bytes:
    """
    Genera una página PDF en memoria con ReportLab con el formato oficial de Hoja de Firmas.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    # Generar imagen de código QR en memoria
    qr_img = qrcode.make(verify_url)
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=16,
        textColor=colors.HexColor('#1a3b5d'),
        alignment=1 # Centrado
    )
    
    subtitle_style = ParagraphStyle(
        'HeaderSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#495057'),
        alignment=1
    )
    
    section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=colors.HexColor('#00a8e8'),
        spaceBefore=10,
        spaceAfter=6
    )
    
    mono_style = ParagraphStyle(
        'MonoText',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=7,
        leading=8,
        textColor=colors.HexColor('#1a3b5d'),
        wordWrap='CJK'
    )
    
    cell_label = ParagraphStyle('CellLabel', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#343a40'))
    cell_val = ParagraphStyle('CellVal', fontName='Helvetica', fontSize=9, textColor=colors.HexColor('#212529'))
    
    story = []
    
    # Encabezado Institucional
    story.append(Paragraph("TECNOLÓGICO DE ESTUDIOS SUPERIORES DE JOCOTITLÁN", title_style))
    story.append(Paragraph("SISTEMA DE GESTIÓN DOCUMENTAL CON CRIPTOGRAFÍA HÍBRIDA POST-CUÁNTICA", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#00a8e8'), spaceAfter=12))
    
    story.append(Paragraph("HOJA DE FIRMA DIGITAL Y CERTIFICACIÓN DE INTEGRIDAD", title_style))
    story.append(Spacer(1, 10))
    
    # Tabla de datos del documento y firmante
    meta_data = [
        [Paragraph("Documento:", cell_label), Paragraph(doc_name, cell_val)],
        [Paragraph("Hash SHA-256:", cell_label), Paragraph(f"<code>{doc_hash}</code>", mono_style)],
        [Paragraph("Firmado por:", cell_label), Paragraph(signed_by, cell_val)],
        [Paragraph("Cargo / Rol:", cell_label), Paragraph(signer_role, cell_val)],
        [Paragraph("Fecha y Hora:", cell_label), Paragraph(signed_at_str, cell_val)]
    ]
    
    meta_table = Table(meta_data, colWidths=[1.2*inch, 5.8*inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8f9fa')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#dee2e6')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e9ecef')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))
    
    # Sección Criptográfica 1: RSA-2048
    story.append(Paragraph("1. FIRMA DIGITAL CLÁSICA (RSA-2048 / RSASSA-PSS SHA-256)", section_title))
    rsa_preview = f"{rsa_sig_hex[:80]}...\n...{rsa_sig_hex[-80:]}" if len(rsa_sig_hex) > 160 else rsa_sig_hex
    rsa_table = Table([
        [Paragraph("Firma RSA (HEX):", cell_label)],
        [Paragraph(rsa_sig_hex, mono_style)]
    ], colWidths=[7.0*inch])
    rsa_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e3f2fd')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#bbdefb')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(rsa_table)
    story.append(Spacer(1, 10))
    
    # Sección Criptográfica 2: ML-DSA-87
    story.append(Paragraph("2. FIRMA DIGITAL POST-CUÁNTICA (ML-DSA-87 / FIPS 204)", section_title))
    mldsa_table = Table([
        [Paragraph(f"Firma ML-DSA-87 (4,627 bytes / 9,254 hex digits - Categoría 5 NIST):", cell_label)],
        [Paragraph(f"{mldsa_sig_hex[:240]} ... [Resumen Criptográfico Cortado para Impresión] ... {mldsa_sig_hex[-240:]}", mono_style)]
    ], colWidths=[7.0*inch])
    mldsa_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f3e5f5')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e1bee7')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(mldsa_table)
    story.append(Spacer(1, 14))
    
    # Bloque de Verificación y Código QR
    qr_image_flowable = Image(qr_buffer, width=1.4*inch, height=1.4*inch)
    
    verify_info = [
        Paragraph("<b>CÓDIGO DE VERIFICACIÓN PÚBLICA</b>", ParagraphStyle('QRTitle', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#1a3b5d'))),
        Spacer(1, 4),
        Paragraph("Escanee el código QR con cualquier dispositivo móvil o visite la plataforma para verificar la validez de este documento en tiempo real.", ParagraphStyle('QRDesc', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#495057'))),
        Spacer(1, 4),
        Paragraph(f"<b>URL:</b> <font color='#00a8e8'><u>{verify_url}</u></font>", ParagraphStyle('QRUrl', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#00a8e8')))
    ]
    
    qr_table = Table([
        [qr_image_flowable, verify_info]
    ], colWidths=[1.6*inch, 5.4*inch])
    qr_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#00a8e8')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(qr_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def attach_signature_sheet_to_pdf(original_pdf_bytes: bytes, signature_sheet_pdf_bytes: bytes) -> bytes:
    """
    Toma los bytes del PDF original y de la Hoja de Firmas generada,
    y concatena la hoja al final del archivo usando PyPDF.
    Retorna los bytes del nuevo PDF firmado completo.
    """
    reader_orig = PdfReader(io.BytesIO(original_pdf_bytes))
    reader_sheet = PdfReader(io.BytesIO(signature_sheet_pdf_bytes))
    
    writer = PdfWriter()
    
    # Copiar todas las paginas originales
    for page in reader_orig.pages:
        writer.add_page(page)
        
    # Anexar la pagina de la Hoja de Firmas
    for page in reader_sheet.pages:
        writer.add_page(page)
        
    output_buffer = io.BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)
    return output_buffer.read()
