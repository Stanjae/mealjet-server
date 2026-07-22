import { authenticate } from "@shared/middleware/auth.middleware";
import { Router } from "express";
import * as walletController from "./wallet.controller";

const router = Router();

router.post("/create-wallet", authenticate, walletController.createWallet);

export default router;
