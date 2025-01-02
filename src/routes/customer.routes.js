import { Router } from "express";
import {
  addCustomer,
  deleteCustomer,
  editCustomer,
  getAllCustomers,
} from "../controllers/customer.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/add-customer").post(verifyJWT, addCustomer);
router.route("/delete-customer/:customerId").delete(verifyJWT, deleteCustomer);
router.route("/edit-customer/:customerId").put(verifyJWT, editCustomer);
router.route("/customers-list").get(verifyJWT, getAllCustomers);

export default router;
