import { Request, Response, NextFunction } from "express";
import { checkAccessToken } from "../util/auth";
import User from "../models/user.model";
import Role from "../models/role.model";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const accessControl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authToken = (req as Request).get("authorization")?.replace("Bearer ", "");
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

  // Your token structure: { id: 1, email: '...', role: '...' }
  const userId = data.id;

  if (!userId) {
    console.error("User ID not found in token:", data);
    return res.status(403).json({
      error: { code: "ERR_INVALID_TOKEN" }
    });
  }

  console.log("Fetching user with ID:", userId);

  // Enhance user data with role details
  const userWithRole = await User.findByPk(userId, {
    include: [{
      model: Role,
      as: 'roleDetails',
      attributes: ['id', 'name', 'permissions']
    }]
  });

  console.log("User fetched:", userWithRole ? {
    id: userWithRole.id,
    username: userWithRole.username,
    role_id: userWithRole.role_id,
    roleDetails: userWithRole.roleDetails
  } : "User not found");

  if (!userWithRole) {
    return res.status(403).json({
      error: { code: "ERR_USER_NOT_FOUND" }
    });
  }

  req.user = userWithRole;
  next();
};

// Role-based middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "ERR_AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      });
    }

    const userRole = req.user.roleDetails?.name;

    console.log(userRole, "====gsfdasfdgfasgdfghas!~~~~~~~")
    console.log(allowedRoles, "===user===role==``````````````````````=")
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: "ERR_INSUFFICIENT_PERMISSIONS",
          message: "Access denied. Insufficient permissions.",
        },
      });
    }

    next();
  };
};

// Permission-based middleware
const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "ERR_AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      });
    }

    const userPermissions = req.user.roleDetails?.permissions || {};

    if (!userPermissions[permission]) {
      return res.status(403).json({
        error: {
          code: "ERR_PERMISSION_DENIED",
          message: `Access denied. Required permission: ${permission}`,
        },
      });
    }

    next();
  };
};

export default accessControl;
export { requireRole, requirePermission, AuthenticatedRequest };

// import { Request, Response, NextFunction } from "express";
// import { checkAccessToken } from "../util/auth";

// interface AuthenticatedRequest extends Request {
//   user?: any;
// }

// const accessControl = async (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authToken = (req as Request).get("authorization")?.replace("Bearer ", "");
//   if (!authToken) {
//     return res.status(401).json({
//       error: {
//         code: "ERR_ACCESS_TOKEN_MISSING",
//         message: "Authorization-Header is not set",
//       },
//     });
//   }

//   const { data, error }: any = await checkAccessToken(authToken);
//   if (error) {
//     switch (error.name) {
//       case "JsonWebTokenError":
//         return res
//           .status(403)
//           .json({ error: { code: "ERR_INVALID_ACCESS_TOKEN" } });
//       case "TokenExpiredError":
//         return res
//           .status(403)
//           .json({ error: { code: "ERR_ACCESS_TOKEN_EXPIRED" } });
//       default:
//         return res
//           .status(403)
//           .json({ error: { code: "ERR_INVALID_ACCESS_TOKEN" } });
//     }
//   }

//   req.user = data.user;
//   next();
// };

// export default accessControl;
