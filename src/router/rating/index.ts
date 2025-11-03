import { createRating, deleteRating ,getAllRatings,
    hideRatingBySuperAdmin,unhideRatingBySuperAdmin,softDeleteRating,addRating,unhideRatingByAdmin,hideRatingByAdmin ,editUserReview
} from "../../controllers/rating";
import { Router } from "express";

const router = Router();
router.get('/allrating', getAllRatings);
router.post("/create", createRating);
router.patch('/ratings/:ratingId/hide-by-superadmin', hideRatingBySuperAdmin);
router.patch('/ratings/:ratingId/unhide-by-superadmin', unhideRatingBySuperAdmin);

router.patch('/ratings/:ratingId/hide-by-admin', hideRatingByAdmin);
router.patch('/ratings/:ratingId/unhide-by-admin', unhideRatingByAdmin);


router.patch('/ratings/:ratingId/soft-delete', softDeleteRating);
router.patch('/ratings/:ratingId/soft-add', addRating);


router.put('/ratings/:id/edit-review', editUserReview);


router.delete("/delete/:id",deleteRating);

export default router;
