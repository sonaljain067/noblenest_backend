import { nodeCache } from "../app.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse, asyncHandler } from "../utils/ApiHandler.js";
import { calcPercent } from "../utils/entityHandler.js";
import { inventoryRatio, pastMonthsCount } from "../utils/helperFunction.js";

export const adminKeys = ["admin-stats", "pie-chart", "bar-chart", "line-chart"]
export const fetchDashboardStats = asyncHandler(async(req, res, next) => {
    let stats, key = "admin-stats"; 

    if(nodeCache.has(key)) {
        stats = JSON.parse(nodeCache.get(key) as string); 
    } else {
        const today = new Date(), year = today.getFullYear(), month =  today.getMonth(); 
        const pastSixMonths = new Date(year, month - 6, 1); 
        const thisMonth = {
            start: new Date(year, month, 1), 
            end: today
        }
        const prevMonth = {
            start: new Date(year, month - 1, 1), 
            end: new Date(year, month - 1, 0)
        }

        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start, $lte: thisMonth.end 
            }
        })
        const prevMonthProductsPromise = Product.find({
            createdAt: {
                $gte: prevMonth.start, $lte: prevMonth.end 
            }
        })

        const thisMonthUsersPromise = User.find({
            createdAt: {
                $gte: thisMonth.start, $lte: thisMonth.end 
            }
        })
        const prevMonthUsersPromise = User.find({
            createdAt: {
                $gte: prevMonth.start, $lte: prevMonth.end 
            }
        })
        
        const thisMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start, $lte: thisMonth.end 
            }
        })
        const prevMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: prevMonth.start, $lte: prevMonth.end 
            }
        })
        const pastSixMonthsOrdersPromise = Order.find({
            createdAt: {
                $gte: pastSixMonths, $lte: today
            }
        })
        const latestTransactionPromise = Order.find({})
            .select("id orderItems discount total status")
            .limit(5)
        
        const [
            thisMonthProducts, thisMonthUsers, thisMonthOrders, 
            prevMonthProducts, prevMonthUsers, prevMonthOrders, 
            productCounts, orderCounts, userCounts, 
            pastSixMonthsOrders, allLatestTransactions
        ] = await Promise.all([
            thisMonthProductsPromise, thisMonthUsersPromise, thisMonthOrdersPromise, 
            prevMonthProductsPromise, prevMonthUsersPromise, prevMonthOrdersPromise, 
            Product.countDocuments(), Order.find({}).select("total"), User.countDocuments(),
            pastSixMonthsOrdersPromise, latestTransactionPromise]
        );

        const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (Number(order.total) || 0), 0);
        const prevMonthRevenue = prevMonthOrders.reduce((total, order) => total + (Number(order.total) || 0), 0);
        const totalRevenue = orderCounts.reduce((total, order) => total + (order.total || 0), 0);
        

        // revenue vs trans month wise 
        const orderMonthCounts = pastMonthsCount({length: 6, today, documentArr: pastSixMonthsOrders })
        const orderMontlyRevenue = pastMonthsCount({length: 6, today, documentArr: pastSixMonthsOrders, property: "total" })
        
        // inventory category with % 
        const categories: { count: number, category: string; }[] = await inventoryRatio(productCounts); 

        // user ratio 
        const genderCount = await User.aggregate([
            {
                $group: {
                    _id: '$gender', 
                    count: { $sum: 1 }
                }
            }
        ])

        const userRatio :Record<string, number>[] = genderCount.reduce((acc, curr) => {
            acc[curr._id] = curr.count; 
            return acc; 
        }, {});

        // latest transactions 
        const latestTransactions = allLatestTransactions.map(i => ({
            _id: i._id, 
            quantity: i.orderItems.length, 
            discount: i.discount, 
            amount: i.total, 
            status: i.status 
        }))
        
        stats = {
            total: {
                product: productCounts,
                order: orderCounts.length, 
                user: userCounts,
                revenue: totalRevenue
            }, 
            percentChange: {
                product: calcPercent(thisMonthProducts.length, prevMonthProducts.length), 
                order: calcPercent(thisMonthUsers.length, prevMonthUsers.length), 
                user: calcPercent(thisMonthOrders.length, prevMonthOrders.length),
                revenue: calcPercent(thisMonthRevenue, prevMonthRevenue) 
            },
            chart: {
                order: orderMonthCounts, 
                revenue: orderMontlyRevenue
            },
            categories,
            userRatio,
            latestTransactions

        }
        nodeCache.set(key, JSON.stringify(stats)); 

    }
    
    return res.status(200).json(new ApiResponse(200, stats, "Stats fetched succesfully!!")) 
})

export const fetchPieCharts = asyncHandler(async(req, res, next) => {
    let pieChart, key = "pie-chart"; 

    if(nodeCache.has(key)) {
        pieChart = JSON.parse(nodeCache.get(key) as string); 
    } else {
        // order fullfillment ratio 
        const orderStatus = await Order.aggregate([
            {
                $group: {
                    _id: '$status', 
                    count: {$sum: 1}
                }
            }
        ])
        const orderFullfillment:Record<string, number>[] = orderStatus.reduce((acc, curr) => {
            acc[curr._id] = curr.count; 
            return acc; 
        }, {});

        // category ratio 
        const productCounts = await Product.countDocuments(); 
        const categories: Record<string, number>[] = await inventoryRatio(productCounts); 

        // stock availability 
        const stockCount = await Product.aggregate([
            {
                $group: {
                    _id: null, 
                    inStock: {
                        $sum: {
                            $cond: {if: {$gt: ['$stock', 0]}, then: 1, else: 0}
                        }
                    }, 
                    outOfStock: {
                        $sum: {
                            $cond: {if: {$lte: ['$stock', 0]}, then: 1, else: 0}
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0, 
                    inStock: 1, 
                    outOfStock: 1
                }
            }
        ])

        // revenue split
        const revenueSplit = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: {$sum: '$total'},
                    totalDiscount: {$sum: '$discount'},
                    totalProductionCost: {$sum: '$shippingCharges'},
                    totalBurnt: {$sum: '$tax'},
                }
            },
            {
                $project: {
                    _id: 0, 
                    totalAmount: 1, 
                    totalDiscount: 1, 
                    totalProductionCost: 1, 
                    totalBurnt: 1, 
                    totalMarketingCost: {$round: {$multiply: ['$totalAmount', 0.25]} },
                    netMargin: {$subtract: [
                        '$totalAmount',  
                        {$sum: ['$totalDiscount', '$totalProductionCost', '$totalBurnt', '$totalMarketingCost']}
                    ]}, 
                }
            }, 
        ])
        const currentYear = new Date().getFullYear();
        
        // age group split 
        const userCount = await User.find({}).select("dob")
        const usersAgeGroup = {
            teen: userCount.filter((i) => i.age < 20).length,
            adult: userCount.filter((i) => (i.age > 20 && i.age < 40)).length,
            old: userCount.filter((i) => i.age > 40).length
        }
        
        // role split 
        const roleSplit = await User.aggregate([
            {
                $group: {
                    _id: '$role', 
                    count: {$sum: 1}
                }
            }
        ])
        const accessRoleSplit:Record<string, number>[] = roleSplit.reduce((acc, curr) => {
            acc[curr._id] = curr.count; 
            return acc; 
        }, {});


        pieChart = {
            orderFullfillment,
            categories,
            stockCount: stockCount[0],
            amountSplit: revenueSplit[0],
            accessRoleSplit,
            usersAgeGroup
        }
        nodeCache.set(key, JSON.stringify(pieChart)); 
    }

    return res.status(200).json(new ApiResponse(200, pieChart, "Stats fetched succesfully!!")) 
})

export const fetchBarCharts = asyncHandler(async(req, res, next) => {
    let barChart, key = "bar-chart"; 
    if(nodeCache.has(key)) {
        barChart = JSON.parse(nodeCache.get(key) as string); 
    } else {
        const today = new Date(), year = today.getFullYear(), month =  today.getMonth(); 
        const pastSixMonths = new Date(year, month - 6, 1); 
        const pastTwelveMonths = new Date(year, month - 12, 1); 

        const pastSixMonthsProductsPromise = Product.find({
            createdAt: {
                $gte: pastSixMonths, $lte: today
            }
        }).select("createdAt")

        const pastSixMonthsUsersPromise = User.find({
            createdAt: {
                $gte: pastSixMonths, $lte: today
            }
        }).select("createdAt")

        const pastTwelveMonthsOrdersPromise = Order.find({
            createdAt: {
                $gte: pastTwelveMonths, $lte: today
            }
        }).select("createdAt")

        const [ products, users, orders ] = await Promise.all([
            pastSixMonthsProductsPromise, 
            pastSixMonthsUsersPromise,
            pastTwelveMonthsOrdersPromise
        ]);

        const productsCount = pastMonthsCount({length: 6, today, documentArr: products})
        const usersCounts = pastMonthsCount({length: 6, today, documentArr: users })
        const ordersCount = pastMonthsCount({length: 12, today, documentArr: orders })


        barChart = {
            users: usersCounts, 
            products: productsCount,
            orders: ordersCount
        }

        nodeCache.set(key, JSON.stringify(barChart));
    }

    return res.status(200).json(new ApiResponse(200, barChart, "Stats fetched succesfully!!")) 
})

export const fetchLineCharts = asyncHandler(async(req, res, next) => {
    let lineChart, key = "line-chart"; 
    if(nodeCache.has(key)) {
        lineChart = JSON.parse(nodeCache.get(key) as string); 
    } else {
        const today = new Date(), year = today.getFullYear(), month =  today.getMonth(); 
        const pastTwelveMonths = new Date(year, month - 12, 1); 
        const baseQuery = {
            createdAt: {
                $gte: pastTwelveMonths, $lte: today
            }
        }; 
        const [products, users, orders ] = await Promise.all([
            Product.find(baseQuery).select("createdAt"), 
            User.find(baseQuery).select("createdAt"),
            Order.find(baseQuery).select("createdAt discount total")
        ]);

        const productsCount = pastMonthsCount({length: 12, today, documentArr: products})
        const usersCounts = pastMonthsCount({length: 12, today, documentArr: users })
        const discountCount = pastMonthsCount({length: 12, today, documentArr: orders, property: "discount" })
        const revenueCount = pastMonthsCount({length: 12, today, documentArr: orders, property: "total" })

        lineChart = {
            users: usersCounts, 
            products: productsCount, 
            discounts: discountCount,
            revenue: revenueCount
        }

        nodeCache.set(key, JSON.stringify(lineChart));
    }



    return res.status(200).json(new ApiResponse(200, lineChart, "Stats fetched succesfully!!")) 
})
