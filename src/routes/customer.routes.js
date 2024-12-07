import { Router } from "express";
import { addCustomer } from "../controllers/customer.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/add-customer").post(verifyJWT, addCustomer);

export default router;
