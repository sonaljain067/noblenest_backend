import mongoose, { Schema } from "mongoose"

const couponSchema = new Schema(
    {
        code: {
            type: String,
            required: [true, "Please enter Coupon Code!"]
        },
        amount: {
            type: Number, 
            required: [true, "Please enter Coupon amount!"]
        }
    }, {
        timestamps: true
    }
)

export const Coupon = mongoose.model("Coupon", couponSchema)
