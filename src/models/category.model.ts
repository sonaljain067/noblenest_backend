import mongoose, { Schema } from "mongoose"

const categorySchema = new Schema(
    {
        name: {
            type: String, 
            required: true,
            unique: true 
        },
        description: {
            type: String 
        }
    }, {
        timestamps: true 
    }
)

const subcategorySchema = new Schema(
    {
        name: {
            type: String, 
        },
        description: {
            type: String 
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        }
    }, {
        timestamps: true 
    }
)

export const SubCategory = mongoose.model("Subcategory", subcategorySchema)

export const Category = mongoose.model("Category", categorySchema)