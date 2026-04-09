import { Router } from "express";
import AuthRoutes from "../modules/auth/auth.routes";
import UserRoutes from "../modules/user/user.route";
import categoryRoutes from "../modules/category/category.route";

const indexRoutes: Router = Router();

// Mount the AuthRoutes under the /auth path
indexRoutes.use("/auth", AuthRoutes);

// Mount the UserRoutes under the /users path
indexRoutes.use("/users", UserRoutes);

// Mount the categoryRoutes under the /categories path
indexRoutes.use("/categories", categoryRoutes);

export default indexRoutes;
