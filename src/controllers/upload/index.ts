import { Request, Response } from "express";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.sendError(res, "No file uploaded");
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return res.sendSuccess(res, {
      message: "File uploaded successfully",
      fileUrl,
    });
  } catch (err) {
    console.error("[uploadFile] Error:", err); 
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
