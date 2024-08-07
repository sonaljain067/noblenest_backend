import { Request, Response, NextFunction} from "express"; 
import { ControllerType } from "../types/types.js"; 

export class ApiResponse{
    statusCode: number
    data: any 
    message: string 
    success: boolean 
    constructor(statusCode: number, data: any, message = "Success") {
        this.statusCode = statusCode
        this.data = data 
        this.message = message 
        this.success = statusCode < 400 
    }
}

export class ApiError extends Error{
    statusCode: number
    constructor(
        statusCode: number, 
        message: string
    ) {
        super(message)
        this.statusCode = statusCode
    }
}; 

export class ErrorResponse{
    statusCode: Number
    message: string 
    constructor(statusCode: number, message: string) {
        this.statusCode = statusCode
        this.message = message 
    }
}



export const asyncHandler = (func: ControllerType) => {
    return (req: Request|any, res: Response|any, next: NextFunction) => {
        Promise.resolve(func(req, res, next))
        .catch((err) => next(err))
    }
}