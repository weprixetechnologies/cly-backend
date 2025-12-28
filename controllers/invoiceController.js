const invoiceService = require('../services/invoiceService');

// Generate invoice HTML
const generateInvoice = async (req, res) => {
    try {
        const { orderID } = req.params;

        if (!orderID) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const invoiceHTML = await invoiceService.generateInvoiceHTML(orderID);

        res.status(200).json({
            success: true,
            data: {
                html: invoiceHTML,
                orderID: orderID
            }
        });
    } catch (error) {
        console.error('[InvoiceController] Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice',
            error: error.message
        });
    }
};

// Generate and download invoice as PDF
const downloadInvoice = async (req, res) => {
    try {
        const { orderID } = req.params;

        if (!orderID) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Generate PDF using HTML to PDF conversion
        const pdfBuffer = await invoiceService.generateInvoicePDF(orderID);

        // Set headers for PDF response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderID}.pdf"`);

        // Send PDF buffer
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[InvoiceController] Error downloading invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download invoice',
            error: error.message
        });
    }
};

module.exports = {
    generateInvoice,
    downloadInvoice
};
