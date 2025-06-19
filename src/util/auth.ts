import jwt from "jsonwebtoken";
import conf from "../conf/auth.conf";

// Manually wrap jwt.sign in a Promise
export async function generateTokens(_id: string): Promise<{ accessToken: string }> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { user: { _id } },
      conf.secret,
      { expiresIn: conf.expiresIn }, // expiresIn: '360d'
      (err, token) => {
        if (err || !token) {
          return reject(err || new Error("Failed to sign token"));
        }
        resolve({ accessToken: token });
      }
    );
  });
}

// Manually wrap jwt.verify in a Promise
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
