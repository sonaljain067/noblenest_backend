import { Router } from "express";
import { deleteProduct, fetchProductDetails, fetchProducts, latestProducts, registerProduct, updateProduct } from "../controllers/product.controller.js";
import { isArtisanOrAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router(); 

// user routes 
router.route("/").get(fetchProducts);

router.route("/latest").get(latestProducts); 

router.route("/:id").get(fetchProductDetails);

// artisan
router.route("/").post(verifyJWT, isArtisanOrAdmin, upload.fields([
    {
        name: "coverImage",
        maxCount: 1
    }, 
    {
        name: "images",
        maxCount: 10
    }
]), registerProduct); 

router.route("/:id")
    .patch(verifyJWT, isArtisanOrAdmin, upload.single("coverImage"), updateProduct)
    .delete(verifyJWT, isArtisanOrAdmin, upload.none(), deleteProduct);

export default router; 