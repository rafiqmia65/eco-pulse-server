import status from "http-status";
import { Request, Response } from "express";

import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";

const registerUser = async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await AuthService.registerUser(payload);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "User registered successfully",
    data: result,
  });
};

const loginUser = async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await AuthService.loginUser(payload);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
};

export const AuthController = {
  registerUser,
  loginUser,
};
