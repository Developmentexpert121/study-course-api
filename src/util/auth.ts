import jwt from "jsonwebtoken";
import conf from "../conf/auth.conf";

export async function generateTokens(user: { id: string, role: string }): Promise<{ accessToken: string }> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { id: user.id, role: user.role },
      conf.secret,
      { expiresIn: conf.expiresIn },
      (err, token) => {
        if (err || !token) {
          return reject(err || new Error("Failed to sign token"));
        }
        resolve({ accessToken: token });
      }
    );
  });
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
