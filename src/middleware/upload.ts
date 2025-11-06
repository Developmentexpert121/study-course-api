import multer from "multer";
import path from "path";

// Define storage
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads/"),
  filename: (_, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// File filter
const fileFilter: multer.Options["fileFilter"] = (_, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|mp4|mov|avi|mkv/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  cb(ext && mime ? null : new Error("Only images and video files are allowed!"), ext && mime);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 500 },
});

export default upload;
