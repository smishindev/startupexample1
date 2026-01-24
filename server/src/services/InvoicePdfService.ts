/**
 * InvoicePdfService - Generate professional PDF invoices
 * Extends PdfGenerationService for common PDF utilities
 */

import { PdfGenerationService } from './PdfGenerationService';
import PDFDocument from 'pdfkit';
import path from 'path';

interface InvoiceItem {
  description: string;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  billingAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
}

export class InvoicePdfService extends PdfGenerationService {
  constructor() {
    super('invoices'); // PDFs will be stored in uploads/invoices/
  }

  /**
   * Generate a PDF invoice and return the file path
   */
  async generateInvoicePdf(invoiceData: InvoiceData): Promise<string> {
    const filename = `invoice_${invoiceData.invoiceNumber}.pdf`;

    return new Promise((resolve, reject) => {
      try {
        const doc = this.createDocument({ margin: 50 });

        // Header with company branding (using base class method)
        this.addBranding(doc, { title: 'Mishin Learn', subtitle: 'Smart Learning Platform', align: 'left' });

        // Invoice title
        doc
          .fontSize(24)
          .fillColor('#000000')
          .text('INVOICE', { align: 'right' })
          .fontSize(12)
          .fillColor('#666666')
          .text(`Invoice #: ${invoiceData.invoiceNumber}`, { align: 'right' })
          .text(`Date: ${invoiceData.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' })
          .moveDown(2);

        // Billing information
        doc
          .fontSize(14)
          .fillColor('#000000')
          .text('Bill To:', { underline: true })
          .fontSize(11)
          .fillColor('#333333')
          .text(invoiceData.customerName)
          .text(invoiceData.customerEmail);

        if (invoiceData.billingAddress) {
          doc.text(invoiceData.billingAddress);
        }

        doc.moveDown(2);

        // Items table header
        const tableTop = doc.y;
        const descriptionX = 50;
        const amountX = 450;

        doc
          .fontSize(12)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text('Description', descriptionX, tableTop)
          .text('Amount', amountX, tableTop);

        // Draw header line
        doc
          .font('Helvetica')
          .moveTo(50, tableTop + 20)
          .lineTo(550, tableTop + 20)
          .strokeColor('#cccccc')
          .stroke();

        // Items
        let currentY = tableTop + 30;
        doc.fontSize(11).fillColor('#333333');

        invoiceData.items.forEach((item) => {
          doc
            .text(item.description, descriptionX, currentY, { width: 350 })
            .text(`$${item.amount.toFixed(2)}`, amountX, currentY, { align: 'right' });
          currentY += 25;
        });

        // Draw separator line
        doc
          .moveTo(50, currentY)
          .lineTo(550, currentY)
          .strokeColor('#cccccc')
          .stroke();

        currentY += 20;

        // Totals
        doc.fontSize(11);
        
        // Subtotal
        doc
          .text('Subtotal:', amountX - 80, currentY)
          .text(`$${invoiceData.subtotal.toFixed(2)}`, amountX, currentY, { align: 'right' });
        currentY += 20;

        // Tax
        if (invoiceData.tax > 0) {
          doc
            .text('Tax:', amountX - 80, currentY)
            .text(`$${invoiceData.tax.toFixed(2)}`, amountX, currentY, { align: 'right' });
          currentY += 20;
        }

        // Total
        doc
          .fontSize(14)
          .fillColor('#667eea')
          .font('Helvetica-Bold')
          .text('Total:', amountX - 80, currentY)
          .text(`$${invoiceData.total.toFixed(2)}`, amountX, currentY, { align: 'right' })
          .font('Helvetica');

        currentY += 40;

        // Payment method
        if (invoiceData.paymentMethod) {
          doc
            .fontSize(10)
            .fillColor('#666666')
            .text(`Payment Method: ${invoiceData.paymentMethod}`, 50, currentY);
          currentY += 20;
        }

        // Footer (using base class method)
        doc.moveDown(3);
        this.addFooter(doc, 'Thank you for your purchase!');

        // Save PDF using base class method
        this.savePdf(doc, filename)
          .then(filepath => resolve(`/uploads/invoices/${filename}`))
          .catch(error => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get absolute file path for an invoice
   * (Overrides base class method for backward compatibility)
   */
  getInvoiceFilePath(relativeUrl: string): string {
    return this.getFilePath(relativeUrl);
  }

  /**
   * Check if invoice PDF exists
   * (Overrides base class method for backward compatibility)
   */
  invoiceExists(relativeUrl: string): boolean {
    return this.fileExists(relativeUrl);
  }
}

export default new InvoicePdfService();
