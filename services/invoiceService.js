const db = require('../utils/dbconnect');

class InvoiceService {
    constructor() {
        this.companyInfo = {
            name: "CURSIVE LETTERS Pvt Ltd",
            address: {
                line1: "The Best You Get",
            }
        };
    }

    async generateInvoiceHTML(orderID) {
        try {
            // Fetch order data
            const orderData = await this.getOrderData(orderID);
            if (!orderData || orderData.length === 0) {
                throw new Error('Order not found');
            }

            // Fetch payment data
            const paymentData = await this.getPaymentData(orderID);

            const firstOrder = orderData[0];
            const invoiceNumber = `INV-${orderID}-${Date.now()}`;

            // Calculate totals based on accepted units
            const itemTotal = orderData.reduce((sum, item) => {
                const acceptedQty = Number(item.accepted_units || 0);
                const price = Number(item.pItemPrice || item.productPrice || 0);
                return sum + (acceptedQty * price);
            }, 0);

            const shipping = 0; // No shipping charges for now
            const balanceDue = itemTotal + shipping;

            // Calculate payment totals
            const totalPaid = paymentData.reduce((sum, payment) => sum + Number(payment.paid_amount || 0), 0);
            const remainingAmount = balanceDue - totalPaid;

            // Generate HTML
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
                    <div style="font-size:10px;margin-top:2px;">LETTERS</div>
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
                    <span class="detail-value">${orderData.paymentMode}</span>
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
            const unitPrice = Number(item.pItemPrice || item.productPrice || 0);
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
                    <p><strong>CURSIVE LETTERS Pvt Ltd</strong></p>
                   
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
