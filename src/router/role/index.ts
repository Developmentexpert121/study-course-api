import { Router } from "express";
import accessControl, { requireRole } from "../../middleware/access-control";
import { createRole, deleteRole, getAllRoles, getRoleById, updateRole } from "../../controllers/role";


const router = Router();
router.get("/", getAllRoles);

// All routes require Super-Admin role
router.use(accessControl);
router.use(requireRole(['Super-Admin']));

router.get("/:id", getRoleById);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;