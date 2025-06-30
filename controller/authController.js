// controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Correct way to import the User model
import crypto from 'crypto';
import nodemailer from 'nodemailer';
const SECRET_KEY = "8261ba19898d0dcdfe6c0c411df74b587b2e54538f5f451633b71e39f957cf01";

// Signup Controller
export const signupController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
};

// Login Controller

export const loginController = async (req, res) => {
    console.log('🔍 Login attempt:', req.body);
    const { email, password } = req.body;
  
    if (!email || !password) {
      console.warn('⚠️ Missing email or password');
      return res.status(400).json({ msg: 'Email and password required' });
    }
  
    try {
      const user = await User.findOne({ email });
      console.log('👤 Fetched user:', user);
  
      if (!user) {
        console.warn('🚫 User not found');
        return res.status(400).json({ msg: 'User not found' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('🔐 Password match:', isMatch);
  
      if (!isMatch) {
        console.warn('🚫 Invalid credentials');
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
  
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        SECRET_KEY, // use this instead of JWT_SECRET
        { expiresIn: '2h' }
      );
      
      console.log('✅ JWT issued:', token);
  
      return res.json({
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          avatar: user.avatar // ← ADD THIS LINE
        }
      });
    } catch (err) {
      console.error('❌ Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  };


export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, avatar } = req.body;

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (avatar !== undefined) {
      // Validate avatar ID between 1 and 6
      if (avatar >= 1 && avatar <= 6) {
        updateData.avatar = avatar;
      } else {
        return res.status(400).json({ message: 'Invalid avatar selection' });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};


// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Fetch all users, exclude password field for security
    const users = await User.find().select('-password');

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset",
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password</p>`,
      });
      return res.json({ message: "Password reset link sent" });
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      return res.status(500).json({ message: "Failed to send email", error: emailErr.message });
    }
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.status(200).json({ message: "Password has been reset successfully" });
};
