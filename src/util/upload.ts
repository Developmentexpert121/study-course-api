import multer from "multer";
import path from "path";
import fs from "fs";

// Absolute path:  <project root>/uploads
const uploadDir = path.join(__dirname, "../../uploads");

// ① Ensure the folder exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ② Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// ③ Optional file-type filter
const fileFilter = (_req: any, file: any, cb: any) => {
  const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.test(ext) ? cb(null, true) : cb(new Error("Unsupported file type"));
};

export default multer({ storage, fileFilter });
