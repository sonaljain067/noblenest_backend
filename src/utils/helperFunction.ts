import { Product } from "../models/product.model.js";
import { FuncProps } from "../types/types.js";

export const inventoryRatio = async(productCounts: number) => {
    const categoriesCount = await Product.aggregate([
        {
            $lookup: {
                from: 'subcategories', 
                localField: 'subCategory', 
                foreignField: '_id', 
                as: 'subcategory'
            }
        }, 
        {
            $unwind: '$subcategory'
        }, 
        {
            $lookup: {
                from: 'categories', 
                localField: 'subcategory.category', 
                foreignField: '_id',
                as: 'category'
            }
        },
        {
            $unwind: '$category'
        },
        {
            $group: {
                _id: '$category.name',
                count: {$sum: 1}
            }
        },
        {
            $project: {
                _id: 0, 
                category: '$_id', 
                count: 1
            }
        }
        
    ])

    const categories = categoriesCount.map(item => {
        return {...item, count: Math.round((item.count / productCounts) * 100)}
    })
    // const categories:Record<string, number>[] = categoriesCover.reduce((acc, curr) => {
    //     acc[curr.category] = curr.count; 
    //     return acc; 
    // }, {});
    return categories 
}

export const pastMonthsCount = ({ length, documentArr, today, property }: FuncProps) => {
    let data = new Array(length).fill(0); 

        documentArr.forEach((i: { createdAt: Date; discount: number; total: number; }) => {
            const creationDate = i.createdAt; 
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12; 

            if(monthDiff < length) {
                data[length - monthDiff - 1] += property ? i[property]! : 1; 
            }
        }
    )
    return data; 
}