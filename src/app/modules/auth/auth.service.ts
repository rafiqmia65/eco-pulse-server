import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { ILoginPayload, IRegisterPayload } from "./auth.interface";

/**
 * @desc    Register a new user using email and password
 * @param   Payload - User registration data
 * @returns Newly created user object
 * @throws  AppError if registration fails
 */
const registerUser = async (Payload: IRegisterPayload) => {
  const { name, email, password } = Payload;

  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data?.user) {
    throw new AppError(status.BAD_REQUEST, "User registration failed");
  }

  return data.user;
};

/**
 * @desc    Authenticate user with email and password
 * @param   Payload - User login credentials
 * @returns Auth response including user/session info
 * @throws  AppError if credentials are invalid
 */
const loginUser = async (Payload: ILoginPayload) => {
  const { email, password } = Payload;

  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (!data?.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  return data;
};

/**
 * @desc    Logout user by invalidating session token
 * @param   sessionToken - Current user's session token
 * @returns Logout response from auth provider
 * @throws  AppError if token is missing or logout fails
 */
const logoutUser = async (sessionToken?: string) => {
  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "No session token provided");
  }

  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  return result;
};

export const AuthService = {
  registerUser,
  loginUser,
  logoutUser,
};
