from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import cm

def create_mindfulness_ebook():
    filename = "ebook-mindfulness-preview.pdf"
    doc = SimpleDocTemplate(filename, pagesize=A4)
    
    # Create styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#4F46E5',
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor='#64748B',
        spaceAfter=20,
        alignment=1
    )
    
    content = []
    
    # Title page
    content.append(Paragraph("Mindfulness e Bem-Estar Mental", title_style))
    content.append(Paragraph("Um guia completo para o equilíbrio emocional", subtitle_style))
    content.append(Spacer(1, 2*cm))
    
    # Introduction
    content.append(Paragraph("Introdução", styles['Heading2']))
    content.append(Spacer(1, 0.5*cm))
    
    intro_text = """
    Bem-vindo ao seu guia de Mindfulness e Bem-Estar Mental. Este ebook foi desenvolvido 
    especificamente para ajudá-lo a desenvolver técnicas de mindfulness que podem transformar 
    sua relação com o estresse, a ansiedade e as emoções do dia a dia.
    
    Neste preview, você terá uma amostra do conteúdo completo que inclui:
    
    • Fundamentos do Mindfulness
    • Técnicas de respiração consciente
    • Exercícios práticos para o cotidiano
    • Estratégias para lidar com pensamentos ansiosos
    • Meditações guiadas
    """
    
    content.append(Paragraph(intro_text, styles['Normal']))
    content.append(Spacer(1, 1*cm))
    
    # Chapter 1
    content.append(Paragraph("Capítulo 1: O Que é Mindfulness?", styles['Heading2']))
    content.append(Spacer(1, 0.5*cm))
    
    chapter1_text = """
    Mindfulness, ou atenção plena, é a prática de prestar atenção ao momento presente 
    de forma intencional e sem julgamento. É uma habilidade que pode ser desenvolvida 
    através da prática regular e que oferece benefícios significativos para a saúde mental.
    
    Pesquisas científicas mostram que a prática regular de mindfulness pode:
    
    • Reduzir níveis de estresse e ansiedade
    • Melhorar a qualidade do sono
    • Aumentar a capacidade de concentração
    • Fortalecer o sistema imunológico
    • Promover maior bem-estar emocional
    
    Este é apenas o início de sua jornada. No ebook completo, você encontrará 
    exercícios práticos e técnicas detalhadas para integrar o mindfulness em sua vida diária.
    """
    
    content.append(Paragraph(chapter1_text, styles['Normal']))
    content.append(Spacer(1, 1*cm))
    
    # Call to action
    content.append(Paragraph("Continue sua jornada...", styles['Heading3']))
    content.append(Paragraph(
        "Este é apenas uma pequena amostra do conteúdo completo. "
        "Adquira o ebook completo e transforme sua relação com o bem-estar mental!", 
        styles['Normal']
    ))
    
    doc.build(content)
    print(f"PDF criado: {filename}")

if __name__ == "__main__":
    create_mindfulness_ebook()
