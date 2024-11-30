import { Router } from "express";
import { registerShopOwner } from "../controllers/shopOwner.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();

router.route("/register").post(
  upload.single({
    name: "shopOwnerPhoto",
    maxCount: 1,
  }),
  registerShopOwner
);

export default router;
