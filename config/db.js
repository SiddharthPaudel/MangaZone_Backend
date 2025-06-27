import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/MyDB");
    
    console.log("MongoDB connected");
  } catch (e) {
    console.log("MongoDB connection error:", e);
  }
};

export default connectDB;
