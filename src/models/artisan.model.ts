import mongoose, { Schema } from "mongoose"

const artisanSchema = new Schema(
    {
       user: {
        type: Schema.Types.ObjectId, 
        ref: "User"
       }, 
       businessName: {
        type: String,
        required: true
       },
       businessAddress: {
        type: String
       },
       description: {
        type: String
       },
       logo: {
        type: String
       },
       about: {
        type: String,
        required: true
       }
    }, {
        timestamps: true
    }
)

export const Artisan = mongoose.model("Artisan", artisanSchema)