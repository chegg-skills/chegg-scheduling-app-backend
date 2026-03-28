import express from "express";
import * as configController from "./config.controller";

const router = express.Router();

router.get("/timezones", configController.getTimezones);
router.get("/countries", configController.getCountries);
router.get("/languages", configController.getLanguages);

export default router;
