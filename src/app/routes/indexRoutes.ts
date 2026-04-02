import { Router } from "express";
import AuthRoutes from "../modules/auth/auth.routes";

const indexRoutes: Router = Router();

// Mount the AuthRoutes under the /auth path
indexRoutes.use("/auth", AuthRoutes);

export default indexRoutes;
