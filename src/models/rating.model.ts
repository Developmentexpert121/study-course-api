import { Model, DataTypes } from "sequelize";
import db from '../util/dbConn';


const Ratings = db.define('Rating', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
      status: {
    type: DataTypes.ENUM('hidebysuperadmin', 'hidebyadmin', 'showtoeveryone'),
    allowNull: false,
    defaultValue: 'showtoeveryone',
  },
    review: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isactive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  },

);
export default Ratings;