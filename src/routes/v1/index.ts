import express from "express";

const router = express.Router();


router.get("/", (req, res) => {
  res.send("API v1 is working!");
});



export default router;
