import { Router } from 'express';
import { applyDiscount, registerCoupon } from '../controllers/helper.controller.js';
import { isAdmin, verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT); 

// Coupon
router.route("/coupon").get(applyDiscount).post(isAdmin, registerCoupon)

export default router; 