import { createRating, deleteRating ,getAllRatings,
    hideRatingBySuperAdmin,unhideRatingBySuperAdmin,softDeleteRating,addRating,unhideRatingByAdmin,hideRatingByAdmin
} from "../../controllers/rating";
import { Router } from "express";

const router = Router();
router.get('/allrating', getAllRatings);
router.post("/", createRating);
router.patch('/ratings/:ratingId/hide-by-superadmin', hideRatingBySuperAdmin);
router.patch('/ratings/:ratingId/unhide-by-superadmin', unhideRatingBySuperAdmin);

router.patch('/ratings/:ratingId/hide-by-admin', hideRatingByAdmin);
router.patch('/ratings/:ratingId/unhide-by-admin', unhideRatingByAdmin);


router.patch('/ratings/:ratingId/soft-delete', softDeleteRating);
router.patch('/ratings/:ratingId/soft-add', addRating);
router.delete("/delete/:id",deleteRating);

export default router;
