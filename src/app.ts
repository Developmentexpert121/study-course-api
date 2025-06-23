import dotenv from "dotenv";
// dotenv.config({ path: '.env.local' });
dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });
import express, { Request, Response } from "express";
import sequelize from "./util/dbConn"
import cors from "cors";

import errorMiddleware from "./middleware/error";
import setInterface from "./middleware/interface";
import userRouter from "./router/user";
import courseRouter from "./router/course";
import mcqRoutes from "./router/mcq";



const app = express();
app.use(express.json({ limit: '2450mb' }));
app.use(express.urlencoded({ extended: false }));
var corsOptions = {
  origin: function (origin: any, callback: any) {
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(setInterface);
//check connection to database
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
app.use("/mcq", mcqRoutes);

app.use(errorMiddleware);
app.use((req, res, next) => {
  console.log(`${req.method} request at ${req.originalUrl}`);
  next();
});
app.listen(5000, () => {
  connectToDb();
  console.log(`[*] Server listening on Port ${5000}`);
});