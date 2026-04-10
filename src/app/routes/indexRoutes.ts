import { Router } from "express";
import AuthRoutes from "../modules/auth/auth.routes";
import UserRoutes from "../modules/user/user.route";
import categoryRoutes from "../modules/category/category.route";
import ideaRoutes from "../modules/idea/idea.route";
import adminRoutes from "../modules/admin/admin.routes";

const indexRoutes: Router = Router();

// Mount the AuthRoutes under the /auth path
indexRoutes.use("/auth", AuthRoutes);

// Mount the UserRoutes under the /users path
indexRoutes.use("/users", UserRoutes);

// Mount the categoryRoutes under the /categories path
indexRoutes.use("/categories", categoryRoutes);

// Mount the ideaRoutes under the /ideas path
indexRoutes.use("/ideas", ideaRoutes);

// Mount the adminRoutes under the /admin path
indexRoutes.use("/admin", adminRoutes);

export default indexRoutes;
