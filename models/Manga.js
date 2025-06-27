import mongoose from 'mongoose';

// Comment Schema
const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Chapter Schema
const chapterSchema = new mongoose.Schema({
  title: String,
  imageUrls: [String],
  comments: [commentSchema]
});

// Main Manga Schema
const mangaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String }, // ✅ Add author
  genre: { type: [String], required: true }, // ✅ Add genre as an array of strings
  description: String,
  coverImage: String,
  isRentable: { type: Boolean, default: false },
  rentalDetails: {
    price: { type: Number },
    duration: {
      value: { type: Number },
      unit: { type: String, enum: ['hours', 'days'], default: 'days' }
    }
  },  
  rentedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rentedAt: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  chapters: [chapterSchema],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  overallComments: [
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String,
    text: String,
    avatar: Number, // ✅ Make sure this exists
  }
],
    ratings: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      rating: { type: Number, min: 1, max: 5, required: true },
      review: { type: String },
      createdAt: { type: Date, default: Date.now },
      avatar:Number
      
    }
  ]
});

export default mongoose.model('Manga', mangaSchema);
