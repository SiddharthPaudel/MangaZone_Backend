// routes/authRoutes.js
import express from "express";
import { signupController, loginController ,updateUser,getAllUsers,forgotPassword,resetPassword } from "../controller/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Signup Route
router.post("/signup", signupController);

// Login Route
router.post("/login", loginController);

router.put('/update/:userId', updateUser); 
router.get("/", getAllUsers);
router.post('/forgot-password', forgotPassword);
// Inside authRoutes.js or similar
router.post("/reset-password/:token", resetPassword);


export default router;
