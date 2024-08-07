import { nodeCache } from "../app.js"
import { Product } from "../models/product.model.js"
import { User } from "../models/user.model.js"
import { InvalidateCachePropsType, OrderItemType } from "../types/types.js"
import { ApiError } from "./ApiHandler.js"

export const invalidateCache = ({product, productId, order, orderId, admin, userId, user, artisan, artisanId, category, categoryId, subcategory, subcategoryId}: InvalidateCachePropsType) => {
    if(product) {
        const productDel: string[] = ["latest-products", "products"]; 
        if(typeof productId === "string")
            productDel.push(`product-${productId}`);
        if(typeof productId === "object")
            productId.forEach(i => productDel.push(`product-${i}`));
        nodeCache.del(productDel); 
    }
    if(order){
        // `order-${id}`, `orders-${user}`, "orders"
        const orderKeys: string[] = ["orders", `orders-${userId}`, `order-${orderId}`]; 
        nodeCache.del(orderKeys); 
    }
    if(admin){
        nodeCache.del(["admin-stats", "pie-chart", "bar-chart", "line-chart"]); 
    }
    if(user){
        // "users", "user-${id}"
        const userKeys: string[] = ["users", `user-${userId}`]
        nodeCache.del(userKeys);
    }
    if(artisan) {
        // "artisan-${id}", "artisans"
        const artisanKeys: string[] = ["artisans", `artisan-${artisanId}`]
        nodeCache.del(artisanKeys);
    }
    if(category) {
        // "categories", "category-${id}", "sub-categories", "subcategory-${id}"
        const categoryKeys: string[] = ["categories", `category-${categoryId}`, "subcategories", `subcategory-${subcategoryId}`]
        
        nodeCache.del(categoryKeys);
    }
}; 

export const handleStock = async(OrderItemTypes: OrderItemType[]) => {
    for(let i = 0; i < OrderItemTypes.length; i++) {
        const order = OrderItemTypes[i]; 
        const product = await Product.findById(order.product); 
        if(product) {
            if(product.stock <= 0) {
                throw new ApiError(401, "Insufficient stocks!")
            }
            product.stock -= order.quantity;  
            await product.save({ validateBeforeSave: false }); 
        }
    }
}

export const calcPercent = (thisMonth: number, prevMonth: number) => {
    if(prevMonth == 0) return thisMonth*100; 
    const percentage = (thisMonth / prevMonth) * 100;
    return percentage.toFixed(0); 
}

