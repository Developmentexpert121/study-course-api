// helpers/certificate.helper.ts
import fs from "fs-extra";
import path from "path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";

// ✅ FIX: Use absolute path from project root
const PROJECT_ROOT = path.join(__dirname, '../..');
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'src/templates/certificates/certificate.html');
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');

console.log('🔍 Template search paths:');
console.log('PROJECT_ROOT:', PROJECT_ROOT);
console.log('TEMPLATE_PATH:', TEMPLATE_PATH);
console.log('Template exists:', fs.existsSync(TEMPLATE_PATH));

// Ensure directories exist
fs.ensureDirSync(TMP_DIR);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

async function renderTemplate(data: Record<string, any>): Promise<string> {
    try {
        console.log('🔍 Looking for template at:', TEMPLATE_PATH);

        // Check if template file exists
        if (!fs.existsSync(TEMPLATE_PATH)) {
            // Try alternative paths
            const alternativePaths = [
                path.join(PROJECT_ROOT, 'templates/certificates/certificate.html'),
                path.join(PROJECT_ROOT, 'dist/templates/certificates/certificate.html'),
                path.join(__dirname, '../templates/certificates/certificate.html'),
                path.join(__dirname, '../../templates/certificates/certificate.html')
            ];

            for (const altPath of alternativePaths) {
                console.log('Trying alternative path:', altPath);
                if (fs.existsSync(altPath)) {
                    console.log('✅ Found template at:', altPath);
                    const raw = await fs.readFile(altPath, "utf8");
                    const template = Handlebars.compile(raw);
                    return template(data);
                }
            }

            throw new Error(`Template file not found. Checked paths: ${TEMPLATE_PATH}, ${alternativePaths.join(', ')}`);
        }

        const raw = await fs.readFile(TEMPLATE_PATH, "utf8");
        const template = Handlebars.compile(raw);
        return template(data);
    } catch (error) {
        console.error('Error rendering template:', error);
        throw error;
    }
}

export async function generateCertificatePDFAndUpload({
    student_name,
    course_title,
    certificate_code,
    issued_date,
    verification_url,
    platform_logo
}: {
    student_name: string;
    course_title: string;
    certificate_code: string;
    issued_date: string;
    verification_url: string;
    platform_logo?: string;
}) {
    console.log('📄 Starting certificate PDF generation...', {
        student_name,
        course_title,
        certificate_code
    });

    let browser;
    let filePath = '';

    try {
        // 1) Generate QR data URL
        console.log('🔳 Generating QR code...');
        const qrDataUrl = await QRCode.toDataURL(verification_url);
        console.log('✅ QR code generated');

        // 2) Render HTML
        console.log('📝 Rendering HTML template...');
        const html = await renderTemplate({
            student_name,
            course_title,
            certificate_code,
            issued_date,
            verification_url,
            platform_logo: platform_logo || "",
            qr_data_url: qrDataUrl
        });
        console.log('✅ HTML template rendered');

        // 3) Create PDF locally
        const fileName = `${certificate_code}.pdf`;
        filePath = path.join(TMP_DIR, fileName);

        console.log('🌐 Launching browser for PDF generation...');
        browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true
        });

        const page = await browser.newPage();

        // Set viewport for better PDF rendering
        await page.setViewport({ width: 1240, height: 1754 }); // A4 dimensions

        console.log('📄 Setting HTML content...');
        await page.setContent(html, {
            waitUntil: "networkidle0",
            timeout: 30000
        });

        console.log('🖨️ Generating PDF...');
        const pdfBuffer = await page.pdf({
            path: filePath,
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" }
        });

        console.log('✅ PDF generated successfully');
        console.log('📊 PDF size:', pdfBuffer.length, 'bytes');

        // Verify the PDF file was created
        if (!fs.existsSync(filePath)) {
            throw new Error('PDF file was not created');
        }

        const stats = fs.statSync(filePath);
        console.log('📁 Local file stats:', {
            size: stats.size,
            created: stats.birthtime
        });

        if (stats.size === 0) {
            throw new Error('PDF file is empty (0 bytes)');
        }

        // 4) Upload to Cloudinary for long-term storage
        console.log('☁️ Uploading to Cloudinary...');

        let uploadResult;
        try {
            // Upload as auto to let Cloudinary detect the type
            uploadResult = await cloudinary.uploader.upload(filePath, {
                resource_type: "auto",
                public_id: `certificates/${certificate_code}`,
                overwrite: true,
                format: 'pdf'
            });
            console.log('✅ PDF uploaded to Cloudinary successfully');
        } catch (uploadError) {
            console.error('❌ Auto upload failed:', uploadError);

            // Fallback: try as raw
            uploadResult = await cloudinary.uploader.upload(filePath, {
                resource_type: "raw",
                public_id: `certificates/${certificate_code}.pdf`,
                overwrite: true
            });
            console.log('✅ PDF uploaded as raw file');
        }

        console.log('📋 Upload result:', {
            resource_type: uploadResult.resource_type,
            format: uploadResult.format,
            secure_url: uploadResult.secure_url,
            bytes: uploadResult.bytes
        });

        // 5) Verify the uploaded file is accessible
        console.log('🔍 Verifying uploaded file accessibility...');
        try {
            const response = await fetch(uploadResult.secure_url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentLength = response.headers.get('content-length');
            const contentType = response.headers.get('content-type');

            console.log('✅ File accessible:', {
                status: response.status,
                contentLength,
                contentType
            });

        } catch (fetchError) {
            console.error('❌ File accessibility check failed:', fetchError);
            throw new Error('Uploaded file is not accessible');
        }

        return {
            fileName,
            cloudinaryResult: uploadResult,
            localFilePath: filePath // Keep local file path for email attachment
        };

    } catch (error) {
        console.error('❌ Certificate generation failed:', error);

        // Clean up any temporary files on error
        if (filePath && fs.existsSync(filePath)) {
            try {
                await fs.unlink(filePath);
                console.log('✅ Temporary file cleaned up after error');
            } catch (cleanupError) {
                console.warn('⚠️ Error during cleanup:', cleanupError);
            }
        }

        throw error;
    } finally {
        // Always close browser
        if (browser) {
            await browser.close();
            console.log('🌐 Browser closed');
        }
    }
}

// Test function to verify PDF generation and upload
const testPDFGeneration = async () => {
    try {
        console.log('🧪 Testing PDF generation and upload...');

        const testData = {
            student_name: "Test Student",
            course_title: "Test Course",
            certificate_code: "TEST-" + Date.now(),
            issued_date: new Date().toISOString().split("T")[0],
            verification_url: "https://example.com/verify/TEST",
            platform_logo: ""
        };

        const result = await generateCertificatePDFAndUpload(testData);
        console.log('✅ PDF generation test successful');

        // Verify local file exists and is valid
        if (fs.existsSync(result.localFilePath)) {
            const stats = fs.statSync(result.localFilePath);
            console.log('📁 Test PDF stats:', { size: stats.size });

            // Clean up test file
            await fs.unlink(result.localFilePath);
            console.log('✅ Test file cleaned up');
        }

        return true;
    } catch (error) {
        console.error('❌ PDF generation test failed:', error);
        return false;
    }
};

// Run test on startup if in development
if (process.env.NODE_ENV === 'development') {
    setTimeout(testPDFGeneration, 2000);
}