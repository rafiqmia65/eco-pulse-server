import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../../generated/prisma/enums";

const PaymentRoutes: Router = Router();


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
