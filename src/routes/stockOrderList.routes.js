import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addStockList,
  deleteStockList,
  editStockList,
  getAllStockLists,
} from "../controllers/stockOrderList.controller.js";
const router = Router();
router.use(verifyJWT);
router.route("/add-stockList").post(addStockList);
router.route("/delete-stockList/:stockListId").delete(deleteStockList);
router.route("/edit-stockList/:stockListId").put(editStockList);
router.route("/all-stockLists").get(getAllStockLists);
export default router;
