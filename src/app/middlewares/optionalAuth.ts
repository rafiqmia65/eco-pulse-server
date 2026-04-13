/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { CookieUtils } from "../utils/cookie";
import { UserStatus } from "../../../generated/prisma/enums";

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // -----------------------------
    // 1. GET SESSION TOKEN
    // -----------------------------
    const sessionToken = CookieUtils.getCookie(
      req,
      "better-auth.session_token",
    );

    if (sessionToken) {
      const sessionExists = await prisma.session.findFirst({
        where: {
          token: sessionToken,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (sessionExists?.user) {
        const user = sessionExists.user;

        if (
          user.status !== UserStatus.BLOCKED &&
          user.status !== UserStatus.DELETED &&
          !user.isDeleted
        ) {
          req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
          };

          return next();
        }
      }
    }

    // -----------------------------
    // 2. FALLBACK: ACCESS TOKEN
    // -----------------------------
    const accessToken = CookieUtils.getCookie(req, "accessToken");

    if (accessToken) {
      const decoded = JSON.parse(
        Buffer.from(accessToken.split(".")[1], "base64").toString(),
      );

      if (decoded?.id) {
        req.user = {
          userId: decoded.id,
          role: decoded.role,
          email: decoded.email,
        };
      }
    }

    // -----------------------------
    // 3. NO USER = STILL ALLOW REQUEST
    // -----------------------------
    return next();
  } catch (error) {
    req.user = undefined;
    return next();
  }
};
