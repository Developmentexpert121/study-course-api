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

// helpers/certificate.helper.ts
// helpers/certificate.helper.ts
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
    console.log('📄 Generating certificate PDF...');

    try {
        // 1) Generate QR data URL
        const qrDataUrl = await QRCode.toDataURL(verification_url);

        // 2) Render HTML
        const html = await renderTemplate({
            student_name,
            course_title,
            certificate_code,
            issued_date,
            verification_url,
            platform_logo: platform_logo || "",
            qr_data_url: qrDataUrl
        });

        // 3) Create PDF locally
        const fileName = `${certificate_code}.pdf`;
        const filePath = path.join(TMP_DIR, fileName);

        console.log('Launching browser for PDF generation...');
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true
        });

        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });

            await page.pdf({
                path: filePath,
                format: "A4",
                printBackground: true,
                margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" }
            });

            console.log('✅ PDF generated successfully at:', filePath);

        } finally {
            await browser.close();
        }

        // 4) Upload to Cloudinary - TRY DIFFERENT APPROACHES
        console.log('☁️ Uploading to Cloudinary...');

        let uploadResult;

        // APPROACH 1: Try as image first (convert PDF to image)
        try {
            console.log('🔄 Trying to upload as image...');
            uploadResult = await cloudinary.uploader.upload(filePath, {
                resource_type: "image",
                public_id: `certificates/${certificate_code}`,
                overwrite: true,
                format: 'png' // Convert to PNG
            });
            console.log('✅ Uploaded as image successfully');
        } catch (imageError) {
            console.log('❌ Image upload failed, trying as raw...');

            // APPROACH 2: Try as raw file
            try {
                uploadResult = await cloudinary.uploader.upload(filePath, {
                    resource_type: "raw",
                    public_id: `certificates/${certificate_code}.pdf`,
                    overwrite: true
                });
                console.log('✅ Uploaded as raw file successfully');
            } catch (rawError) {
                console.log('❌ Raw upload failed, trying auto...');

                // APPROACH 3: Let Cloudinary auto-detect
                uploadResult = await cloudinary.uploader.upload(filePath, {
                    resource_type: "auto",
                    public_id: `certificates/${certificate_code}`,
                    overwrite: true
                });
                console.log('✅ Uploaded with auto detection');
            }
        }

        console.log('✅ Upload successful!');
        console.log('📁 Resource type:', uploadResult.resource_type);
        console.log('🔗 Secure URL:', uploadResult.secure_url);
        console.log('📊 File size:', uploadResult.bytes, 'bytes');
        console.log('📄 Format:', uploadResult.format);

        // 5) Cleanup
        try {
            await fs.unlink(filePath);
            console.log('✅ Temporary file cleaned up');
        } catch (e) {
            console.warn("Cleanup warning:", e);
        }

        return {
            fileName,
            cloudinaryResult: uploadResult
        };

    } catch (error) {
        console.error('❌ Certificate generation failed:', error);
        throw error;
    }
}
const testCloudinaryUpload = async () => {
    try {
        console.log('🧪 Testing Cloudinary upload...');

        // Create a simple text file for testing
        const testFilePath = path.join(TMP_DIR, 'test.txt');
        await fs.writeFile(testFilePath, 'This is a test file for Cloudinary upload.');

        const result = await cloudinary.uploader.upload(testFilePath, {
            resource_type: "auto",
            public_id: "test_file",
            overwrite: true
        });

        console.log('✅ Cloudinary test upload successful:', result.secure_url);
        await fs.unlink(testFilePath);

        // Test if the URL is accessible
        const response = await fetch(result.secure_url);
        console.log('🔍 Test URL accessibility:', response.status);

        return result.secure_url;
    } catch (error) {
        console.error('❌ Cloudinary test upload failed:', error);
        return null;
    }
};

// Call this at the top of your file or in your app startup
testCloudinaryUpload();


console.log('🔍 Cloudinary Config Check:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'MISSING'
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});