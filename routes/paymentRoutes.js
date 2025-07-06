import express from 'express';
import { esewaSuccess, esewaFailure } from '../controller/paymentController.js';

const router = express.Router();

router.get('/esewa-success', esewaSuccess);
router.get('/esewa-failure', esewaFailure);

export default router;
