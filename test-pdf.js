const PDFDocument = require('pdfkit');
const fs = require('fs');

async function test() {
    try {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 20, right: 15, bottom: 20, left: 15 }
        });
        doc.pipe(fs.createWriteStream('test-empty.pdf'));
        
        doc.fontSize(10).font('Helvetica');
        
        // Let's see what doc.heightOfString does with a number
        let h = 0;
        try {
             h = doc.heightOfString(12345, { width: 100 });
             console.log("Number height:", h);
        } catch (e) {
             console.log("Error with number:", e.message);
        }
        
        doc.end();
    } catch (e) {
        console.error(e);
    }
}
test();
