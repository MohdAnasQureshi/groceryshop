import { Router } from "express";
import customerRouter from "./customer.routes.js";
import transactionRouter from "./transaction.routes.js";
import {
  registerShopOwner,
  loginShopOwner,
  logoutShopOwner,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentShopOwner,
  updateShopOwnerDetails,
  updateShopOwnerPhoto,
  forgotPassword,
  resetPassword,
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
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-shopOwner").get(verifyJWT, getCurrentShopOwner);
router.route("/update-account").patch(verifyJWT, updateShopOwnerDetails);
router
  .route("/change-shopOwnerPhoto")
  .patch(verifyJWT, upload.single("shopOwnerPhoto"), updateShopOwnerPhoto);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

router.use("/customers", customerRouter);
router.use("/transactions", transactionRouter);
export default router;
