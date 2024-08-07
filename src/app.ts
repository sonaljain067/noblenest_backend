import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import NodeCache from "node-cache";
import connectDB from "./db/db.js";
import { ApiErrorMiddleware } from "./middlewares/error.middleware.js";

const app = express(); 

export const nodeCache = new NodeCache(); 

dotenv.config()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true 
}))

app.use(express.json({
    limit: "16kb"
}))

app.use(morgan("dev")); 

app.use(express.urlencoded({
    extended: true, 
    limit: "16kb"
}))

app.use(express.static("public")) 

app.use(cookieParser()) 


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`)
    })
})
.catch((err) => {
    app.on("error", (err) => {
        console.log(`MongoDB connection failed with express!! ${err}`)
        throw err 
    })
    console.log(`MongoDB connection failed!! ${err}`)
}) 


import categoryRouter from "./routes/category.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import helperRouter from "./routes/helper.route.js";
import orderRouter from "./routes/order.route.js";
import productRouter from "./routes/product.route.js";
import userRouter from "./routes/user.route.js";

app.use("/api/v1/user", userRouter); 
app.use("/api/v1/product", productRouter); 
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/dashboard", dashboardRouter); 
app.use("/api/v1/checkout", orderRouter)
app.use("/api/v1/h", helperRouter); 


app.use(ApiErrorMiddleware)
