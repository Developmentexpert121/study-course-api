import { Request, Response } from "express";
import User from "../../models/user.model";

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

export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId; 
    const file = req.file;

    if (!file) {
      return res.sendError(res, "No image uploaded");
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.sendError(res, "User not found");
    }

    user.profileImage = imageUrl;
    await user.save();

    return res.sendSuccess(res, {
      message: "Profile image updated successfully",
      profileImage: imageUrl,
    });
  } catch (error) {
    console.error("[updateProfileImage] Error:", error);
    return res.sendError(res, "Failed to update profile image");
  }
};

export const getUserProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "profileImage"],
    });

    if (!user) {
      return res.sendError(res, "User not found");
    }

    return res.sendSuccess(res, {
      id: user.id,
      username: user.username,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error("[getUserProfileImage] Error:", error);
    return res.sendError(res, "Failed to fetch user profile image");
  }
};
