import jwt from "jsonwebtoken";
import conf from "../conf/auth.conf";

export function generateTokens(user: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    conf.secret,
    { expiresIn: "1h" } // shorter expiry
  );

  const refreshToken = jwt.sign(
    { id: user.id , email: user.email, role: user.role },
    conf.refreshSecret, // different secret
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
