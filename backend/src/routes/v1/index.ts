import express from "express";
import statsRoutes from "../../domain/stats/stats.router";
import reportsRoutes from "../../domain/reports/report.router";

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("API v1 is working!");
});

router.use("/stats", statsRoutes);
router.use("/reports", reportsRoutes);

export default router;
