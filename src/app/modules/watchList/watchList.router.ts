import { Router } from "express";
import { WatchListController } from "./watchList.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const WatchListRoutes: Router = Router();

/**
 * @desc Add idea to watchList
 * @route POST /api/v1/watchList/:id
 * @access Private (Member)
 */
WatchListRoutes.post(
  "/:id",
  checkAuth(Role.MEMBER),
  WatchListController.addToWatchList,
);

export default WatchListRoutes;
