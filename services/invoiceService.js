const db = require('../utils/dbconnect');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class InvoiceService {
    constructor() {
        this.companyInfo = {
            name: "Cursive Letters LY",
            address: {
                line1: "The Best You Get",
            }
        };

        // Design constants
        this.colors = {
            primary: '#1e40af',
            secondary: '#64748b',
            text: '#1f2937',
            lightGray: '#f8f9fa',
            border: '#e5e7eb',
            success: '#059669',
            white: '#ffffff'
        };
    }

    _formatInvoiceNumber(orderID) {
        return `INV-${orderID}`;
    }

    async generateInvoicePDF(orderID) {
        try {
            // Generate HTML invoice
            const invoiceHTML = await this.generateInvoiceHTML(orderID);

            // Convert HTML to PDF using Puppeteer
            const browser = await puppeteer.launch({
                headless: "new",
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox"
                ]
            });

            const page = await browser.newPage();

            // Set content with HTML
            await page.setContent(invoiceHTML, {
                waitUntil: 'networkidle0'
            });

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                printBackground: true
            });

            await browser.close();

            // Return PDF buffer
            return pdfBuffer;
        } catch (error) {
            throw new Error(`PDF generation failed: ${error.message}`);
        }
    }

    generateInvoicePDFContentNew(doc, { invoiceNumber, orderData, items, itemTotal, shipping, balanceDue, totalPaid, remainingAmount, paymentData }) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
        const startX = doc.page.margins.left;
        let cursorY = doc.page.margins.top;

        const ensureSpace = (needed = 50) => {
            if (cursorY + needed > pageHeight - doc.page.margins.bottom) {
                doc.addPage();
                cursorY = doc.page.margins.top;
                return true;
            }
            return false;
        };
        const advance = (dy = 10) => (cursorY += dy);

        // === HEADER ===
        ensureSpace(100);
        this.renderHeader(doc, startX, cursorY, contentWidth);
        advance(100);

        // === TITLE ===
        ensureSpace(40);
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .fillColor(this.colors.primary)
            .text('INVOICE', startX, cursorY);

        advance(30);
        doc.moveTo(startX, cursorY)
            .lineTo(startX + contentWidth, cursorY)
            .strokeColor(this.colors.primary)
            .lineWidth(2)
            .stroke();

        advance(25);

        // === INFO BOXES ===
        ensureSpace(170);
        this.renderInfoBoxes(doc, startX, cursorY, contentWidth, {
            invoiceNumber,
            orderData,
            balanceDue,
            totalPaid,
            remainingAmount
        });
        advance(170);

        // === ITEMS TABLE ===
        ensureSpace(60);
        cursorY = this.renderItemsTable(doc, startX, cursorY, contentWidth, items, ensureSpace);
        advance(30);

        // === PAYMENT HISTORY ===
        if (paymentData && paymentData.length > 0) {
            ensureSpace(80);
            cursorY = this.renderPaymentHistory(doc, startX, cursorY, contentWidth, paymentData, ensureSpace);
            advance(30);
        }

        // === SUMMARY ===
        ensureSpace(140);
        this.renderSummary(doc, startX, cursorY, contentWidth, {
            itemTotal,
            shipping,
            balanceDue,
            totalPaid,
            remainingAmount
        });
        advance(130);

        // === FOOTER ===
        this.renderFooter(doc, startX, pageHeight - doc.page.margins.bottom - 25, contentWidth);
    }

    renderHeader(doc, x, y, width) {
        const logoPath = path.join(__dirname, '..', 'utils', 'logo.jpg');
        const hasLogo = fs.existsSync(logoPath);

        if (hasLogo) {
            try {
                doc.image(logoPath, x, y, { width: 110, height: 70, fit: [110, 70] });
            } catch (err) {
                this.renderLogoPlaceholder(doc, x, y);
            }
        } else {
            this.renderLogoPlaceholder(doc, x, y);
        }

        const infoX = x + width - 200;
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text(this.companyInfo.name, infoX, y, { width: 200, align: 'right' });

        doc.fontSize(10)
            .font('Helvetica')
            .fillColor(this.colors.secondary)
            .text(this.companyInfo.address.line1, infoX, y + 20, { width: 200, align: 'right' });

        if (this.companyInfo.address.line2) {
            doc.text(this.companyInfo.address.line2, infoX, y + 35, { width: 200, align: 'right' });
        }
        if (this.companyInfo.address.line3) {
            doc.text(this.companyInfo.address.line3, infoX, y + 50, { width: 200, align: 'right' });
        }
    }

    renderLogoPlaceholder(doc, x, y) {
        doc.save()
            .fillColor(this.colors.primary)
            .roundedRect(x, y, 110, 70, 5)
            .fill();

        doc.fillColor(this.colors.white)
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('CURSIVE', x + 15, y + 20, { width: 80, align: 'center' });

        doc.fontSize(9)
            .text('LETTERS LY', x + 15, y + 42, { width: 80, align: 'center' });

        doc.restore();
    }

    renderInfoBoxes(doc, x, y, width, { invoiceNumber, orderData, balanceDue, totalPaid, remainingAmount }) {
        const gap = 20;
        const boxWidth = (width - gap) / 2;
        const boxHeight = 160;

        // Left box
        doc.save()
            .strokeColor(this.colors.border)
            .lineWidth(1.5)
            .roundedRect(x, y, boxWidth, boxHeight, 6)
            .stroke();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('Invoice Details', x + 15, y + 15);

        let ly = y + 38;
        const rows = [
            ['Invoice No:', this._formatInvoiceNumber(orderData.orderID)],
            ['Invoice Date:', new Date(orderData.createdAt).toLocaleDateString('en-IN')],
            ['Order ID:', `#${orderData.orderID}`],
            ['Payment Mode:', orderData.paymentMode || '-'],
            ['Invoice Amount:', `₹${balanceDue.toFixed(2)}`],
            ['Amount Paid:', `₹${totalPaid.toFixed(2)}`],
            ['Remaining:', `₹${remainingAmount.toFixed(2)}`]
        ];

        doc.fontSize(10);
        rows.forEach(([label, value]) => {
            doc.fillColor(this.colors.secondary)
                .font('Helvetica-Bold')
                .text(label, x + 15, ly, { width: 90, continued: false });

            doc.fillColor(this.colors.text)
                .font('Helvetica')
                .text(value, x + 110, ly, { width: boxWidth - 125 });
            ly += 16;
        });

        // Right box
        const rx = x + boxWidth + gap;
        doc.strokeColor(this.colors.border)
            .lineWidth(1.5)
            .roundedRect(rx, y, boxWidth, boxHeight, 6)
            .stroke();

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('Bill To / Ship To', rx + 15, y + 15);

        let ry = y + 38;
        const customerRows = [
            ['Customer:', orderData.userName || 'Unknown'],
            ['UID:', orderData.uid]
        ];

        if (orderData.addressName) {
            customerRows.push(
                ['Name:', orderData.addressName],
                ['Phone:', orderData.addressPhone || '-'],
                ['Address:', orderData.addressLine1 || '-']
            );
            if (orderData.addressLine2) {
                customerRows.push(['', orderData.addressLine2]);
            }
            const location = `${orderData.addressCity || ''}, ${orderData.addressState || ''} ${orderData.addressPincode || ''}`.trim();
            if (location) {
                customerRows.push(['', location]);
            }
        }

        doc.fontSize(10);
        customerRows.forEach(([label, value]) => {
            if (label) {
                doc.fillColor(this.colors.secondary)
                    .font('Helvetica-Bold')
                    .text(label, rx + 15, ry, { width: 70, continued: false });

                doc.fillColor(this.colors.text)
                    .font('Helvetica')
                    .text(value, rx + 90, ry, { width: boxWidth - 105 });
            } else {
                doc.fillColor(this.colors.text)
                    .font('Helvetica')
                    .text(value, rx + 90, ry, { width: boxWidth - 105 });
            }
            ry += 16;
        });

        doc.restore();
    }

    renderItemsTable(doc, x, y, width, items, ensureSpace) {
        let currentY = y;

        const cols = [
            { label: '#', w: 35, align: 'center' },
            { label: 'Item Description', w: 200, align: 'left' },
            { label: 'Req Qty', w: 60, align: 'right' },
            { label: 'Acc Qty', w: 60, align: 'right' },
            { label: 'Rate', w: 75, align: 'right' },
            { label: 'Amount', w: 85, align: 'right' }
        ];

        const renderTableHeader = (yPos) => {
            doc.save()
                .fillColor(this.colors.lightGray)
                .rect(x, yPos, width, 26)
                .fill();

            doc.strokeColor(this.colors.border)
                .lineWidth(1)
                .rect(x, yPos, width, 26)
                .stroke();

            let colX = x + 8;
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(this.colors.text);

            cols.forEach(col => {
                doc.text(col.label, colX, yPos + 8, {
                    width: col.w - 8,
                    align: col.align
                });
                colX += col.w;
            });

            doc.restore();
            return yPos + 26;
        };

        currentY = renderTableHeader(currentY);

        items.forEach((item, idx) => {
            if (ensureSpace(30)) {
                currentY = doc.page.margins.top;
                currentY = renderTableHeader(currentY);
            }

            const reqQty = Number(item.requested_units || item.units || 0);
            const accQty = Number(item.accepted_units || 0);
            const unitPrice = Number(
                item.final_price != null
                    ? item.final_price
                    : (item.pItemPrice || item.productPrice || 0)
            );
            const total = accQty * unitPrice;

            const rowHeight = 26;

            // Alternate row background
            if (idx % 2 === 0) {
                doc.fillColor('#fafafa')
                    .rect(x, currentY, width, rowHeight)
                    .fill();
            }

            doc.strokeColor(this.colors.border)
                .lineWidth(0.5)
                .rect(x, currentY, width, rowHeight)
                .stroke();

            let colX = x + 8;
            doc.fontSize(9)
                .font('Helvetica')
                .fillColor(this.colors.text);

            const values = [
                String(idx + 1),
                item.productName || 'Unknown Product',
                String(reqQty),
                String(accQty),
                `₹${unitPrice.toFixed(2)}`,
                `₹${total.toFixed(2)}`
            ];

            values.forEach((val, i) => {
                doc.text(val, colX, currentY + 8, {
                    width: cols[i].w - 8,
                    align: cols[i].align
                });
                colX += cols[i].w;
            });

            currentY += rowHeight;
        });

        return currentY;
    }

    renderPaymentHistory(doc, x, y, width, payments, ensureSpace) {
        let currentY = y;

        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('Payment History', x, currentY);

        currentY += 25;

        const cols = [
            { label: 'Date', w: 120, align: 'left' },
            { label: 'Amount', w: 110, align: 'right' },
            { label: 'Notes', w: 180, align: 'left' },
            { label: 'Admin', w: 105, align: 'left' }
        ];

        const renderPaymentHeader = (yPos) => {
            doc.save()
                .fillColor(this.colors.lightGray)
                .rect(x, yPos, width, 24)
                .fill();

            doc.strokeColor(this.colors.border)
                .lineWidth(1)
                .rect(x, yPos, width, 24)
                .stroke();

            let colX = x + 8;
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor(this.colors.text);

            cols.forEach(col => {
                doc.text(col.label, colX, yPos + 7, {
                    width: col.w - 8,
                    align: col.align
                });
                colX += col.w;
            });

            doc.restore();
            return yPos + 24;
        };

        currentY = renderPaymentHeader(currentY);

        payments.forEach((payment, idx) => {
            if (ensureSpace(28)) {
                currentY = doc.page.margins.top;
                currentY = renderPaymentHeader(currentY);
            }

            const rowHeight = 24;

            if (idx % 2 === 0) {
                doc.fillColor('#fafafa')
                    .rect(x, currentY, width, rowHeight)
                    .fill();
            }

            doc.strokeColor(this.colors.border)
                .lineWidth(0.5)
                .rect(x, currentY, width, rowHeight)
                .stroke();

            let colX = x + 8;
            doc.fontSize(9)
                .font('Helvetica')
                .fillColor(this.colors.text);

            const values = [
                new Date(payment.createdAt).toLocaleDateString('en-IN'),
                `₹${Number(payment.paid_amount).toFixed(2)}`,
                payment.notes || '-',
                payment.admin_uid || '-'
            ];

            values.forEach((val, i) => {
                doc.text(val, colX, currentY + 7, {
                    width: cols[i].w - 8,
                    align: cols[i].align
                });
                colX += cols[i].w;
            });

            currentY += rowHeight;
        });

        return currentY;
    }

    renderSummary(doc, x, y, width, { itemTotal, shipping, balanceDue, totalPaid, remainingAmount }) {
        const summaryX = x + width - 280;
        let summaryY = y;

        // Signature
        doc.fontSize(10)
            .font('Helvetica')
            .fillColor(this.colors.secondary)
            .text('Digitally Signed by:', x, summaryY);

        doc.font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text('Cursive Letters LY', x, summaryY + 16);

        // Summary box
        const summaryItems = [
            { label: 'Subtotal (Accepted)', value: itemTotal, bold: false },
            { label: 'Shipping Charge', value: shipping, bold: false },
            { label: 'Invoice Amount', value: balanceDue, bold: true, divider: true },
            { label: 'Amount Paid', value: totalPaid, bold: false },
            { label: 'Balance Due', value: remainingAmount, bold: true, highlight: true }
        ];

        summaryItems.forEach((item, idx) => {
            doc.fontSize(10)
                .font(item.bold ? 'Helvetica-Bold' : 'Helvetica')
                .fillColor(item.highlight ? this.colors.success : this.colors.text);

            doc.text(item.label, summaryX, summaryY, { width: 160 });
            doc.text(`₹${item.value.toFixed(2)}`, summaryX + 170, summaryY, {
                width: 110,
                align: 'right'
            });

            summaryY += 18;

            if (item.divider || idx === summaryItems.length - 1) {
                doc.strokeColor(idx === summaryItems.length - 1 ? this.colors.text : this.colors.border)
                    .lineWidth(idx === summaryItems.length - 1 ? 2 : 1)
                    .moveTo(summaryX, summaryY - 3)
                    .lineTo(summaryX + 280, summaryY - 3)
                    .stroke();
                summaryY += 5;
            }
        });
    }

    renderFooter(doc, x, y, width) {
        doc.fontSize(9)
            .font('Helvetica')
            .fillColor(this.colors.secondary)
            .text(
                'Payment is due within 15 days. Thank you for your business!',
                x,
                y,
                { width, align: 'center' }
            );
    }

    generateInvoicePDFContent(doc, { invoiceNumber, orderData, items, itemTotal, shipping, balanceDue, totalPaid, remainingAmount, paymentData }) {
        // This is the legacy method - keeping for backward compatibility
        return this.generateInvoicePDFContentNew(doc, {
            invoiceNumber, orderData, items, itemTotal, shipping,
            balanceDue, totalPaid, remainingAmount, paymentData
        });
    }

    async generateInvoiceHTML(orderID) {
        try {
            const orderData = await this.getOrderData(orderID);
            if (!orderData || orderData.length === 0) {
                throw new Error('Order not found');
            }

            const paymentData = await this.getPaymentData(orderID);
            const firstOrder = orderData[0];
            const invoiceNumber = `INV-${orderID}-${Date.now()}`;

            const itemTotal = orderData.reduce((sum, item) => {
                const acceptedQty = Number(item.accepted_units || 0);
                const unitPrice = Number(
                    item.final_price != null
                        ? item.final_price
                        : (item.pItemPrice || item.productPrice || 0)
                );
                return sum + (acceptedQty * unitPrice);
            }, 0);

            const shipping = Number(firstOrder.shipping_charge || 0);
            const balanceDue = itemTotal + shipping;
            const totalPaid = paymentData.reduce((sum, payment) => sum + Number(payment.paid_amount || 0), 0);
            const remainingAmount = balanceDue - totalPaid;

            const html = this.generateInvoiceHTMLTemplate({
                invoiceNumber,
                orderData: firstOrder,
                items: orderData,
                itemTotal,
                shipping,
                balanceDue,
                totalPaid,
                remainingAmount,
                paymentData
            });

            return html;
        } catch (error) {
            throw new Error(`Invoice generation failed: ${error.message}`);
        }
    }


    async getOrderData(orderID) {
        try {
            const [rows] = await db.execute(
                `SELECT 
                    o.*,
                    u.name as userName,
                    p.sku,
                    p.inventory
                FROM orders o 
                LEFT JOIN users u ON u.uid = o.uid 
                LEFT JOIN products p ON p.productID = o.productID 
                WHERE o.orderID = ? 
                ORDER BY o.productID`,
                [orderID]
            );
            return rows;
        } catch (error) {
            throw new Error(`Error fetching order data: ${error.message}`);
        }
    }

    async getPaymentData(orderID) {
        try {
            const [rows] = await db.execute(
                `SELECT 
                    paid_amount,
                    notes,
                    createdAt,
                    admin_uid
                FROM order_payments 
                WHERE orderID = ? 
                ORDER BY createdAt ASC`,
                [orderID]
            );
            return rows;
        } catch (error) {
            // If payment table doesn't exist or has no data, return empty array
            console.log('Payment data not available:', error.message);
            return [];
        }
    }

    generateInvoiceHTMLTemplate({ invoiceNumber, orderData, items, itemTotal, shipping, balanceDue, totalPaid, remainingAmount, paymentData }) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;line-height:1.4;color:#333;background:white}
        .invoice-container{max-width:800px;margin:0 auto;padding:15px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
        .logo{width:150px;height:150px;display:flex;align-items:center;justify-content:center}
        .logo img{max-width:100%;max-height:100%;object-fit:contain}
        .company-info{text-align:right}
        .company-info h1{font-size:16px;margin-bottom:8px}
        .company-info p{font-size:11px;margin:1px 0}
        .invoice-title{font-size:28px;font-weight:bold;margin:20px 0 15px 0}
        .divider{height:2px;background:#000;margin:15px 0}
        .details-section{display:flex;gap:20px;margin:20px 0}
        .invoice-details,.customer-details{width:50%;border:1px solid #ddd;padding:15px;border-radius:4px}
        .invoice-details h3,.customer-details h3{font-size:14px;margin-bottom:12px;color:#333;border-bottom:1px solid #eee;padding-bottom:5px}
        .detail-row{display:flex;margin:8px 0;align-items:center}
        .detail-label{font-weight:bold;width:120px;color:#555;font-size:12px}
        .detail-value{flex:1;font-size:12px;color:#333}
        .customer-details{text-align:left}
        .customer-details .detail-row{justify-content:flex-start}
        
        .items-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:11px}
        .items-table th{background:#f8f9fa;padding:8px 4px;text-align:left;font-weight:bold;border:1px solid #000;font-size:10px}
        .items-table td{padding:8px 4px;border:1px solid #000;font-size:10px}
        .items-table .number{text-align:right}
        .items-table th.number{text-align:right}
        .summary-signature-section{display:flex;justify-content:space-between;margin-top:20px}
        .summary-section{flex:1}
        .summary-table{width:280px;margin-left:auto}
        .summary-table .summary-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd}
        .summary-table .balance-due{font-weight:bold;border-top:2px solid #000;border-bottom:2px solid #000}
        .signature-section{flex:1;display:flex;justify-content:flex-start;align-items:flex-end}
        .signature-content{text-align:right}
        .signature-content p{margin:3px 0;font-size:11px}
        .footer{text-align:center;margin-top:30px;font-size:11px;color:#666}
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo">
                <div style="width:150px;height:150px;background:#1e40af;display:flex;flex-direction:column;justify-content:center;align-items:center;color:white;font-weight:bold;border-radius:4px;">
                    <div style="font-size:20px;line-height:1.1;">CURSIVE</div>
                    <div style="font-size:10px;margin-top:2px;">LETTERS LY</div>
                </div>
            </div>
            <div class="company-info">
                <h1>${this.companyInfo.name}</h1>
                <p>${this.companyInfo.address.line1}</p>
                <p>${this.companyInfo.address.line2 || ''}</p>
                <p>${this.companyInfo.address.line3 || ''}</p>
            </div>
        </div>
        
        <div class="invoice-title">Invoice</div>
        <div class="divider"></div>
        
        <div class="details-section">
            <div class="invoice-details">
                <h3>Invoice Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span class="detail-value">${invoiceNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice Date:</span>
                    <span class="detail-value">${new Date(orderData.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Order ID:</span>
                    <span class="detail-value">#${orderData.orderID}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Mode:</span>
                    <span class="detail-value">Payment Advance</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice Amount:</span>
                    <span class="detail-value">₹${balanceDue.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount Paid:</span>
                    <span class="detail-value">₹${totalPaid.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Remaining:</span>
                    <span class="detail-value">₹${remainingAmount.toFixed(2)}</span>
                </div>
            </div>
            <div class="customer-details">
                <h3>Bill To / Ship To</h3>
                <div class="detail-row">
                    <span class="detail-label">Customer:</span>
                    <span class="detail-value">${orderData.userName || 'Unknown Customer'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">UID:</span>
                    <span class="detail-value">${orderData.uid}</span>
                </div>
                ${orderData.addressName ? `
                <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${orderData.addressName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${orderData.addressPhone || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">${orderData.addressLine1 || ''}</span>
                </div>
                ${orderData.addressLine2 ? `
                <div class="detail-row">
                    <span class="detail-label"></span>
                    <span class="detail-value">${orderData.addressLine2}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">City:</span>
                    <span class="detail-value">${orderData.addressCity || ''}, ${orderData.addressState || ''} - ${orderData.addressPincode || ''}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>SR No</th>
                    <th>Item & Description</th>
                    <th class="number">Requested Qty</th>
                    <th class="number">Accepted Qty</th>
                    <th class="number">Unit Price</th>
                    <th class="number">Total Amount</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, index) => {
            const requestedQty = Number(item.requested_units || item.units || 0);
            const acceptedQty = Number(item.accepted_units || 0);
            const unitPrice = Number(
                item.final_price != null
                    ? item.final_price
                    : (item.pItemPrice || item.productPrice || 0)
            );
            const totalAmount = acceptedQty * unitPrice;

            return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.productName || 'Unknown Product'}</td>
                            <td class="number">${requestedQty}</td>
                            <td class="number">${acceptedQty}</td>
                            <td class="number">₹${unitPrice.toFixed(2)}</td>
                            <td class="number">₹${totalAmount.toFixed(2)}</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        </table>
        
        <!-- Payment History Section -->
        ${paymentData && paymentData.length > 0 ? `
        <div style="margin: 20px 0;">
            <h3 style="font-size: 16px; margin-bottom: 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Payment History</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 10px;">Date</th>
                        <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000; font-size: 10px;">Amount</th>
                        <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 10px;">Notes</th>
                        <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 10px;">Admin</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentData.map(payment => `
                        <tr>
                            <td style="padding: 8px 4px; border: 1px solid #000; font-size: 10px;">${new Date(payment.createdAt).toLocaleDateString('en-IN')}</td>
                            <td style="padding: 8px 4px; border: 1px solid #000; font-size: 10px; text-align: right;">₹${Number(payment.paid_amount).toFixed(2)}</td>
                            <td style="padding: 8px 4px; border: 1px solid #000; font-size: 10px;">${payment.notes || '-'}</td>
                            <td style="padding: 8px 4px; border: 1px solid #000; font-size: 10px;">${payment.admin_uid || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- Summary and Signature Section -->
        <div class="summary-signature-section">
            <div class="signature-section">
                <div class="signature-content">
                    <p><strong>Digitally Signed by:</strong></p>
                    <p><strong>Cursive Letters LY</strong></p>
                   
                </div>
            </div>
            <div class="summary-section">
                <div class="summary-table">
                    <div class="summary-row">
                        <span>Item Total (Accepted)</span>
                        <span>₹${itemTotal.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping Charge</span>
                        <span>₹${shipping.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Invoice Amount</span>
                        <span>₹${balanceDue.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Amount Paid</span>
                        <span>₹${totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="summary-row balance-due">
                        <span>Remaining Balance</span>
                        <span>₹${remainingAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Payment is due within 15 days. Thank you for your business.</p>
        </div>
    </div>
</body>
</html>`;
    }
}

module.exports = new InvoiceService();
