import { NextFunction, Request, Response } from "express";
import { nodeCache } from "../app.js";
import { Address, User } from "../models/user.model.js";
import { UserRequestBodyType } from "../types/types.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { invalidateCache } from "../utils/entityHandler.js";

// USER 
export const registerUser = asyncHandler(async(
    // req,
    req: Request<{}, {}, UserRequestBodyType>, 
    res: Response, 
    next: NextFunction) => {

    // input from frontend 
    let { username, firstName, lastName, email, phone, dob, password, gender, avatar } = req.body
   
    // if user already exists 
    const userExists = await User.findOne({
        $or: [{ username }, { email }] 
    })

    if(userExists) {
        const loggedInUser = await User.findById(userExists._id).select("-lastName -dob -gender -password -refreshToken -__v -createdAt -updatedAt")

        return res.status(200)
            .json(new ApiResponse(200, {
                user: loggedInUser,
            }, `Welcome ${firstName}`))
    }

    // data validation 
    if(
        !(firstName || lastName || email || dob || gender || username)
    ) {
        throw new ApiError(400, "All fields are required!!")
    }   
    if(!password) password = username 

    // creating user in db 
    await User.create({
        username, 
        firstName, 
        lastName, 
        email, 
        phone, 
        dob, 
        gender, 
        avatar, 
        password
    })
    
    // user creation check 
    const createdUser = await User.find({ username })
        .select("-lastName -dob -gender -password -refreshToken -__v -createdAt -updatedAt")

    invalidateCache({ user: true });

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user!")
    } else {
         // returning response 
        return res.status(201).json(
            new ApiResponse(
                201, 
                createdUser, 
                "User Created succesfully!!"
            )
        ) 
    }
})  

export const changePassword = asyncHandler(async(req, res) => {
    // fetching passwords 
    const { oldPassword, newPassword, confirmPassword } = req.body
    
    // // getting current user 
    const user = await User.findById(req?.user) 
    if(!user) {
        throw new ApiError(401, "Invalid request")
    }

    // // current password check 
    const isPasswordValid = user.isPasswordCorrect(oldPassword)

    // // password validation check 
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid old password!")
    }

    if(newPassword !== confirmPassword) {
        throw new ApiError(409, "New password doesn't match with confirmed password!")
    }

    // // changing password in db 
    user.password = newPassword 
    user.save({ validateBeforeSave: false }) 
    invalidateCache({ user: true, userId: req.user});

    // sending success response 
    return res.status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully!"))

})

export const updateAccountDetails = asyncHandler(async(req, res) => {
    // fetching fields to update 
    const { firstName, lastName, phone, email, password, dob, gender } = req.body 
    
    const user = await User.findById(req.user)
    
    // duplicate check 
    try{
        // await isEntityUnique(req.user, email, phone) 
        
    } catch(error) {
        throw error 
    }

    // updating values in db 
    const updatedUserDetails = await User.findByIdAndUpdate(user, {
        $set: {
            firstName, 
            lastName, 
            phone, 
            email, 
            password,
            dob, 
            gender 
        }
    }, {
        new: true 
    }).select("-password -refreshToken -__v -createdAt -updatedAt")
    invalidateCache({ user: true, userId: req.user});

    // returning success response 
    return res.status(200)
        .json(new ApiResponse(200, updatedUserDetails, "User details succesfully updated!"))
    
})

export const updateUserAvatar = asyncHandler(async(req, res) => {
    // fetching avatar 
    const avatarLocalPath= req.file?.path 
    
    // empty check 
    if(!avatarLocalPath) {
        throw new ApiError(401, "Avatar file is missing!")
    }

    // uploading to cloudinary 
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    // avatar upload check 
    if(!avatar || avatar == null) {
        throw new ApiError(500, "Some error while updating avatar!")
    }   
    // todo: delete existing avatar of user from cloudinary - check if it works!!
    const user = await User.findById(req.query.id)
    if(!user) {
        throw new ApiError(404, "User doesn't exist!")
    }
    
    let existingAvatar = user.avatar || ""
    await deleteFromCloudinary(existingAvatar); 
    
    // updating logo in db 
    const updatedUserDetails = await User.findByIdAndUpdate(req.user, {
        $set: {
            avatar: avatar
        }
    }, {
        new: true
    }).select("-password -refreshToken -__v -createdAt -updatedAt")
    invalidateCache({ user: true, userId: req.user});

    // returing response 
    return res.status(200)
        .json(new ApiResponse(200, updatedUserDetails, "Avatar uploaded succesfully!"))

})

// ADMIN
export const fetchUsers = asyncHandler(async(req, res, next) => {
    // fetching all users 
    let users, key = "users"; 
    if(nodeCache.has(key)) {
        users = JSON.parse(nodeCache.get(key) as string); 
    } else {
        users = await User.find({})
        .select("-password -refreshToken -__v");
        nodeCache.set(key, JSON.stringify(users)); 
    }
    
    // returning response 
    return res.status(200).json(
        new ApiResponse(200, users, "All users fetched succesfully!")
    )
})

export const fetchUser = asyncHandler(async(req, res, next) => {
    // input from frontend 
    const id = req.params.id, key = `user-${id}`

    // user check 
    let user; 
    if(nodeCache.has(key)) {
        user = JSON.parse(nodeCache.get(key) as string); 
    } else {
        user = await User.find({ username: id })
        .select("-password -refreshToken -__v");
        if(user.length < 1) 
            throw new ApiError(400, "Invalid user Id")
        nodeCache.set(key, JSON.stringify(user));
    }

    // returning response 
    return res.status(200).json(
        new ApiResponse(200, user[0], "User fetched succesfully!")
    )
})

export const deleteUser = asyncHandler(async(req, res, next) => {
    // input from frontend 
    const id = req.params.id

    // user check 
    const user = await User.findOne({ _id: id })
    if(!user) {
        throw new ApiError(400, "Invalid user Id")
    }
    
    // deleting image & user in server 
    await deleteFromCloudinary(user?.avatar); 
    await User.findByIdAndDelete(user._id); 
    invalidateCache({ user: true, userId: id});

    // returning response 
    return res.status(200).json(
        new ApiResponse(200, {}, "User deleted succesfully!")
    )
})


export const registerUserAddress = asyncHandler(async(req, res) => {
    // input from frontend 
    const { address, city, state, pincode, country, deliveryInstructions } = req.body 

    const user = await User.findById(req.query.id)

    // fields check 
    if(!(address || city || state || pincode || country)) {
        throw new ApiError(409, "Required fields to add address is missing!")
    }

    // creating address in db
    const createdAddress = await Address.create({
        address, 
        city,
        state, 
        pincode,
        country, 
        deliveryInstructions,
        user
    })

    // returning response 
    return res.status(200)
        .json(new ApiResponse(200, createdAddress, "Address created succesfully!"))

})  

export const fetchUserAddresses = asyncHandler(async(req, res) => {
    // retrieving user's address from db  
    const user = await User.findById(req.query.id)

    const addresses = await Address.find({ user }) 

    // returing response 
    return res.status(200) 
        .json(new ApiResponse(200, addresses, "User's address fetched succesfully!"))
})
