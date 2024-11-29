import { Router } from "express";
import { registerShopOwner } from "../controllers/shopOwner.controller.js";

const router = Router();

router.route("/register").post(registerShopOwner);

export default router;
