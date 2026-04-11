import { Router } from "express";
import { WatchListController } from "./watchList.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const WatchListRoutes: Router = Router();

/**
 * @desc Toggle idea in watchList (add/remove)
 * @route POST /api/v1/watchlist/toggle/:id
 * @access Private (Member)
 */
WatchListRoutes.post(
  "/toggle/:id",
  checkAuth(Role.MEMBER),
  WatchListController.toggleWatchList,
);

/**
 * @desc Get my watchlist
 * @route GET /api/v1/watchlist
 * @access Private (Member)
 */
WatchListRoutes.get(
  "/",
  checkAuth(Role.MEMBER),
  WatchListController.getMyWatchList,
);

export default WatchListRoutes;
