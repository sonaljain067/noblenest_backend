import { Router } from "express";
import { fetchCategories, fetchCategorySubCategories, fetchSubCategories } from "../controllers/category.controller.js";

const router = Router();

// user 
router.route("/").get(fetchCategories)

router.route("/sub").get(fetchSubCategories)

router.route("/cat/sub/:id").get(fetchCategorySubCategories)

export default router; 