import { Request, Response } from "express";
import { checkAccessToken, generateTokens } from "../../util/auth";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import hash from "../../util/hash";
import User from "../../models/user.model";
import UserToken from "../../models/user-token.model";
import { sendForgotEmail } from "../../provider/send-mail";

const ADMIN_CREATE_KEY = process.env.ADMIN_CREATE_KEY || "admin";

export const createUser = async (req: Request, res: Response) => {
  console.log(req,"====req===============")
  try {
    const { username, email, password, token } = req.body;

    if (token.trim() !== ADMIN_CREATE_KEY.trim()) {
      return res.sendError(res, "ERR_INVALID_ADMIN_TOKEN");
    }
console.log(email,"email=========")
    const emailExists = await User.findOne({ where: { email } });

console.log(emailExists,"emailex=========")

    if (emailExists) {
      return res.sendError(res, "ERR_AUTH_USERNAME_OR_EMAIL_ALREADY_EXIST");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userCreated = {
      username,
      email,
      password: hashedPassword,
    };

    const user = await User.create(userCreated);
    const { accessToken } = await generateTokens(user.dataValues.id);
    return res.sendSuccess(res, { user, accessToken });
  } catch (error: any) {
    console.log(error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.sendError(res, "Email and password are required");
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.sendError(res, "Email Not Found");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.sendError(res, "Password Not Matched");
    }

    const { id, username, role } = user;

    const { accessToken } = await generateTokens(id);

    return res.sendSuccess(res, {
      user: {
        id,
        username,
        email,
        role,
      },
      accessToken,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      return res.sendError(res, "ERR_AUTH_WRONG_USERNAME_OR_PASSWORD");
    }

    let resetToken = crypto.randomBytes(32).toString("hex");
    let token = await UserToken.findOne({ where: { user_id: user.id } });
    if (!token) {
      await UserToken.create({
        user_id: user.id,
        token: resetToken,
        createdAt: Date.now(),
      });
    } else {
      await UserToken.update(
        { token: resetToken },
        {
          where: {
            id: token.id,
          },
        }
      );
    }
    const link = `${process.env.ADMIN_URL}/reset-password?token=${resetToken}`;

    sendForgotEmail(link, user.email);
    return res.send({
      success: true,
      message: "Forgot password email has been send",
    });
  } catch (error: any) {
    console.error(error);
    return res.sendError(res, error.message);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const userToken = await UserToken.findOne({
      where: { token: req.body.token },
    });
    if (!userToken) {
      return res.sendError(res, "Invalid or expired token. Please request a new password reset link.");
    }
    await UserToken.destroy({ where: { id: userToken.id } });
    await User.update(
      {
        password: await hash.generate(req.body.password),
      },
      {
        where: {
          id: userToken.user_id,
        },
      }
    );
    return res.send({ status: true, message: "Password changed successfully" });
  } catch (error: any) {
    console.error(error);
    return res.sendError(res, error.message);
  }
};


