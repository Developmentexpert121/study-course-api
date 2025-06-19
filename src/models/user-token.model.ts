import { DataTypes } from 'sequelize';
import db from '../util/dbConn';


const UserToken = db.define('user_tokens', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    token: {
        allowNull: false,
        type: DataTypes.STRING
    },
});

UserToken.sync()

export default UserToken;