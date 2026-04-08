import { Router } from "express";
import AuthRoutes from "../modules/auth/auth.routes";
import UserRoutes from "../modules/user/user.route";

const indexRoutes: Router = Router();

// Mount the AuthRoutes under the /auth path
indexRoutes.use("/auth", AuthRoutes);

indexRoutes.use("/user", UserRoutes);

export default indexRoutes;
