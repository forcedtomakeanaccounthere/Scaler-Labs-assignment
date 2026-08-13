import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import jobsRouter from "./jobs.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/jobs", jobsRouter);

export default router;
