import jwt from "jsonwebtoken";
import conf from "../conf/auth.conf";

export function generateTokens(user: {
  id: string;
  email: string;
  role: string;
  permissions?: string[]; // Add permissions as optional parameter
}) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [] // Use user.permissions instead of userPermissions
    },
    conf.secret,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id
    },
    conf.refreshSecret,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

export function checkAccessToken(accessToken: string): Promise<{ data: any | null; error: any | null }> {
  return new Promise((resolve) => {
    jwt.verify(accessToken, conf.secret, (err, decoded) => {
      if (err) {
        resolve({ data: null, error: err });
      } else {
        resolve({ data: decoded, error: null });
      }
    });
  });
}