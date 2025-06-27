import express from 'express';
import { addManga, addChapter, getAllManga, getMangaById,addComment,removeComment,
    addBookmark,
    getBookmarksByUser,deleteManga, updateManga,rentManga  ,getAllRentals,deleteCommentFromOverall,addRating,removeBookmark,removeRating,getUserRentals,deleteRental,getDashboardSummary,getTopRatedMangas} from '../controller/mangaController.js';
import multer from 'multer';
import { coverStorage, chapterZipStorage} from '../middleware/upload.js';
import { verifyToken} from '../middleware/verifyToken.js';

const router = express.Router();

const uploadCover = multer({ storage: coverStorage });
const uploadZip = multer({ storage: chapterZipStorage });

router.post('/', uploadCover.single('coverImage'), addManga);
router.post('/:mangaId/chapters', uploadZip.single('zipFile'), addChapter);
router.get('/', getAllManga);

// Put all specific GET routes before param routes:
router.get("/summary", getDashboardSummary);
router.get('/rentals', getAllRentals);      // <-- moved here
router.get('/bookmarks/:userId', getBookmarksByUser);
router.get('/user/:userId', getUserRentals);
router.get('/top-rated', getTopRatedMangas);
router.get('/:mangaId', getMangaById);      // <-- param last
router.delete('/rental/:rentalId', deleteRental);

router.put('/update/:mangaId', updateManga);
router.delete('/delete/:mangaId', deleteManga);
router.post('/:mangaId/rent', rentManga);
router.post('/:mangaId/comment', addComment);
router.delete('/:mangaId/comment/:commentId', removeComment);
router.post('/:mangaId/bookmark', addBookmark);
router.delete('/:mangaId/overall-comments/:commentId', deleteCommentFromOverall);
router.delete('/:mangaId/bookmark', removeBookmark);
router.post('/rate/:mangaId', addRating);
router.delete('/review/:mangaId/:reviewId', removeRating);





export default router;
