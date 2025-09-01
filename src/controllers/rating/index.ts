import { Request, Response } from "express";
import Ratings from "../../models/rating.model";

export const createRating = async (req: Request, res: Response) => {
  const { user_id, course_id, score, review } = req.body;

  if (!user_id || !course_id || !score) {
    return res.sendError(res, "MISSING_REQUIRED_FIELDS");
  }

  try {
    const existingRating = await Ratings.findOne({
      where: { user_id, course_id }
    });

    if (existingRating) {
      return res.sendError(res, "RATING_ALREADY_EXISTS");
    }

    const rating = await Ratings.create({ user_id, course_id, score, review });
    return res.sendSuccess(res, rating);
  } catch (err) {
    console.error("[createRating] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};


export const deleteRating = async (req: Request, res: Response) => {
  const ratingId = req.params.id;
  const userId = req.user?.id; 

  console.log(ratingId,userId,"==============================")

  if (!ratingId || !userId) {
    return res.sendError(res, "MISSING_REQUIRED_FIELDS");
  }

  try {
    const rating = await Ratings.findOne({ where: { id: ratingId } });

    if (!rating) {
      return res.sendError(res, "RATING_NOT_FOUND");
    }

    if (rating.user_id !== userId) {
      return res.sendError(res, "UNAUTHORIZED");
    }

    await rating.destroy();
    return res.sendSuccess(res, { message: "Rating deleted successfully." });
  } catch (err) {
    console.error("[deleteRating] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
