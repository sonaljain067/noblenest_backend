import { nodeCache } from "../app.js";
import { Category, SubCategory } from "../models/category.model.js";
import { ApiResponse, asyncHandler } from "../utils/ApiHandler.js";

// USER
export const fetchCategories = asyncHandler(async(req, res) => {
    // fetching all categories 
    let categories, key ="categories"; 
    if(nodeCache.has(key)){
        categories = JSON.parse(nodeCache.get(key) as string); 
    } else {
        categories = await Category.find().select("-createdAt -updatedAt -__v");
        nodeCache.set(key, JSON.stringify(categories)); 
    }

    // returing response 
    return res.status(200)
        .json(new ApiResponse(200, categories, "All categories fetched succesfully!"))
})

export const fetchCategorySubCategories = asyncHandler(async(req, res) => {
    // fetching from frontend 
    const categoryId = req.params.id 
    let subCategories; 
    if(categoryId) {
        // fetching category 
        const category = await Category.findById(categoryId)

        // fetching all subcategories of a category 
        subCategories = await SubCategory.find({ category }).select("-createdAt -updatedAt -__v");
    }
    
    else {
        subCategories = await SubCategory.find().select("-createdAt -updatedAt -__v");
    }
    // returning response 
    return res.status(200)
        .json(new ApiResponse(200, subCategories, "All subcategories fetched succesfully!"))

})

export const fetchSubCategories = asyncHandler(async(req, res) => {
    // fetching subcategory id 
    let subcategories, key = "subcategories"; 
    if(nodeCache.has(key)){
        subcategories = JSON.parse(nodeCache.get(key) as string); 
    } else {
        subcategories = await SubCategory.find().select("-createdAt -updatedAt -__v");
        nodeCache.set(key, JSON.stringify(subcategories));
    }

    // returing response 
    return res.status(200)
        .json(new ApiResponse(200, subcategories, "All subcategories fetched succesfully!"))
})