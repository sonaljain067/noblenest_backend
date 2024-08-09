import { NextFunction, Request, Response } from "express";
import { nodeCache } from "../app.js";
import { Artisan } from "../models/artisan.model.js";
import { SubCategory } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { ProductBaseQueryType, ProductRequestBodyType, SearchRequestBodyType } from "../types/types.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { invalidateCache } from "../utils/entityHandler.js";

// USER 
export const fetchProducts = asyncHandler(async(
    req: Request<{}, {}, {}, SearchRequestBodyType>, 
    res, next
    ) => {
    const { search, sort, price, subCategory, category} = req.query  
    const page = Number(req.query.page) || 1; 
    
    const productLimitPerPage = Number(process.env.PRODUCT_PER_PAGE) || 7;
    const skipProducts = productLimitPerPage * (page - 1); 
    
    const baseQuery: ProductBaseQueryType = {};
    if(search) {
        baseQuery.name = {
            $regex: search, 
            $options: "i"
        }
    }
    if(price) {
        baseQuery.price = {
            $lte: Number(price) 
        }
    }
    if(subCategory) {
        baseQuery.subCategory = subCategory
    }

    let productPromise = await Product.find()
        .populate({
            path: 'subCategory',
            model: 'Subcategory',
            select: "-createdAt -updatedAt -__v",
            populate: {
                path: 'category', 
                model: 'Category', 
                select: "-createdAt -updatedAt -__v"
            }
        })
        .find(baseQuery)
        .sort(sort && { price: sort == "asc" ? 1 : -1 })
        .limit(productLimitPerPage).skip(skipProducts)
        .select("-__v -createdAt -updatedAt"); 
        
    if(category) {
        productPromise = productPromise.filter((product: any) => product.subCategory && product.subCategory.category && product.subCategory.category._id != "" &&  product.subCategory.category.equals(category))
    }
    
    const [ products, filteredProducts ] = await Promise.all([
        productPromise, await Product.find(baseQuery)
    ])
    const totalPages = Math.ceil(filteredProducts.length / productLimitPerPage); 
    return res.status(200).json(
        new ApiResponse(200, {products, totalPages}, "All Products fetched succesfully!")
    )
})

export const fetchProductDetails = asyncHandler(async(req, res, next) => {
    const id = req.params.id 
    let product;

    if(nodeCache.has(`product-${id}`)) 
        product = JSON.parse(nodeCache.get(`product-${id}`) as string); 
    else { 
        product = await Product.findById(id)
            
            .populate({
                path: 'artisan',
                model: 'Artisan',
                select: "-createdAt -updatedAt -__v"
            })
            .populate({
                path: 'subCategory',
                model: 'Subcategory',
                select: "-createdAt -updatedAt -__v",
                populate: {
                    path: 'category', 
                    model: 'Category', 
                    select: "-createdAt -updatedAt -__v"
                }
            })
            .select("-createdAt -updatedAt -__v");
            
        if(!product) 
            throw new ApiError(400, "Invalid Product Id")
    }
    return res.status(200).json(
        new ApiResponse(200, product, "Product fetched succesfully!")
    )
})

export const latestProducts = asyncHandler(async(req, res, next) => {
    let products = []; 
    if(nodeCache.has("latest-products")) 
        products = JSON.parse(nodeCache.get("latest-products") as string);
    else {
        const products = await Product.find({}).select("-__v").sort({createdAt: -1}).limit(6); 

        nodeCache.set("latest-products", JSON.stringify(products)); 
    }

    return res.status(200).json(
        new ApiResponse(200, products, "Latest Products fetched succesfully!")
    )
})

// ARTISAN 
export const registerProduct = asyncHandler(async(
    req: Request<{}, {}, ProductRequestBodyType>, 
    res: Response, 
    next: NextFunction) => {

    // input from frontend 
    const { name, price, stock, description, subcategory } = req.body
    const { id } = req.query

    // data validation 
    if(
        !name || !price || !stock || !subcategory
    ) {
        throw new ApiError(400, "All fields are required!!")
    }  

    const productExists = await Product.findOne({name})
    if(productExists) {
        throw new ApiError(401, "Product already exists!")
    }
    let imagesArr: (string | null)[] = []
    let coverImage: (string | null) = ""

    const user = await User.findById(id) 
    
    if(!user) {
        throw new ApiError(401, "Invalid user")
    }
    
    let artisan = await Artisan.findOne({ user })
    if(!artisan) {
        artisan = await Artisan.create({ user, businessName: user?.firstName + " " + user?.lastName, about: user?.firstName })
    }

    // file upload check 
    if(req.files) {
        const fileObj = req.files as { [fieldName: string]: Express.Multer.File[]};

        // cover image local path fetch 
        const coverImageLocalPath = fileObj['coverImage']
        const imagesLocalPaths = fileObj['images']

        // cover image upload check 
        if(!coverImageLocalPath) {
            throw new ApiError(400, "Cover Image is required!!")
        }

        if(coverImageLocalPath){
            // uploading cover image to server
            coverImage = await uploadOnCloudinary(coverImageLocalPath[0]?.path)
            if(!coverImage) {
                throw new ApiError(500, "Failed to upload cover image to server!")
            }
        }

        if(imagesLocalPaths) {
            // images limit check 
            if(imagesLocalPaths.length > 10) {
                throw new ApiError(400, "Only 10 images are allowed to be uploaded for product!")
            }
            // uploading images to server  
            const uploadPromise = imagesLocalPaths.map(async(field) => {
                const image = await uploadOnCloudinary(field.path)
                imagesArr.push(image)
            })
            await Promise.all(uploadPromise) 

            // empty array check 
            if(imagesArr.length <= 0) {
                throw new ApiError(500, "Failed to upload images to server!")
            }
        }
    }
    let subCategory = await SubCategory.findById(subcategory)
    if(!subCategory) {
        throw new ApiError(404, "Subcategory doesn't exist!")
    }
    // todo: name unique check 
    
    // creating Product in db 
    const product = await Product.create({
        name,
        images: imagesArr, 
        coverImage, 
        description: description || "", 
        price, 
        stock,
        subCategory, //todo: not storing/showing subcategory
        artisan
    }) 

    invalidateCache({ product: true, admin: true }); 

    // Product creation check 
    const createdProduct = await Product.findById(product._id).select("-__v -createdAt -updatedAt")

    if(!createdProduct){
        throw new ApiError(500, "Something went wrong while registering the Product!")
    }

    // returning response 
    return res.status(201).json(
        new ApiResponse(
            201, 
            createdProduct,
            "Product Created succesfully!!"
        )
    ) 
})  

export const updateProduct = asyncHandler(async(
    req: Request, res: Response, next: NextFunction
) => {
    // input from frontend 
    let { name, description, stock, price } = req.body 

    // product Id check 
    let productId = req.params.id 
    
    if(!productId){
        throw new ApiError(401, "Product is required to update!")
    }

    // product exists check 
    const product = await Product.findById(productId)
    if(!product) {
        throw new ApiError(404, "Requested product doesn't exist!")
    }

    // // empty value check 
    if(!(name || description || stock || price)){
        throw new ApiError(409, "Details are required to update product!")
    }

    let coverImage: (string|null) = ""

    // file upload check 
    if(req.file) {
        // coverImage local path fetch 
        const coverImageLocalPath = req.file as { [fieldName: string]: Express.Multer.File|undefined}["coverImage"];

        // uploading cover image 
        if(coverImageLocalPath){
            // uploading cover image to server
            coverImage = await uploadOnCloudinary(coverImageLocalPath?.path)
            if(!coverImage) {
                throw new ApiError(500, "Failed to upload cover image to server!")
            }
        }
    }
    if(coverImage == "") coverImage = product.coverImage

    // updating product fields
    const updatedProduct = await Product.findByIdAndUpdate(productId, {
        $set: {
            name, 
            description,
            stock, 
            price,
            coverImage
        }
    }, {
        new: true
    })

    invalidateCache({ product: true, admin: true, productId: String(product._id)}); 

    // returning response 
    return res.status(200)
        .json(new ApiResponse(200, updatedProduct, "Product updated succesfully!"))
})

export const deleteProduct = asyncHandler(async(req, res, next) => {
    const { id } = req.params
    const product = await Product.findById(id); 
    
    if(!product) {
        throw new ApiError(400, "Invalid Product Id")
    }
        
    await Product.findByIdAndDelete(product._id); 
    
    invalidateCache({ product: true, admin: true, productId: String(product._id)}); 

    return res.status(200).json(
        new ApiResponse(200, {}, "Product deleted succesfully!")
    )
})

// admin 
export const fetchAllProducts = asyncHandler(async(req, res, next) => {
    let products, key = "products"; 

    if(nodeCache.has(key)) {
        products = JSON.parse(nodeCache.get(key) as string);  
    } else {
        products = await Product.find(); 
        nodeCache.set(key, JSON.stringify(products)); 
    }
    
    return res.status(200).json(
        new ApiResponse(200, products, "All Products fetched succesfully!")
    )
})
