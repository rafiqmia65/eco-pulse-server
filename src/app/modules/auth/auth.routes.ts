import { Router } from "express";
import { AuthController } from "./auth.controller";

const AuthRoutes: Router = Router();

AuthRoutes.post("/register", AuthController.registerUser);
AuthRoutes.post("/login", AuthController.loginUser);

export default AuthRoutes;
