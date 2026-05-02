import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import spotsRouter from "./spots";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import waitlistRouter from "./waitlist";
import payoutsRouter from "./payouts";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(spotsRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(waitlistRouter);
router.use(payoutsRouter);
router.use(analyticsRouter);

export default router;
