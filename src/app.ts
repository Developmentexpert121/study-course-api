import dotenv from "dotenv";
// dotenv.config({ path: '.env.local' });
dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });
import express, { Request, Response } from "express";
import sequelize from "./util/dbConn"
import cors from "cors";
import path from "path";
import './models';
import errorMiddleware from "./middleware/error";
import setInterface from "./middleware/interface";
import userRouter from "./router/user";
import courseRouter from "./router/course";
import mcqRoutes from "./router/mcq";
import enrollRouter from "./router/enroll";
import chapterRouter from "./router/chapter";
import lessonsRouter from "./router/lessons";
import uploadRoutes from "./router/upload";
import commentRoutes from "./router/comment"
import categoriesRoutes from "./router/category"
import ratingRoutes from "./router/rating"
import progressRoutes from "./router/progress"

import bodyParser from "body-parser";

const app = express();
// app.use(express.json({ limit: '2450mb' }));
// app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "500mb" }));
var corsOptions = {
  origin: function (origin: any, callback: any) {
    callback(null, true);
  },
  credentials: true,
};
const allowedOrigins = [
  "http://localhost:3000",
  "https://1b47f3f9201c.ngrok-free.app",
];
app.use(cors(corsOptions));

app.use(setInterface);

const connectToDb = async () => {
  const data = await sequelize.sync({ force: false })
  try {
    await sequelize.authenticate();
    console.log("Database Connected successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};
app.use("/user", userRouter);
app.use("/course", courseRouter);
app.use("/enroll", enrollRouter);
app.use("/chapter", chapterRouter);
app.use("/lessons", lessonsRouter);
app.use("/comment", commentRoutes);
app.use("/mcq", mcqRoutes);
app.use("/categories", categoriesRoutes);
app.use("/progress", progressRoutes);

app.use("/upload", uploadRoutes);
app.use("/rating", ratingRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(errorMiddleware);
app.use((req, res, next) => {
  console.log(`${req.method} request at ${req.originalUrl}`);
  next();
});
app.listen(5000, () => {
  connectToDb();
  console.log(`[*] Server listening on Port ${5000}`);
});