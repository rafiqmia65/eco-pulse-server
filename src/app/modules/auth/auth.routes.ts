import { Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const AuthRoutes: Router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
AuthRoutes.post("/register", AuthController.registerUser);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and create session
 * @access  Public
 */
AuthRoutes.post("/login", AuthController.loginUser);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
AuthRoutes.post(
  "/logout",
  checkAuth(Role.ADMIN, Role.MEMBER),
  AuthController.logoutUser,
);

export default AuthRoutes;
