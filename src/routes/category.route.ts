import { Router } from "express";
import { fetchCategories, fetchSubCategories } from "../controllers/category.controller.js";

const router = Router();

// user 
router.route("/").get(fetchCategories)

router.route("/sub").get(fetchSubCategories)

export default router; 