import { Model, DataTypes } from "sequelize";
import db from '../util/dbConn';


const ContactForm = db.define('ContactForms', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    phone: {
      type: DataTypes.NUMBER,
      allowNull: true, // Or false if phone is required
      validate: {
        // Optional: Add phone number validation
        is: /^[\+]?[1-9][\d]{0,15}$/i // Simple international phone regex
      }
    },
  },
  {
    timestamps: true,
    tableName: 'ContactForms',
  }
);

export default ContactForm;
