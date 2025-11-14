import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/access-control";
import Role from "../../models/role.model";
import User from "../../models/user.model";


const getAllRoles = async (req: Request, res: Response) => {
    try {
        const roles = await Role.findAll({
            attributes: ['id', 'name', 'permissions', 'createdAt'],
            include: [{
                model: User,
                as: 'users',
                attributes: ['id', 'username', 'email']
            }]
        });

        res.json({
            success: true,
            data: roles
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get role by ID
const getRoleById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const role = await Role.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'users',
                attributes: ['id', 'username', 'email']
            }]
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.json({
            success: true,
            data: role
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// In your role creation controller
const createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Role name is required'
            });
        }

        // Check if role already exists
        const existingRole = await Role.findOne({ where: { name } });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Role already exists'
            });
        }

        // If permissions are provided, use them; otherwise set all to false
        const rolePermissions = permissions || {
            dashboard: false,
            teacher: false,
            student: false,
            courses: false,
            activitylogs: false,
            newsletter: false,
            engagement: false,
            wishlist: false,
            certificates: false
        };

        // Create the new role
        const newRole = await Role.create({
            name,
            permissions: rolePermissions
        });

        return res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: newRole
        });

    } catch (error) {
        console.error('Error creating role:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
// Update role (Super-Admin only)
const updateRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, permissions } = req.body;
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        if (name && name !== role.name) {
            const existingRole = await Role.findOne({ where: { name } });
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: 'Role with this name already exists'
                });
            }
            role.name = name;
        }

        if (permissions) {
            role.permissions = { ...role.permissions, ...permissions };
        }

        await role.save();

        res.json({
            success: true,
            data: role
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete role (Super-Admin only)
const deleteRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Prevent deletion of default roles
        const protectedRoles = ['Super-Admin', 'Teacher', 'Student'];
        if (protectedRoles.includes(role.name)) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete default role: ${role.name}`
            });
        }

        // Check if any users are assigned to this role
        const usersWithRole = await User.count({ where: { role_id: role.id } });
        if (usersWithRole > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete role that has users assigned'
            });
        }

        await role.destroy();

        res.json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};