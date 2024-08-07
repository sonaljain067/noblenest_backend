import { NextFunction, Request, Response } from "express";
import { ApiError, ErrorResponse } from "../utils/ApiHandler.js";

export const ApiErrorMiddleware = ((err: ApiError, req: Request, res: Response, next: NextFunction) => {
    if(err.name == "CastError") err.message = "Invalid ID";
    
    err.statusCode ||= 500; 
    err.message ||= "Interval Server Error";
    
    return res.status(err.statusCode).json(new ErrorResponse(err.statusCode, err.message));
}); 