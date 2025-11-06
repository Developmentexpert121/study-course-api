import { Request, Response, NextFunction } from "express";
import { checkAccessToken } from "../util/auth";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const accessControl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authToken = req.get("authorization")?.replace("Bearer ", "");
  if (!authToken) {
    return res.status(401).json({
      error: {
        code: "ERR_ACCESS_TOKEN_MISSING",
        message: "Authorization-Header is not set",
      },
    });
  }
  const { data, error }: any = await checkAccessToken(authToken);
  if (error) {
    switch (error.name) {
      case "JsonWebTokenError":
        return res
          .status(403)
          .json({ error: { code: "ERR_INVALID_ACCESS_TOKEN" } });
      case "TokenExpiredError":
        return res
          .status(403)
          .json({ error: { code: "ERR_ACCESS_TOKEN_EXPIRED" } });
      default:
        return res
          .status(403)
          .json({ error: { code: "ERR_INVALID_ACCESS_TOKEN" } });
    }
  }
  req.user = data.user;
  next();
};

export default accessControl;
