import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; 
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: Number, default: 1 },

  bookmarkedManga: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Manga' }],

  rentedManga: [
    {
      manga: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga' },
      rentedAt: { type: Date, default: Date.now },
      expiresAt: Date,
    }
  ],

  reviews: [
    {
      manga: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga' },
      rating: { type: Number },
      reviewText: { type: String },
    }
  ],

  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;