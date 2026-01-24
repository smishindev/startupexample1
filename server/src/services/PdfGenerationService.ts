/**
 * PdfGenerationService - Base class for PDF generation with common utilities
 * Can be extended by specific PDF generators (Certificates, Reports, etc.)
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

type PDFDoc = typeof PDFDocument.prototype;

export interface PdfConfig {
  margin?: number;
  size?: 'LETTER' | 'A4' | 'LEGAL';
  layout?: 'portrait' | 'landscape';
}

export class PdfGenerationService {
  protected uploadsDir: string;

  constructor(subdirectory: string = 'pdfs') {
    this.uploadsDir = path.join(__dirname, `../../uploads/${subdirectory}`);
    // Ensure directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Create a new PDF document with default configuration
   */
  protected createDocument(config: PdfConfig = {}): InstanceType<typeof PDFDocument> {
    return new PDFDocument({
      margin: config.margin || 50,
      size: config.size || 'LETTER',
      layout: config.layout || 'portrait'
    });
  }

  /**
   * Add company header/branding to document
   */
  protected addBranding(doc: InstanceType<typeof PDFDocument>, options: { 
    title?: string; 
    subtitle?: string; 
    align?: 'left' | 'center' | 'right' 
  } = {}): void {
    const align = options.align || 'left';
    
    doc
      .fontSize(28)
      .fillColor('#667eea')
      .text(options.title || 'Mishin Learn', { align })
      .fontSize(10)
      .fillColor('#666666')
      .text(options.subtitle || 'Smart Learning Platform', { align })
      .moveDown();
  }

  /**
   * Add a decorative horizontal line
   */
  protected addHorizontalLine(doc: InstanceType<typeof PDFDocument>, y?: number, color: string = '#cccccc'): void {
    const currentY = y || doc.y;
    doc
      .moveTo(50, currentY)
      .lineTo(doc.page.width - 50, currentY)
      .strokeColor(color)
      .stroke();
  }

  /**
   * Add footer with contact information
   */
  protected addFooter(doc: InstanceType<typeof PDFDocument>, customText?: string): void {
    doc
      .fontSize(10)
      .fillColor('#999999')
      .text(customText || 'Thank you for choosing Mishin Learn!', { align: 'center' })
      .moveDown(0.5)
      .fontSize(9)
      .text('For support, contact us at support@mishinlearn.com', { align: 'center' })
      .text('https://mishinlearn.com', { align: 'center', link: 'https://mishinlearn.com' });
  }

  /**
   * Add a centered title
   */
  protected addCenteredTitle(doc: InstanceType<typeof PDFDocument>, text: string, fontSize: number = 24, color: string = '#667eea'): void {
    doc
      .fontSize(fontSize)
      .fillColor(color)
      .text(text, { align: 'center' })
      .moveDown();
  }

  /**
   * Add a badge/seal effect (circular decoration)
   */
  protected addBadge(doc: InstanceType<typeof PDFDocument>, x: number, y: number, radius: number, text: string): void {
    // Draw circle
    doc
      .circle(x, y, radius)
      .lineWidth(3)
      .strokeColor('#667eea')
      .fillColor('#f8f9ff')
      .fillAndStroke();

    // Add text in center
    doc
      .fontSize(12)
      .fillColor('#667eea')
      .text(text, x - radius, y - 10, { 
        width: radius * 2, 
        align: 'center' 
      });
  }

  /**
   * Get absolute file path for a relative URL
   */
  getFilePath(relativeUrl: string): string {
    const filename = path.basename(relativeUrl);
    return path.join(this.uploadsDir, filename);
  }

  /**
   * Check if PDF file exists
   */
  fileExists(relativeUrl: string): boolean {
    const filepath = this.getFilePath(relativeUrl);
    return fs.existsSync(filepath);
  }

  /**
   * Save PDF document to file
   */
  protected savePdf(doc: InstanceType<typeof PDFDocument>, filename: string): Promise<string> {
    const filepath = path.join(this.uploadsDir, filename);

    return new Promise((resolve, reject) => {
      try {
        // Ensure directory exists (in case it was deleted after service initialization)
        if (!fs.existsSync(this.uploadsDir)) {
          console.log(`📁 Recreating missing directory: ${this.uploadsDir}`);
          fs.mkdirSync(this.uploadsDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
