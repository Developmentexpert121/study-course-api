import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");

    return {
      folder: "uploads",
      resource_type: isVideo ? "video" : "image",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "avi", "mkv"], 
      transformation: !isVideo
        ? [{ width: 500, height: 500, crop: "limit" }]
        : undefined, 
    };
  },
});

export default multer({ storage });
