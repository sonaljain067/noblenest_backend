import { Router } from 'express';
import { deleteUserOrder, fetchAllOrders, fetchUserOrder, fetchUserOrders, processOrder, registerRzpOrder, registerUserOrder } from '../controllers/order.controller.js';
import { isAdmin, verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.use(verifyJWT); 

// user 
router.route("/").post(upload.none(), registerUserOrder).get(fetchUserOrders); 

router.route("/all").get(isAdmin, fetchAllOrders)

router.route("/order").post(registerRzpOrder);

router.route("/:id").get(fetchUserOrder).delete(isAdmin, deleteUserOrder).patch(isAdmin, processOrder); 


export default router; 