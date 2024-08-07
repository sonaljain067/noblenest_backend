import { v2 as cloudinary} from "cloudinary"
import { ApiError } from "./ApiHandler.js"
import fs from "fs"; 

export const uploadOnCloudinary = async (localFilePath: string): Promise<string | null> =>{
    try{
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        })
    } catch(err) {
        throw new ApiError(500, `Couldn't configure cloudinary `)
    }
    try{
        if(!localFilePath) {
            throw new ApiError(400, "Local file path is missing to upload on cloudinary!")
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        if(localFilePath){
            fs.unlinkSync(localFilePath) 
        }
        return response.secure_url
    } catch(err) {
        console.log(err)
        if(localFilePath){
            fs.unlinkSync(localFilePath) 
        }
        return null  
    }
}

export const deleteFromCloudinary = async(avatarFilePath: string) => {
    try{
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        })
    } catch(err) {
        throw new ApiError(500, `Couldn't configure cloudinary ${err}`)
    }
    try{
        await cloudinary.uploader.destroy(avatarFilePath)
        .then((response) => {return response; })
        .catch((err) => {return err;});
    } catch(err) {
        throw new ApiError(500, `Error while deleting file from cloudinary! ${err}`)
    }
}