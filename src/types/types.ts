import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"

declare global{
    namespace Express {
        interface Request{
            user?: string; 
        }
    }    
}

export type ControllerType = (
    req: Request, 
    res: Response, 
    next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>; 

export interface RequestBody extends Request {
    user?: string; 
}
// User 
export interface IUserType extends Document{
    _id: string; 
    firstName: string; 
    lastName: string; 
    email: string; 
    phone: Number; 
    dob: Date; 
    gender: "male" | "female"; 
    avatar: string; 
    refreshToken: string; 
    role: "admin" | "artisan" | "user"; 
    age: number|any; 
    createdAt: Date; 
    updatedAt: Date; 
    password: string; 
    generateAccessToken(): string, ACCESS_TOKEN_SECRET: jwt.Secret, ACCESS_TOKEN_EXPIRY?: jwt.SignOptions | undefined; 
    generateRefreshToken(): string, REFRESH_TOKEN_SECRET: jwt.Secret, REFRESH_TOKEN_EXPIRY?: jwt.SignOptions | undefined; 
    isPasswordCorrect(password: string): boolean 
}

export interface UserRequestBodyType{
    username: string; 
    firstName: string;
    lastName: string; 
    email: string; 
    phone: number; 
    dob: Date; 
    gender: string;  
    password: string; 
    avatar: string; 
    role: string;
    refreshToken: string; 
}

export interface UserResponseBody{}; 

export interface TokensType{
    newAccessToken: string; 
    newRefreshToken: string;
}

// Category / Sub Category 
export interface CategorySubCategoryBodyType {
    id: string; 
    name: string; 
    description: string; 
}

// Product 
export interface ProductRequestBodyType {
    name: string;
    price: number; 
    stock: number; 
    photo: string; 
    description: string; 
    subcategory:  string; 
}

export type SearchRequestBodyType = {
    search?: string; 
    price?: string; 
    category?: string;
    sort?: string; 
    page?: string; 
    subCategory?: string; 
}

export interface ProductBaseQueryType{
    name?: {
        $regex: string, $options: string
    },
    price?: {
        $lte: number
    }, 
    subCategory?: string; 
    category?: string;
}

export type InvalidateCachePropsType = {
    admin?: boolean;
    product?: boolean; 
    order?: boolean; 
    user?: boolean; 
    artisan?: boolean;
    category?: boolean; 
    subcategory?: boolean; 
    productId?: string|string[]; 
    orderId?: string; 
    userId?: string;
    artisanId?:string;
    categoryId?:string;
    subcategoryId?:string;
}

// Order
export type AddressBodyType = {
    address: string; 
    city: string; 
    state: string; 
    pincode: string; 
    country: string; 
    isDefaultAddress?: boolean; 
    propertyType?: string; 
    deliveryInstructions?: string; 
}; 
export type OrderItemType = {
    quantity: number; 
    product: {
        _id: string; 
    } 
}
export interface OrderRequestBodyType{
    orderItems: OrderItemType[]; 
    address: string; 
    tax: number; 
    shippingCharges: number; 
    discount: number;
    rzpOrderId: string; 
    rzpPaymentId: string; 
    rzpSignature: string; 
    status: string; 
}; 

interface MyDoc extends Document{ 
    createdAt: Date; 
    discount?: number; 
    total?: number; 
}

export type FuncProps = {
    length: number; 
    documentArr: MyDoc[]|any; 
    today: Date; 
    property?: "discount"|"total"; 
}

