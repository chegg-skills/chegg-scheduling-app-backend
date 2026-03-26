import express from "express";
import * as configController from "./config.controller";

const router = express.Router();

router.get("/timezones", configController.getTimezones);

export default router;
