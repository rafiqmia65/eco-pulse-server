import status from "http-status";
import AppError from "../../helpers/errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { ILoginPayload, IRegisterPayload } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { UserStatus } from "../../../../generated/prisma/enums";
import { tokenUtils } from "../../utils/token";

/**
 * @desc    Register a new user using email and password
 * @param   Payload - User registration data
 * @returns Newly created user object
 * @throws  AppError if validation or registration fails
 */
const registerUser = async (Payload: IRegisterPayload) => {
  const { name, email, password } = Payload;

  // Required field validation
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new AppError(
      status.BAD_REQUEST,
      "Name, email, and password are required",
    );
  }

  // Password strength validation
  if (password.length < 8) {
    throw new AppError(
      status.BAD_REQUEST,
      "Password must be at least 8 characters long",
    );
  }

  // Check existing user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "Email is already registered");
  }

  // Create user via Better Auth
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

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

/**
 * @desc    Authenticate user with email and password
 * @param   Payload - User login credentials
 * @returns Auth response including user/session info
 * @throws  AppError if validation or authentication fails
 */

const loginUser = async (Payload: ILoginPayload) => {
  const { email, password } = Payload;

  // Required validation
  if (!email?.trim() || !password?.trim()) {
    throw new AppError(status.BAD_REQUEST, "Email and password are required");
  }

  // Get user from DB
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // User not found
  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  // Deleted user check
  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(status.FORBIDDEN, "This account has been deleted");
  }

  // Blocked user check
  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account has been blocked. Please contact support",
    );
  }

  // Inactive / not active check
  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(status.FORBIDDEN, "Your account is not active");
  }

  // Authenticate with Better Auth
  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (!data?.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  const accessToken = tokenUtils.getAccessToken({
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
    name: data.user.name,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
    name: data.user.name,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    ...data,
    accessToken,
    refreshToken,
  };
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

  if (!result) {
    throw new AppError(status.BAD_REQUEST, "Logout failed");
  }

  return result;
};

/**
 * @desc    Get current logged-in user info
 * @param   userId - User ID from session/token
 * @returns User object with selected fields
 * @throws  AppError if user not found
 */
const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },

    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

export const AuthService = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
};
