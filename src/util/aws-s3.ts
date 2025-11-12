import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";

// --- Initialize S3 Client ---
const s3 = new S3Client({
    region: process.env.AWS_REGION, // e.g., "ap-south-1"
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// --- Define Multer S3 Storage ---
export const storage = multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME, // your S3 bucket name
    contentType: multerS3.AUTO_CONTENT_TYPE, // auto-detect file type
    acl: "public-read", // make uploaded files public (or private if needed)
    key: (req, file, cb) => {
        const isVideo = file.mimetype.startsWith("video/");
        const folder = "uploads";
        const ext = path.extname(file.originalname);
        const fileName = `${folder}/${Date.now()}_${file.fieldname}${ext}`;
        cb(null, fileName);
    },
    metadata: (req, file, cb) => {
        cb(null, {
            fieldName: file.fieldname,
            mimeType: file.mimetype,
        });
    },
});