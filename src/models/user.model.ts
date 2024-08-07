import mongoose, { Schema } from "mongoose"
import validator from "validator"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { IUserType } from "../types/types.js"

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String, 
            required: [true, "Username is missing"!],
            unique: true, 
            lowercase: true, 
            trim: true, 
            index: true
        },
        firstName: {
            type: String, 
            required: [true, "First name is required"!],
            validator: validator.isAlpha
        },
        lastName: {
            type: String, 
            required: [true, "Last name is required"!],
            validator: validator.isAlpha
        },
        email: {
            type: String, 
            unique: [true, "Email already exists!"], 
            required: [true, "Email is required"!],
            validator: validator.default.isEmail 
        },
        phone: {
            type: Number, 
            unique: [true, "Phone number already exists!"],
            validator: validator.default.isMobilePhone 
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        dob: {
            type: Date, 
            required: [true, "Date of Birth is required"],
            validator: validator.isDate
        },
        gender: {
            type: String, 
            enum: ["Male", "Female", "Others"],
            required: [true, "Gender is required"]
        },
        avatar: {
            type: String,
        },
        refreshToken: {
            type: String 
        },
        role: {
            type: String, 
            enum: ["admin", "artisan", "user"],
            default: "user"
        }
    }, 
    {
        timestamps: true 
    }
)

const addressSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId, 
            ref: "User",
            required: true 
        },
        address: {
            type: String,
            required: true
        }, 
        city:{
            type: String,
            required: true
        },
        state:{
            type: String,
            required: true
        },
        pincode:{
            type: String,
            required: true
        },
        country:{
            type: String,
            required: true,
            default: "India"
        },
        deliveryInstructions:{
            type: String,
        }
    }, {
        timestamps: true 
    }
)

userSchema.virtual("age").get(function(){
    const today = new Date(); 
    const dob:Date = this.dob ?? new Date(); 
    let age = today.getFullYear() - dob?.getFullYear(); 

    if(today.getMonth() < dob?.getMonth() || today.getMonth() == dob?.getMonth() && today.getDate() < dob?.getDate()) {
        age -= 1; 
    } 
    return age; 
})

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next
    if(!this.password) return; 
    this.password = await bcrypt.hash(this.password, 10); 
    next()
})

userSchema.methods.isPasswordCorrect = async function(password: string) {
    return await bcrypt.compare(password, this.password)
} 

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id, 
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET as string,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id, 
        },
        process.env.REFRESH_TOKEN_SECRET as string,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model<IUserType>("User", userSchema)
export const Address = mongoose.model("Address", addressSchema)