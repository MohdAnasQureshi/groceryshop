import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addTransaction,
  deleteTransaction,
  editTransaction,
  getCustomerTransactions,
} from "../controllers/transaction.controller.js";

const router = Router();

router.route("/add-transaction/:customerId").post(verifyJWT, addTransaction);
router
  .route("/all-transactions/:customerId")
  .get(verifyJWT, getCustomerTransactions);
router
  .route("/edit-transaction/:customerId/:transactionId")
  .put(verifyJWT, editTransaction);
router
  .route("/delete-transaction/:customerId/:transactionId")
  .delete(verifyJWT, deleteTransaction);

export default router;
