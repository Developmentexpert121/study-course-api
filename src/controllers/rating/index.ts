import { Request, Response } from "express";
import Ratings from "../../models/rating.model";

export const createRating = async (req: Request, res: Response) => {
  const { user_id, course_id, score, review } = req.body;

  if (!user_id || !course_id || !score) {
    return res.sendError(res, "MISSING_REQUIRED_FIELDS");
  }

  try {
    const rating = await Ratings.create({ user_id, course_id, score, review });
    return res.sendSuccess(res, rating);
  } catch (err) {
    console.error("[createRating] Error:", err);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};
