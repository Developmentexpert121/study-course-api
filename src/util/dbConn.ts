"use strict";
import { Sequelize } from "sequelize";
// import association from '../models/associations';
import fs from "fs";
import path from "path";

const process = require("process");
const env = process.env.NODE_ENV || "local";
const config = require("../conf/config");
// import config from '../conf/config'
const db: any = {};

let sequelize: any;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  //    {
  //   ...config,
  //   dialectOptions: {
  //     ssl: {
  //       require: true,
  //       rejectUnauthorized: false,
  //     },
  //   },
  // }
  );
}

// Get the list of all model files
console.log(__dirname);
const modelsPath = path.join(__dirname, "../models");
const modelFiles = fs
  .readdirSync(modelsPath)
  .filter((file) => file.endsWith(".model.ts"));

export default sequelize;