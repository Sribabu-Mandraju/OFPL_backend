import express from "express";
import { addAllowedToken, deleteAllowedToken, getAllowedTokens, getAllowedToken } from "../controllers/tokens.controllers.js";

const router = express.Router();

router.post("/add-allowed-token", addAllowedToken);
router.delete("/delete-allowed-token", deleteAllowedToken);
router.get("/get-allowed-tokens", getAllowedTokens);
router.get("/get-allowed-token/:tokenAddress", getAllowedToken);

export default router;
