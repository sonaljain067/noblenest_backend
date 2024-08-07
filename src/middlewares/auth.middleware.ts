import { User } from "../models/user.model.js";
import { ApiError, asyncHandler } from "../utils/ApiHandler.js";

export const isAdmin = asyncHandler(async(req, res, next) => {
    const { id } = req.query 
    if(!id) 
        throw new ApiError(401, "Please login to access!")

    const user = await User.findById(id); 
    
    if(!user) 
        throw new ApiError(404, "User not found!")
    
        
    if(user.role !== "admin") 
        throw new ApiError(401, "Unauthorized Access")

    next();
})

export const isArtisan = asyncHandler(async(req, res, next) => {
    const { id } = req.query
    if(!id) 
        throw new ApiError(401, "Please login to access!")

    const user = await User.findById(id); 
    if(!user) 
        throw new ApiError(401, "Invalid user")
        
    if(user.role !== "artisan") 
        throw new ApiError(401, "Unauthorized Access")

    next();
})

export const isArtisanOrAdmin = asyncHandler(async(req, res, next) => {
    const { id } = req.query
    if(!id) 
        throw new ApiError(401, "Please login to access!")

    const user = await User.findById(id); 
    if(!user) 
        throw new ApiError(401, "Invalid user")
        
    if(user.role == "user") 
        throw new ApiError(401, "Unauthorized Access")

    next();
})

export const verifyJWT = asyncHandler(async(req, res, next) => {
    const { id } = req.query
    
    if(!id) 
        throw new ApiError(401, "Please login to access!")

    const user = await User.findById(id); 
    if(!user) 
        throw new ApiError(401, "Invalid user")
        
    next();
})