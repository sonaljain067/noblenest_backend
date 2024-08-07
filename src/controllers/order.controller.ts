import { NextFunction, Request, Response } from "express";
import Razorpay from "razorpay";
import { nodeCache } from "../app.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { OrderRequestBodyType } from "../types/types.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHandler.js";
import { handleStock, invalidateCache } from "../utils/entityHandler.js";

export const registerRzpOrder = asyncHandler(async(req, res, next) => {
    const { amount } = req.body; 
    if(!amount) {
        throw new ApiError(400, "Incorrect amount to pay!")
    }
    const instance = new Razorpay({
        key_id: process.env.RAZORPAY_API_KEY || "",
        key_secret: process.env.RAZORPAY_API_SECRET || ""
    })

    var options = {
        amount: Number(amount * 100),
        currency: "INR"
    }
    const rzpOrder = await instance.orders.create(options)
    if(!rzpOrder) {
        throw new ApiError(500, "Some error occured in generating order!")
    }

    // returning response 
    return res.status(200)
        .json(new ApiResponse(200, rzpOrder, "Order created succesfully!"))
})

export const registerUserOrder = asyncHandler(async(
    req: Request<{}, {}, OrderRequestBodyType>, 
    res: Response, 
    next: NextFunction
    ) => {
        let { orderItems, address, tax, shippingCharges, discount, rzpOrderId, rzpPaymentId, rzpSignature, status } = req.body  
        // rzpPaymentId: 'pay_OgmWKjX7WmhCTI',
        // rzpOrderId: 'order_OgmVm8iRoVThvf',
        // rzpSignature: 'c3edc0f9582eafbd7441c7afd8abcf1cbdf8d4568d7a174fd6db29e5a12f27da'
        const user = await User.findById(req.query.id) 
        if(!user){
            throw new ApiError(401, "No such user exists!")
        }

        if(!orderItems) {
            throw new ApiError(401, "Required order details are missing!")
        } 
        let subTotal = 0; 
        for(const orderItem of orderItems) {
            const { quantity, product } = orderItem;
            const productItem = await Product.findById(product); 
            if(!productItem){
                throw new ApiError(404, "Product missing!!")
            }
            if(productItem)  {
                subTotal += (Number(productItem.price) * quantity); 
            }
        }
        if(status == ""){
            status = "Initiated"
        }
        const createdOrder = await Order.create({
            user, 
            orderItems, 
            address, 
            subTotal, 
            tax, 
            shippingCharges, 
            discount, 
            total: Number(subTotal + tax + shippingCharges - discount), 
            rzpOrder: rzpOrderId,
            rzpPayment: rzpPaymentId, 
            status: status 
        }); 

        await handleStock(orderItems);
        invalidateCache({ product: true, order: true, admin: true,  userId: user?._id, productId: String(orderItems.map(i => i.product._id)) });  
        return res.status(201).json(new ApiResponse(201, createdOrder, "Order placed successfully!"))
})

export const fetchUserOrder = asyncHandler(async(
    req: Request, 
    res: Response,
    next: NextFunction
) => {
    // input from frontend 
    const id = req.params.id 
    const user = await User.findById(req.query.id)
    if(!user){
        throw new ApiError(401, "No such user exists!")
    }

    // order's message 
    let message = "Order fetched succesfully!"

    // fetch & populate order 
    let order, key = `order-${id}`; 
    if(nodeCache.has(key)) {
        order = JSON.parse(nodeCache.get(key) as string); 
    } else {
        if(user.role === "admin") 
            order = await Order.findById(id)
                .select("-createdAt -updatedAt -__v")
                .populate({
                    path: 'orderItems.product',
                    model: 'Product',
                    select: "-createdAt -updatedAt -__v"
                })
                .populate({
                    path: 'address',
                    model: 'Address',
                    select: "-createdAt -updatedAt -__v"
                })
                .populate('user', 'firstName')

        else 
            order = await Order.findById({id, user}) 
                .select("-createdAt -updatedAt -__v")
                .populate({
                    path: 'orderItems.product',
                    model: 'Product',
                    select: "-images -description -subCategory -artisan -createdAt -updatedAt -__v"
                })
                .populate('user', 'firstName')
                    
        if(!order) {
            throw new ApiError(404, "Order doesn't exist")
        }

        nodeCache.set(key, JSON.stringify(order)); 
    }

    // returing response
    return res.status(200)
        .json(new ApiResponse(200, order, message))

})

export const fetchUserOrders = asyncHandler(async(req, res) => {
    // fetch user 
    const user = await User.findById(req.query.id)
    if(!user){
        throw new ApiError(401, "No such user exists!")
    }

    // retrieving user's order 
    let orders = [], key = `orders-${user}`; 

    if(nodeCache.has(key)) {
        orders = JSON.parse(nodeCache.get(key) as string); 
    } else {
        orders = await Order.find({ user })
            .select("-__v -createdAt -updatedAt")
            .populate({
                path: 'orderItems.product',
                model: 'Product',
                select: "-createdAt -updatedAt -__v"
            })
            .populate('user', 'firstName')
            .sort({'createdAt': -1}); 
        
        nodeCache.set(key, JSON.stringify(orders)); 
    }

    invalidateCache({ order: true, admin: true, userId: orders.user });  

    // returing response 
    return res.status(200) 
        .json(new ApiResponse(200, orders, "User's order fetched succesfully!"))
})

export const deleteUserOrder = asyncHandler(async(req: Request, res: Response) => {
    // fetching from frontend 
    const id = req.params.id 

    // fetching order 
    const order = await Order.findById(id)
    if(!order) {
        throw new ApiError(404, "No such order found!"); 
    }
    // deleting order 
    await Order.findByIdAndDelete(order?._id); 
    invalidateCache({ order: true, admin: true, userId: String(order.user), orderId: id });

    return res.status(200).json(new ApiResponse(200, {}, "Order deleted succesfully!"))
})

// admin 
export const fetchAllOrders = asyncHandler(async(req: Request, res: Response) => {
    // retrieving user's order 
    let orders = [], key = "orders"; 

    if(nodeCache.has(key)) {
        orders = JSON.parse(nodeCache.get(key) as string); 
    } else {
        orders = await Order.find()
        .select("-createdAt -updatedAt -__v")
        .populate({
            path: 'orderItems.product',
            model: 'Product',
            select: "-createdAt -updatedAt -__v"
        })
        .populate('user', 'firstName')
        .sort({'createdAt': -1}); 
        nodeCache.set(key, JSON.stringify(orders)); 
    }

    // returing response 
    return res.status(200) 
        .json(new ApiResponse(200, orders, "All orders fetched succesfully!"))
})

// admin / artisan 
export const processOrder  = asyncHandler(async(req, res) => {
    // input from frotend 
    const id = req.params.id 

    // fetching order 
    let order = await Order.findById(id); 

    if(!order){
        throw new ApiError(404, "No such order exists!")
    }        

    if(order.status == "Paid") {
        order.status = "Shipped";
        invalidateCache({ order: true, admin: true, orderId: String(order._id) }); 
    }
    else {
        order.status = "Delivered"; 
    }

    await order.save(); 

    // returning response 
    return res.status(200)
        .json(new ApiResponse(200, order, "Order updated succesfully!"))
    
})