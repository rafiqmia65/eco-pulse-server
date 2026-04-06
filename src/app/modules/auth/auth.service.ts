import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { IRegisterPatientPayload } from "./auth.interface";

const registerUser = async (Payload: IRegisterPatientPayload) => {
  // Implement the logic to register a user
  const { name, email, password } = Payload;

  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data.user) {
    // throw new Error("Failed to register patient");
    throw new AppError(status.BAD_REQUEST, "Failed to register patient");
  }

  return data.user;
};

export const AuthService = {
  registerUser,
};
