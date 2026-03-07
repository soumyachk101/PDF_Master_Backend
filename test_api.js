const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const FormData = require('form-data');

async function createDummyPdf(filename) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('Dummy PDF for testing');
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filename, pdfBytes);
}

async function testApi() {
    console.log('Creating dummy files...');
    await createDummyPdf('test1.pdf');
    await createDummyPdf('test2.pdf');
    fs.writeFileSync('test.txt', 'Dummy text file for testing word to pdf');

    const apiUrl = 'https://pdfmasterbackend-production-738e.up.railway.app/api/pdf';

    console.log('\n--- Testing merge-pdf ---');
    try {
        const form = new FormData();
        form.append('files', fs.createReadStream('test1.pdf'));
        form.append('files', fs.createReadStream('test2.pdf'));

        const response = await axios.post(`${apiUrl}/merge-pdf`, form, {
            headers: form.getHeaders()
        });
        console.log('merge-pdf success! Status:', response.status);
    } catch (e) {
        console.error('merge-pdf failed:', e.response ? e.response.data : e.message);
    }

    console.log('\n--- Testing word-to-pdf ---');
    try {
        const form = new FormData();
        form.append('files', fs.createReadStream('test.txt'));
        const response = await axios.post(`${apiUrl}/word-to-pdf`, form, {
            headers: form.getHeaders()
        });
        console.log('word-to-pdf success! Status:', response.status);
    } catch (e) {
        if (e.response && e.response.data instanceof Buffer) {
            console.error('word-to-pdf failed:', e.response.data.toString());
        } else {
            console.error('word-to-pdf failed:', e.response ? e.response.data : e.message);
        }
    }
}

testApi();
