import { DataTypes, Model, Optional } from 'sequelize';
import db from '../util/dbConn';

interface CategoryAttributes {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_by: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'is_active'> { }

class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
    public id!: number;
    public name!: string;
    public description?: string;
    public is_active!: boolean;
    public created_by!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Category.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    }
}, {
    sequelize: db,
    modelName: 'Category',
    tableName: 'categories',
    timestamps: true,
});

export default Category;