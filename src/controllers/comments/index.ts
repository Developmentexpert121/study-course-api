import { Request, Response } from "express";
import Comment from "../../models/comment.model";
import User from "../../models/user.model";


// Add Comment
export const addComment = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; 

    if (!content) {
      return res.sendError(res, "Content cannot be empty.");
    }

    const comment = await Comment.create({ content, courseId, userId });

    return res.sendSuccess(res, {
      message: "Comment added successfully",
      comment,
    });
  } catch (error: any) {
    console.error("[addComment] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


// Get all comments for a course
export const getCommentsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const comments = await Comment.findAll({
      where: { courseId },
      include: [
        {
          model: User,
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.sendSuccess(res, {
      comments,
    });
  } catch (error: any) {
    console.error("[getCommentsByCourse] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Update comment
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findByPk(commentId);

    if (!comment || comment.userId !== userId) {
      return res.sendError(res, "Unauthorized or comment not found.");
    }

    comment.content = content;
    await comment.save();

    return res.sendSuccess(res, {
      message: "Comment updated successfully",
      comment,
    });
  } catch (error: any) {
    console.error("[updateComment] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

// Delete comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(commentId);

    if (!comment || comment.userId !== userId) {
      return res.sendError(res, "Unauthorized or comment not found.");
    }

    await comment.destroy();

    return res.sendSuccess(res, {
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("[deleteComment] Error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
