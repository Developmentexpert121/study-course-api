import multer from "multer";
import { storage } from "./aws-s3";

// --- Multer Upload Middleware ---
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit (adjust as needed)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime", // mov
      "video/x-msvideo", // avi
      "video/x-matroska", // mkv
    ];

    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only images and videos are allowed."));
  },
});

export default upload;
