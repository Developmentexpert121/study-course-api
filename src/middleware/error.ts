import { Request, Response, ErrorRequestHandler, NextFunction } from "express";
import { ValidationError } from "express-validation";

const r = (
  err: ErrorRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ValidationError) {
    return res.sendError(res, "ERR_VALIDATION", err.details);
  }

  console.error(err);
  return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
};

export default r;
