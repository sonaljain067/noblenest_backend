import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError }from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { isValidEmail } from "../utils/validateEmail.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async(req, res) => {
    // input from frontend 
    const { username, firstName, lastName, phoneNumber, email, password} = req.body 


    // data validation 
    if(
        [firstName, email, username, password, lastName, phoneNumber].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required!!")
    }

    const isEmailValid = isValidEmail(email)
    if(!isEmailValid) {
        throw new ApiError(400, "Please enter correct email address!")
    } 

    // if user already exists 
    const userExists = await User.findOne({
        $or: [{ username }, { email }] 
    })
    if(userExists) {
        throw new ApiError(409, "User with email / username already exists!")
    }

    // avatar file validation 
    const avatarLocalPath = req.files?.avatar[0]?.path 

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required!!")
    }


    // uploading avatar on cloudinary 
    const avatar = await uploadOnCloudinary(avatarLocalPath) 
    
    if(!avatar){
        throw new ApiError(500, "Avatar cannot be uploaded to cloudinary!")
    }

    // creating user in db 
    const user = await User.create({
        email, 
        firstName,
        lastName, 
        username: username.toLowerCase(),  
        password, 
        phoneNumber,
        avatar: avatar?.url,
    })

    // user creation check 
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    // returning response 
    return res.status(201).json(
        new ApiResponse(
            200, 
            createdUser, 
            "User Created succesfully!!"
        )
    ) 


})

export { registerUser }