import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addTransaction } from "../controllers/transaction.controller.js";

const router = Router();

router.route("/add-transaction/:customerId").post(verifyJWT, addTransaction);

export default router;
