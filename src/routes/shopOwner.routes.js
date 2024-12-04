import { Router } from "express";
import {
  registerShopOwner,
  loginShopOwner,
  logoutShopOwner,
  refreshAccessToken,
} from "../controllers/shopOwner.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "shopOwnerPhoto",
      maxCount: 1,
    },
  ]),
  registerShopOwner
);

router.route("/login").post(loginShopOwner);

// secured routes
router.route("/logout").post(verifyJWT, logoutShopOwner);
router.route("/refresh-token").post(refreshAccessToken);
export default router;
