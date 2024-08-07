import mongoose, { Schema } from "mongoose"

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String, 
            required: [true, "Name is required"!],
            unique: true 
        },
        price: {
            type: Number, 
            required: [true, "Price is required"!]
        },
        stock: {
            type: Number, 
            default: 0, 
            required: [true, "Stock is required"!]
        },
        coverImage: {
            type: String,
            required: true, 
        }, 
        description: {
            type: String
        }, 
        images: [
            {
                type: String, 
            }
        ],
        subCategory: {
            type: Schema.Types.ObjectId,
            ref: "Subcategory", 
            trim: true 
        },
        artisan: {
            type: Schema.Types.ObjectId,
            ref: "Artisan"
        }
    },
    {
        timestamps: true 
    }
)


export const Product = mongoose.model("Product", productSchema)