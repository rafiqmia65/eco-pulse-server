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

export const AuthController = {
  registerUser,
};
