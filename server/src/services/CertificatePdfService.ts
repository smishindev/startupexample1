/**
 * CertificatePdfService - Generate professional certificate PDFs
 * Extends PdfGenerationService for common PDF utilities
 */

import { PdfGenerationService } from './PdfGenerationService';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface CertificateData {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  completionDate: Date;
  finalScore?: number;
  totalHoursSpent: number;
  verificationCode: string;
  template?: string; // 'classic' | 'modern' | 'elegant' | 'minimal'
}

// Template color schemes
interface TemplateColors {
  primary: string;
  secondary: string;
  accent: string;
  border: string;
  borderInner: string;
  text: string;
  textLight: string;
  badgeFill: string;
  badgeStroke: string;
  scorePassing: string;
}

const TEMPLATE_COLORS: Record<string, TemplateColors> = {
  classic: {
    primary: '#667eea',
    secondary: '#a5b4fc',
    accent: '#667eea',
    border: '#667eea',
    borderInner: '#a5b4fc',
    text: '#333333',
    textLight: '#666666',
    badgeFill: '#f8f9ff',
    badgeStroke: '#667eea',
    scorePassing: '#10b981'
  },
  modern: {
    primary: '#6366f1',
    secondary: '#818cf8',
    accent: '#4f46e5',
    border: '#6366f1',
    borderInner: '#c7d2fe',
    text: '#1e293b',
    textLight: '#64748b',
    badgeFill: '#eef2ff',
    badgeStroke: '#6366f1',
    scorePassing: '#059669'
  },
  elegant: {
    primary: '#92400e',
    secondary: '#d4a574',
    accent: '#78350f',
    border: '#92400e',
    borderInner: '#d4a574',
    text: '#1c1917',
    textLight: '#57534e',
    badgeFill: '#fef3c7',
    badgeStroke: '#92400e',
    scorePassing: '#166534'
  },
  minimal: {
    primary: '#18181b',
    secondary: '#71717a',
    accent: '#27272a',
    border: '#d4d4d8',
    borderInner: '#e4e4e7',
    text: '#18181b',
    textLight: '#71717a',
    badgeFill: '#f4f4f5',
    badgeStroke: '#52525b',
    scorePassing: '#166534'
  }
};

export class CertificatePdfService extends PdfGenerationService {
  constructor() {
    super('certificates'); // PDFs will be stored in uploads/certificates/
  }

  /**
   * Generate a professional certificate PDF
   */
  async generateCertificatePdf(certificateData: CertificateData): Promise<string> {
    const filename = `certificate_${certificateData.certificateNumber}.pdf`;
    const filepath = path.join(this.uploadsDir, filename);
    const template = certificateData.template || 'classic';
    const colors = TEMPLATE_COLORS[template] || TEMPLATE_COLORS.classic;

    return new Promise((resolve, reject) => {
      try {
        // Create landscape certificate for professional appearance
        const doc = this.createDocument({ 
          margin: 72, // 1 inch margins
          layout: 'landscape',
          size: 'LETTER'
        });

        // Pipe to file
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // ===== CERTIFICATE BORDER =====
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const borderMargin = 40;

        // Template-specific border styles
        if (template === 'elegant') {
          // Double ornate border for elegant
          doc
            .lineWidth(4)
            .strokeColor(colors.border)
            .rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2))
            .stroke();
          doc
            .lineWidth(1.5)
            .strokeColor(colors.borderInner)
            .rect(borderMargin + 8, borderMargin + 8, pageWidth - (borderMargin * 2) - 16, pageHeight - (borderMargin * 2) - 16)
            .stroke();
          // Corner accents for elegant
          const corners = [
            [borderMargin + 20, borderMargin + 20],
            [pageWidth - borderMargin - 20, borderMargin + 20],
            [borderMargin + 20, pageHeight - borderMargin - 20],
            [pageWidth - borderMargin - 20, pageHeight - borderMargin - 20]
          ];
          corners.forEach(([cx, cy]) => {
            doc.circle(cx, cy, 4).fillColor(colors.secondary).fill();
          });
        } else if (template === 'minimal') {
          // Single thin border for minimal
          doc
            .lineWidth(1)
            .strokeColor(colors.border)
            .rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2))
            .stroke();
        } else if (template === 'modern') {
          // Gradient-like effect with two colored bars
          doc
            .lineWidth(3)
            .strokeColor(colors.border)
            .rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2))
            .stroke();
          // Top accent bar
          doc
            .rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), 6)
            .fillColor(colors.primary)
            .fill();
          // Bottom accent bar
          doc
            .rect(borderMargin, pageHeight - borderMargin - 6, pageWidth - (borderMargin * 2), 6)
            .fillColor(colors.primary)
            .fill();
        } else {
          // Classic: outer + inner border
          doc
            .lineWidth(3)
            .strokeColor(colors.border)
            .rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2))
            .stroke();
          doc
            .lineWidth(1)
            .strokeColor(colors.borderInner)
            .rect(borderMargin + 10, borderMargin + 10, pageWidth - (borderMargin * 2) - 20, pageHeight - (borderMargin * 2) - 20)
            .stroke();
        }

        // ===== USE ABSOLUTE POSITIONING FOR ALL CONTENT =====
        // This prevents PDFKit cursor issues that cause multi-page certificates
        const margin = 72;
        const contentWidth = pageWidth - (margin * 2);
        const centerX = pageWidth / 2;

        // Calculate fixed Y positions for all elements (single page layout)
        const logoY = 65;
        const subtitleY = logoY + 25;
        const certTitleY = subtitleY + 35;
        const lineY = certTitleY + (template === 'minimal' ? 45 : 55);
        const certifiesY = lineY + 20;
        const studentNameY = certifiesY + 22;
        const completedY = studentNameY + 40;
        const courseTitleY = completedY + 22;
        const detailsStartY = courseTitleY + 40;
        const footerY = pageHeight - 145;
        const signatureY = pageHeight - 105;
        const badgeY = pageHeight - 105;

        // ===== HEADER SECTION =====
        // Company logo text
        doc
          .fontSize(20)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text('MISHIN LEARN', margin, logoY, { align: 'center', width: contentWidth });
        doc
          .fontSize(10)
          .fillColor(colors.textLight)
          .font('Helvetica')
          .text('Smart Learning Platform', margin, subtitleY, { align: 'center', width: contentWidth });

        // Certificate title - varies by template
        const certTitleText = template === 'elegant' 
          ? 'Certificate of Achievement' 
          : 'Certificate of Completion';
        const certTitleSize = template === 'minimal' ? 38 : 48;
        
        doc
          .fontSize(certTitleSize)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text(certTitleText, margin, certTitleY, { align: 'center', width: contentWidth });

        // Decorative line
        const lineLength = template === 'minimal' ? 60 : 100;
        doc
          .moveTo(centerX - lineLength, lineY)
          .lineTo(centerX + lineLength, lineY)
          .lineWidth(template === 'elegant' ? 3 : 2)
          .strokeColor(colors.primary)
          .stroke();

        // ===== MAIN CONTENT =====
        doc
          .fontSize(14)
          .fillColor(colors.text)
          .font('Helvetica')
          .text('This certifies that', margin, certifiesY, { align: 'center', width: contentWidth });

        // Student name (large and prominent)
        doc
          .fontSize(32)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text(certificateData.studentName, margin, studentNameY, { align: 'center', width: contentWidth });

        // Achievement text
        doc
          .fontSize(14)
          .fillColor(colors.text)
          .font('Helvetica')
          .text('has successfully completed the course', margin, completedY, { align: 'center', width: contentWidth });

        // Course title
        doc
          .fontSize(20)
          .fillColor(colors.primary)
          .font('Helvetica-Bold')
          .text(certificateData.courseTitle, margin, courseTitleY, { align: 'center', width: contentWidth });

        // ===== DETAILS SECTION =====
        const leftColumnX = 150;
        const rightColumnX = pageWidth - 250;

        // Left column - Date and Hours
        doc
          .fontSize(11)
          .fillColor(colors.textLight)
          .font('Helvetica')
          .text('Completion Date:', leftColumnX, detailsStartY);
        doc
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(
            certificateData.completionDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            leftColumnX,
            detailsStartY + 15
          );

        doc
          .font('Helvetica')
          .fillColor(colors.textLight)
          .text('Time Invested:', leftColumnX, detailsStartY + 40);
        doc
          .font('Helvetica-Bold')
          .fillColor('#000000');
        
        if (certificateData.totalHoursSpent > 0) {
          doc.text(
            `${Math.floor(certificateData.totalHoursSpent / 60)} hours ${certificateData.totalHoursSpent % 60} minutes`,
            leftColumnX,
            detailsStartY + 55
          );
        } else {
          doc.text('Not tracked', leftColumnX, detailsStartY + 55);
        }

        // Right column - Instructor and Score
        doc
          .font('Helvetica')
          .fillColor(colors.textLight)
          .text('Instructor:', rightColumnX, detailsStartY);
        doc
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(certificateData.instructorName, rightColumnX, detailsStartY + 15);

        // Final Score (always show, even if null)
        doc
          .font('Helvetica')
          .fillColor(colors.textLight)
          .text('Final Score:', rightColumnX, detailsStartY + 40);
        doc
          .font('Helvetica-Bold');
        
        if (certificateData.finalScore !== null && certificateData.finalScore !== undefined) {
          doc
            .fillColor(certificateData.finalScore >= 70 ? colors.scorePassing : colors.primary)
            .text(`${certificateData.finalScore.toFixed(1)}%`, rightColumnX, detailsStartY + 55);
        } else {
          doc
            .fillColor('#000000')
            .text('Pass', rightColumnX, detailsStartY + 55);
        }

        // ===== FOOTER SECTION (absolute positioning to prevent page overflow) =====
        // Certificate number
        doc
          .fontSize(8)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Cert #: ${certificateData.certificateNumber}`, margin, footerY, { 
            align: 'center',
            width: contentWidth
          });
        
        // Verification code (truncated for display)
        const shortCode = certificateData.verificationCode.substring(0, 32) + '...';
        doc
          .fontSize(7)
          .text(`Code: ${shortCode}`, margin, footerY + 12, { 
            align: 'center',
            width: contentWidth
          });
        
        // Verification URL (shortened, clickable)
        doc
          .fontSize(8)
          .fillColor(colors.primary)
          .text('Verify: localhost:5173/verify-certificate', margin, footerY + 24, { 
            align: 'center',
            width: contentWidth,
            link: `http://localhost:5173/certificate/${certificateData.verificationCode}`,
            underline: true
          });

        // Signature line (decorative)
        const signatureLineWidth = 150;
        const signatureX = centerX - (signatureLineWidth / 2);

        doc
          .moveTo(signatureX, signatureY)
          .lineTo(signatureX + signatureLineWidth, signatureY)
          .lineWidth(1)
          .strokeColor(colors.textLight)
          .stroke();

        doc
          .fontSize(10)
          .fillColor(colors.textLight)
          .text('Authorized Signature', signatureX, signatureY + 10, {
            width: signatureLineWidth,
            align: 'center'
          });

        // Add decorative seal/badge in corner (text-only, no emoji)
        const badgeLabel = template === 'elegant' ? 'ACHIEVED' : 'CERTIFIED';
        this.addTemplateBadge(doc, pageWidth - 120, badgeY, 40, badgeLabel, colors);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve(`/uploads/certificates/${filename}`);
        });

        stream.on('error', (error: any) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add template-colored badge to certificate
   */
  private addTemplateBadge(
    doc: InstanceType<typeof PDFDocument>, 
    x: number, y: number, radius: number, text: string, 
    colors: TemplateColors
  ): void {
    doc
      .circle(x, y, radius)
      .lineWidth(3)
      .strokeColor(colors.badgeStroke)
      .fillColor(colors.badgeFill)
      .fillAndStroke();

    doc
      .fontSize(12)
      .fillColor(colors.badgeStroke)
      .text(text, x - radius, y - 10, { 
        width: radius * 2, 
        align: 'center' 
      });
  }

  /**
   * Get relative URL path for certificate PDF
   */
  getCertificatePdfUrl(certificateNumber: string): string {
    return `/uploads/certificates/certificate_${certificateNumber}.pdf`;
  }
}

export default new CertificatePdfService();
