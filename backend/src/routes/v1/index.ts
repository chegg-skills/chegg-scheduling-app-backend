import express from "express";
import statsRoutes from "../../domain/stats/stats.router";
import reportsRoutes from "../../domain/reports/report.router";
import trackerRoutes from "../../domain/tracker/tracker.router";

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("API v1 is working!");
});

router.use("/stats", statsRoutes);
router.use("/reports", reportsRoutes);
router.use("/tracker", trackerRoutes);

export default router;
