import { Request, Response } from 'express';
import Category from '../../models/category.model';
import { Op } from 'sequelize';

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const userId = req.user?.id;

        if (!name) {
            return res.sendError(res, "Category name is required");
        }

        if (!userId) {
            return res.sendError(res, "User authentication required");
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ where: { name } });
        if (existingCategory) {
            return res.sendError(res, `Category '${name}' already exists`);
        }

        const category = await Category.create({
            name,
            description,
            created_by: userId
        });

        return res.sendSuccess(res, {
            message: "Category created successfully",
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
                is_active: category.is_active
            }
        });
    } catch (err) {
        console.error("[createCategory] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.findAll({
            where: { is_active: true },
            attributes: ['id', 'name', 'description'],
            order: [['name', 'ASC']]
        });

        return res.sendSuccess(res, {
            categories
        });
    } catch (err) {
        console.error("[getCategories] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await Category.findOne({
            where: { id, is_active: true },
            attributes: ['id', 'name', 'description']
        });

        if (!category) {
            return res.sendError(res, "Category not found");
        }

        return res.sendSuccess(res, { category });
    } catch (err) {
        console.error("[getCategoryById] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.user?.id;

        if (!name) {
            return res.sendError(res, "Category name is required");
        }

        const category = await Category.findOne({ where: { id } });
        if (!category) {
            return res.sendError(res, "Category not found");
        }

        // Check if another category with same name exists
        const existingCategory = await Category.findOne({
            where: {
                name,
                id: { [Op.ne]: id }
            }
        });

        if (existingCategory) {
            return res.sendError(res, `Category '${name}' already exists`);
        }

        await category.update({
            name,
            description: description || category.description
        });

        return res.sendSuccess(res, {
            message: "Category updated successfully",
            category: {
                id: category.id,
                name: category.name,
                description: category.description
            }
        });
    } catch (err) {
        console.error("[updateCategory] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await Category.findOne({ where: { id } });

        if (!category) {
            return res.sendError(res, "Category not found");
        }

        // Soft delete by setting is_active to false
        await category.update({ is_active: false });

        return res.sendSuccess(res, {
            message: "Category deleted successfully"
        });
    } catch (err) {
        console.error("[deleteCategory] Error:", err);
        return res.sendError(res, "ERR_INTERNAL_SERVER_ERROR");
    }
};