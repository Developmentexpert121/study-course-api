// routes/wishlist.routes.ts
import express from 'express';
import {
    addToWishlist,
    checkWishlistStatus,
    getUserWishlist,
    getWishlistCount,
    removeFromWishlist
} from '../../controllers/wishlist';

const router = express.Router();

router.post('/add', addToWishlist);
router.post('/remove', removeFromWishlist);
router.get('/user/:user_id', getUserWishlist);
router.get('/check', checkWishlistStatus);
router.get('/count/:user_id', getWishlistCount);

export default router;