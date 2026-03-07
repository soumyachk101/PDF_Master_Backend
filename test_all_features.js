const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

async function setupFixtures() {
    // 3 Page PDF for split & extract
    const pdfDoc = await PDFDocument.create();
    for (let i = 1; i <= 3; i++) {
        const page = pdfDoc.addPage();
        page.drawText(`Page ${i}`);
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('fixture_multi.pdf', pdfBytes);

    // 1 Page PDF for general
    const singlePdf = await PDFDocument.create();
    singlePdf.addPage().drawText('Single Page');
    fs.writeFileSync('fixture_single.pdf', await singlePdf.save());

    // TXT file for word-to-pdf
    fs.writeFileSync('fixture.txt', 'Hello world');

    // Blank JPG
    await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toFile('fixture.jpg');
}

const apiUrl = 'https://pdfmasterbackend-production-738e.up.railway.app/api/pdf';
// const apiUrl = 'http://localhost:4000/api/pdf';

async function testEndpoint(name, endpoint, fileFields, bodyFields = {}, isZip = false) {
    console.log(`\n--- Testing ${name} ---`);
    try {
        const form = new FormData();
        fileFields.forEach(({ field, path }) => form.append(field, fs.createReadStream(path)));
        Object.entries(bodyFields).forEach(([k, v]) => form.append(k, v));

        const res = await axios.post(`${apiUrl}/${endpoint}`, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer' // to capture correct byte counts
        });
        console.log(`✅ ${name} SUCCESS! Status: ${res.status}, Type: ${res.headers['content-type']}, Size: ${res.data.byteLength}`);
    } catch (e) {
        if (e.response && e.response.data instanceof Buffer) {
            console.error(`❌ ${name} FAILED:`, e.response.data.toString());
        } else {
            console.error(`❌ ${name} FAILED:`, e.message);
            if (e.response && e.response.status === 500) console.log("Is the dependency missing on the server?");
        }
    }
}

async function run() {
    await setupFixtures();

    // Organize features
    await testEndpoint('Merge PDF', 'merge-pdf', [{ field: 'files', path: 'fixture_single.pdf' }, { field: 'files', path: 'fixture_multi.pdf' }]);
    await testEndpoint('Split PDF', 'split-pdf', [{ field: 'files', path: 'fixture_multi.pdf' }], { ranges: '1-2' }, true);
    await testEndpoint('Remove Pages', 'remove-pages', [{ field: 'files', path: 'fixture_multi.pdf' }], { pages: '2' });
    await testEndpoint('Extract Pages', 'extract-pages', [{ field: 'files', path: 'fixture_multi.pdf' }], { ranges: '1,3' });

    // Optimize
    await testEndpoint('Compress PDF', 'compress-pdf', [{ field: 'files', path: 'fixture_single.pdf' }]); // Uses GS

    // Convert TO PDF
    await testEndpoint('JPG to PDF', 'jpg-to-pdf', [{ field: 'files', path: 'fixture.jpg' }]);
    await testEndpoint('Word to PDF', 'word-to-pdf', [{ field: 'files', path: 'fixture.txt' }]); // LibreOffice

    // Convert FROM PDF
    await testEndpoint('PDF to JPG', 'pdf-to-jpg', [{ field: 'files', path: 'fixture_multi.pdf' }], {}, true); // Uses pdf2pic (GM/IM)
    await testEndpoint('PDF to Word', 'pdf-to-word', [{ field: 'files', path: 'fixture_single.pdf' }]);
    await testEndpoint('PDF to Excel', 'pdf-to-excel', [{ field: 'files', path: 'fixture_multi.pdf' }]);
    await testEndpoint('PDF to PowerPoint', 'pdf-to-pptx', [{ field: 'files', path: 'fixture_single.pdf' }]);

    // Edit & Security
    await testEndpoint('Rotate PDF', 'rotate-pdf', [{ field: 'files', path: 'fixture_single.pdf' }], { degrees: '180' });
    await testEndpoint('Page Numbers', 'page-numbers', [{ field: 'files', path: 'fixture_single.pdf' }]);
    await testEndpoint('Watermark', 'add-watermark', [{ field: 'files', path: 'fixture_single.pdf' }], { text: 'TESTING' });
    await testEndpoint('Protect PDF', 'protect-pdf', [{ field: 'files', path: 'fixture_single.pdf' }], { password: 'pass' }); // QPDF
}

run();
