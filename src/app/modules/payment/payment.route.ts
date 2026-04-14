import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const PaymentRoutes: Router = Router();

/**
 * @desc Get all purchased ideas for the authenticated user
 * @route GET /api/payments/my-purchases-ideas
 * @access Private (Authenticated users)
 */
PaymentRoutes.get(
  "/my-purchases-ideas",
  checkAuth(Role.MEMBER),
  PaymentController.getMyPurchasedIdeas,
);

/**
 * @desc Get details of a specific purchased idea for the authenticated user
 * @route GET /api/payments/my-purchases-ideas/:ideaId
 * @access Private (Authenticated users)
 */
PaymentRoutes.get(
  "/my-purchases-ideas/:ideaId",
  checkAuth(Role.MEMBER),
  PaymentController.getMyPurchasedIdeaDetails,
);

/** * @desc Handle Stripe webhook events for payment processing
 * @route POST /api/payments/webhook
 * @access Public (Stripe will call this endpoint)
 */
PaymentRoutes.post(
  "/idea/:ideaId",
  checkAuth(Role.MEMBER),
  PaymentController.createIdeaPurchase,
);

export default PaymentRoutes;
