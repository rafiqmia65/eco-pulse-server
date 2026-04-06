import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { ILoginPayload, IRegisterPayload } from "./auth.interface";

const registerUser = async (Payload: IRegisterPayload) => {
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

const loginUser = async (Payload: ILoginPayload) => {
  const { email, password } = Payload;

  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (!data.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  return data;
};

export const AuthService = {
  registerUser,
  loginUser,
};
