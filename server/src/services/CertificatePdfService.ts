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
}

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

        // Outer border (purple)
        doc
          .lineWidth(3)
          .strokeColor('#667eea')
          .rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2))
          .stroke();

        // Inner border (light purple)
        doc
          .lineWidth(1)
          .strokeColor('#a5b4fc')
          .rect(borderMargin + 10, borderMargin + 10, pageWidth - (borderMargin * 2) - 20, pageHeight - (borderMargin * 2) - 20)
          .stroke();

        // ===== HEADER SECTION =====
        doc.moveDown(2);
        
        // Company logo text
        doc
          .fontSize(20)
          .fillColor('#667eea')
          .font('Helvetica-Bold')
          .text('MISHIN LEARN', { align: 'center' })
          .fontSize(10)
          .fillColor('#666666')
          .font('Helvetica')
          .text('Smart Learning Platform', { align: 'center' })
          .moveDown(2);

        // Certificate title
        doc
          .fontSize(48)
          .fillColor('#667eea')
          .font('Helvetica-Bold')
          .text('Certificate of Completion', { align: 'center' })
          .moveDown(1.5);

        // Decorative line
        const centerY = doc.y;
        const centerX = pageWidth / 2;
        doc
          .moveTo(centerX - 100, centerY)
          .lineTo(centerX + 100, centerY)
          .lineWidth(2)
          .strokeColor('#667eea')
          .stroke();

        doc.moveDown(2);

        // ===== MAIN CONTENT =====
        doc
          .fontSize(14)
          .fillColor('#333333')
          .font('Helvetica')
          .text('This certifies that', { align: 'center' })
          .moveDown(0.5);

        // Student name (large and prominent)
        doc
          .fontSize(32)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text(certificateData.studentName, { align: 'center' })
          .moveDown(1);

        // Achievement text
        doc
          .fontSize(14)
          .fillColor('#333333')
          .font('Helvetica')
          .text('has successfully completed the course', { align: 'center' })
          .moveDown(0.5);

        // Course title
        doc
          .fontSize(20)
          .fillColor('#667eea')
          .font('Helvetica-Bold')
          .text(certificateData.courseTitle, { align: 'center' })
          .moveDown(1.5);

        // ===== DETAILS SECTION =====
        const detailsStartY = doc.y;
        const leftColumnX = 150;
        const rightColumnX = pageWidth - 250;

        // Left column - Date and Hours
        doc
          .fontSize(11)
          .fillColor('#666666')
          .font('Helvetica');

        doc
          .text('Completion Date:', leftColumnX, detailsStartY)
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
          .fillColor('#666666')
          .text('Time Invested:', leftColumnX, detailsStartY + 40)
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
          .fillColor('#666666')
          .text('Instructor:', rightColumnX, detailsStartY)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(certificateData.instructorName, rightColumnX, detailsStartY + 15);

        // Final Score (always show, even if null)
        doc
          .font('Helvetica')
          .fillColor('#666666')
          .text('Final Score:', rightColumnX, detailsStartY + 40)
          .font('Helvetica-Bold');
        
        if (certificateData.finalScore !== null && certificateData.finalScore !== undefined) {
          doc
            .fillColor(certificateData.finalScore >= 70 ? '#10b981' : '#667eea')
            .text(`${certificateData.finalScore.toFixed(1)}%`, rightColumnX, detailsStartY + 55);
        } else {
          doc
            .fillColor('#000000')
            .text('Pass', rightColumnX, detailsStartY + 55);
        }

        // ===== FOOTER SECTION =====
        doc.moveDown(4);

        // Certificate number (size 8)
        doc
          .fontSize(8)
          .fillColor('#999999')
          .font('Helvetica')
          .text(`Cert #: ${certificateData.certificateNumber}`, { 
            align: 'center'
          })
          .moveDown(0.3);
        
        // Verification code (truncated for display, size 7)
        const shortCode = certificateData.verificationCode.substring(0, 32) + '...';
        doc
          .fontSize(7)
          .text(`Code: ${shortCode}`, { 
            align: 'center'
          })
          .moveDown(0.5);
        
        // Verification URL (shortened, clickable)
        doc
          .fontSize(8)
          .fillColor('#667eea')
          .text('Verify: localhost:5173/verify-certificate', { 
            align: 'center',
            link: `http://localhost:5173/certificate/${certificateData.verificationCode}`,
            underline: true
          });

        // Signature line (decorative)
        const signatureY = pageHeight - 120;
        const signatureLineWidth = 150;
        const signatureX = centerX - (signatureLineWidth / 2);

        doc
          .moveTo(signatureX, signatureY)
          .lineTo(signatureX + signatureLineWidth, signatureY)
          .lineWidth(1)
          .strokeColor('#666666')
          .stroke();

        doc
          .fontSize(10)
          .fillColor('#666666')
          .text('Authorized Signature', signatureX, signatureY + 10, {
            width: signatureLineWidth,
            align: 'center'
          });

        // Add decorative seal/badge in corner (text-only, no emoji)
        this.addBadge(doc, pageWidth - 120, pageHeight - 120, 40, 'CERTIFIED');

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
   * Get relative URL path for certificate PDF
   */
  getCertificatePdfUrl(certificateNumber: string): string {
    return `/uploads/certificates/certificate_${certificateNumber}.pdf`;
  }
}

export default new CertificatePdfService();
