// models/learningPath.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import db from '../util/dbConn';

interface LearningPathAttributes {
    id: number;
    title: string;
    description: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimated_duration: number; // in hours
    courses_order: number[]; // array of course IDs in order
    is_active: boolean;
    image?: string;
    created_by: number;
    created_at?: Date;
    updated_at?: Date;
}

interface LearningPathCreationAttributes extends Optional<LearningPathAttributes, 'id' | 'is_active' | 'created_at' | 'updated_at'> { }

class LearningPath extends Model<LearningPathAttributes, LearningPathCreationAttributes> implements LearningPathAttributes {
    public id!: number;
    public title!: string;
    public description!: string;
    public category!: string;
    public difficulty!: 'beginner' | 'intermediate' | 'advanced';
    public estimated_duration!: number;
    public courses_order!: number[];
    public is_active!: boolean;
    public image?: string;
    public created_by!: number;
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
}

LearningPath.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        difficulty: {
            type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
            allowNull: false,
        },
        estimated_duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        courses_order: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            }
        }
    },
    {
        sequelize: db,
        tableName: 'learning_paths',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default LearningPath;