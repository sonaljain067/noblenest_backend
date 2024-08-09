import { Router } from "express";
import { changePassword, deleteUser, fetchUser, fetchUserAddresses, fetchUsers, registerUser, registerUserAddress, updateAccountDetails, updateUserAvatar } from "../controllers/user.controller.js";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router(); 

// non-user routes 
router.post("/login", upload.single("avatar"), registerUser); 

router.route("/change-password").patch(verifyJWT, changePassword)

router.route("/account-details").patch(verifyJWT, updateAccountDetails);

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/address").post(verifyJWT, registerUserAddress).get(verifyJWT, fetchUserAddresses)


// admin only routes 
router.route("/:id").delete(verifyJWT, isAdmin, deleteUser); 

router.route("/").get(verifyJWT, isAdmin, fetchUsers); 

// both 
router.route("/:id").get(fetchUser).delete(isAdmin, deleteUser); 


export default router; 

