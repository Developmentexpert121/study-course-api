// models/Email.js
import { Model, DataTypes } from "sequelize";
import db from '../util/dbConn';

const Email = db.define('Emails', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    EmailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: 'Emails',
  }
);

export default Email;