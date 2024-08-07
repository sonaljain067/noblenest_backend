import mongoose, { Schema } from "mongoose"

const orderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId, 
            ref: "User",
            required: true
        }, 
        orderItems: [
            {
                quantity: Number, 
                product: {
                    type: Schema.Types.ObjectId,
                    ref: "Product"
                }
            }
        ], 
        address: {
            type: Schema.Types.ObjectId,
            ref: "Address",
            required: true
        },
        subTotal: {
            type: Number,
            required: true
        },
        tax: {
            type: Number,
            default: 0, 
            required: true
        }, 
        shippingCharges: {
            type: Number,
            default: 0, 
            required: true
        }, 
        discount: {
            type: Number,
            default: 0, 
            required: true
        }, 
        total: {
            type: Number,
            required: true 
        },
        status: {
            type: String, 
            enum: ["Processing", "Shipped", "Delivered", "Failed", "Cancelled", "Paid"], 
            default: "Processing"
        }, 
        rzpOrder: {
            type: String, 
        }, 
        rzpPayment: {
            type: String, 
        }
    }, {
        timestamps: true 
    }
)

export const Order = mongoose.model("Order", orderSchema)