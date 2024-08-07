import { Coupon } from "../models/helper.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHandler.js";

// Coupon 
export const registerCoupon = asyncHandler(async(req, res, next) => {
    const { code, amount } = req.body   

    if(!(code || amount)) {
        throw new ApiError(400, "Code / Amount is missing!")
    }
    
    const coupon = await Coupon.create({
        code, 
        amount
    }); 

    return res.status(201).json(new ApiResponse(200, coupon, `Coupon ${code} created succesfully!`))
})

export const applyDiscount = asyncHandler(async(req, res, next) => {
    const { coupon } = req.query 

    if(!coupon) {
        throw new ApiError(400, "Invalid coupon code!")
    }
    
    const couponExists = await Coupon.findOne({code: coupon}); 

   if(!couponExists){
    throw new ApiError(404, "No such coupon exists!"); 
   }

    return res.status(201).json(new ApiResponse(200, couponExists.amount, `Coupon ${coupon} applied succesfully!`))
})
