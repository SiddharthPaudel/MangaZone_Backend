import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import unzipper from 'unzipper';
import Manga from '../models/Manga.js';
import Rental from '../models/Rental.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

function getSignature(secretKey, fields, values) {
  const message = fields.map(name => `${name}=${values[name]}`).join(',');
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}
// Add manga (cover image)
function getAllImageFiles(dir) {
  let results = [];

  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllImageFiles(filePath)); // Recursively walk subfolders
    } else if (/\.(jpg|jpeg|png|gif)$/i.test(file)) {
      // Return relative URL from "uploads/chapters"
      results.push(path.relative(path.join('uploads', 'chapters'), filePath).replace(/\\/g, '/'));
    }
  });

  return results;
}
export const addManga = async (req, res) => {
  try {
    const { title, description, isRentable, author, genre } = req.body;
    const coverImage = req.file?.filename;

    // ✅ Convert genre string to array if needed
    const genreArray = Array.isArray(genre)
      ? genre
      : genre?.split(',').map((g) => g.trim());

    // ✅ Handle rentalDetails
    let rentalDetails = null;

    if (isRentable === 'true' && req.body.rentalDetails) {
      const parsedDetails = typeof req.body.rentalDetails === 'string'
        ? JSON.parse(req.body.rentalDetails)
        : req.body.rentalDetails;

      rentalDetails = {
        price: parsedDetails.price,
        duration: {
          value: parsedDetails.duration.value,
          unit: parsedDetails.duration.unit
        }
      };
    }

    // ✅ Save rentalDetails to DB
    const manga = new Manga({
      title,
      description,
      coverImage,
      isRentable: isRentable === 'true',
      author,
      genre: genreArray,
      rentalDetails // ✅ This was missing before
    });

    await manga.save();
    res.status(201).json({ message: "Manga created", manga });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create manga" });
  }
};


export const addChapter = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { title } = req.body;
    const zipFile = req.file;

    if (!zipFile) {
      return res.status(400).json({ error: "Zip file not uploaded." });
    }

    const timestamp = Date.now();
    const safeTitle = title.replace(/\s+/g, '_');
    const chapterFolder = path.join('uploads', 'chapters', `${safeTitle}_${timestamp}`);
    fs.mkdirSync(chapterFolder, { recursive: true });

    // ✅ Extract ZIP file
    await fs.createReadStream(zipFile.path)
      .pipe(unzipper.Extract({ path: chapterFolder }))
      .promise();

    // ✅ Recursively find image files
    const imageUrls = getAllImageFiles(chapterFolder);

    if (imageUrls.length === 0) {
      return res.status(400).json({ error: "No images found in the zip file." });
    }

    // ✅ Find the manga document
    const manga = await Manga.findById(mangaId);
    if (!manga) {
      return res.status(404).json({ error: "Manga not found." });
    }

    // ✅ Add chapter to manga
    manga.chapters.push({
      title,
      imageUrls
    });

    await manga.save();

    // ✅ Delete uploaded zip file after extraction
    fs.unlinkSync(zipFile.path);

    res.status(200).json({ message: 'Chapter added successfully', manga });

  } catch (err) {
    console.error("Error in addChapter:", err);
    res.status(500).json({ error: 'Failed to add chapter' });
  }
};

export const deleteManga = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const deleted = await Manga.findByIdAndDelete(mangaId);

    if (!deleted) return res.status(404).json({ message: 'Manga not found' });

    res.json({ message: 'Manga deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete manga' });
  }
};

export const updateManga = async (req, res) => {
  try {
    const { mangaId } = req.params;
    // Destructure exactly what frontend sends
    const {
      title,
      description,
      isRentable,
      author,
      genre,
      rentalDetails
    } = req.body;

    const coverImage = req.file?.filename;

    // Base fields to update
    const updateData = {
      title,
      description,
      isRentable,
      author,
    };

    // If a new cover image was uploaded
    if (coverImage) {
      updateData.coverImage = coverImage;
    }

    // Normalize genre into array
    if (genre) {
      updateData.genre = Array.isArray(genre)
        ? genre
        : genre.split(',').map(g => g.trim());
    }

    // Handle rentalDetails according to your schema
    if (isRentable && rentalDetails) {
      // Ensure price and duration exist
      const price = Number(rentalDetails.price);
      const durationValue = Number(rentalDetails.duration?.value);
      const durationUnit = rentalDetails.duration?.unit;

      updateData.rentalDetails = {
        price,
        duration: {
          value: durationValue,
          unit: durationUnit
        }
      };
    } else {
      // If not rentable or no rentalDetails provided, clear it
      updateData.rentalDetails = null;
    }

    // Perform the update
    const updatedManga = await Manga.findByIdAndUpdate(
      mangaId,
      updateData,
      { new: true }
    );

    if (!updatedManga) {
      return res.status(404).json({ message: 'Manga not found' });
    }

    res.json({ message: 'Manga updated', manga: updatedManga });
  } catch (err) {
    console.error('Failed to update manga:', err);
    res.status(500).json({ error: 'Failed to update manga' });
  }
};




export const getAllManga = async (req, res) => {
    try {
      const mangaList = await Manga.find();  // Fetch all manga from the database
      res.status(200).json(mangaList); // Send the list of manga as a response
    } catch (err) {
      console.error(err); // Log any errors
      res.status(500).json({ error: 'Failed to fetch manga' }); // Respond with an error message
    }
  };
  
  // Get a single manga by its ID, including its chapters
export const getMangaById = async (req, res) => {
  try {
    const { mangaId } = req.params; // Extract the mangaId from the request parameters

    // Fetch manga by ID and populate chapters AND ratings.userId with user names
    const manga = await Manga.findById(mangaId)
      .populate('chapters') // your existing chapters population
      .populate({
        path: 'ratings.userId',   // populate user inside ratings
        select: 'name'            // only get the user's name field
      });

    if (!manga) {
      return res.status(404).json({ error: 'Manga not found' });
    }

    res.status(200).json(manga);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch manga details' });
  }
};
// Add a comment to a manga (overall comment)
export const addComment = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { userId, username, text } = req.body;

    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    // Fetch the avatar from the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const avatar = user.avatar || null; // assuming avatar is a number like 1, 2, 3...

    // Push the comment with avatar
    manga.overallComments.push({ userId, username, text, avatar });
    await manga.save();

    res.status(200).json({ message: "Comment added", comments: manga.overallComments });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};
export const removeComment = async (req, res) => {
  try {
    const { mangaId, commentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find the manga
    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    // Remove the specific comment by matching both commentId and userId
    manga.overallComments = manga.overallComments.filter(
      (c) => !(c._id.toString() === commentId && c.userId.toString() === userId)
    );

    await manga.save();

    // Optional: Remove comment from user.comments if such structure exists
    const user = await User.findById(userId);
    if (user && user.comments) {
      user.comments = user.comments.filter((c) => c.commentId.toString() !== commentId);
      await user.save();
    }

    // Return updated comments
    return res.status(200).json({ 
      message: "Comment removed successfully", 
      comments: manga.overallComments 
    });
  } catch (error) {
    console.error("Error removing comment:", error);
    return res.status(500).json({ message: "Error removing comment" });
  }
};



  // Bookmark a manga
export const addBookmark = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    const alreadyBookmarked = manga.bookmarks.some(
      bookmarkUserId => bookmarkUserId.toString() === userId
    );

    if (!alreadyBookmarked) {
      // ✅ 1. Add to manga's bookmarks
      manga.bookmarks.push(userId);
      await manga.save();

      // ✅ 2. Add to user's bookmarkedManga field
      await User.findByIdAndUpdate(userId, {
        $addToSet: { bookmarkedManga: new mongoose.Types.ObjectId(mangaId) }
      });
    }

    res.status(200).json({ message: "Manga bookmarked", bookmarks: manga.bookmarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to bookmark manga" });
  }
}

  
  // Get all bookmarks for a user
  export const getBookmarksByUser = async (req, res) => {
    try {
      const { userId } = req.params;
  
      const mangas = await Manga.find({ bookmarks: userId });
      res.status(200).json(mangas);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  };


// rentManga controller



export const rentManga = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const {
      userId,
      durationValue,
      durationUnit,
      paymentMethod,
      phoneNumber,
      location
    } = req.body;

    if (!userId || !paymentMethod || !phoneNumber) {
      return res.status(400).json({ error: 'User ID, payment method, and phone number are required.' });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
    }

    const manga = await Manga.findById(mangaId);
    if (!manga || !manga.isRentable) {
      return res.status(404).json({ error: 'Manga not found or not rentable.' });
    }

    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt);
    if (durationUnit === 'days') {
      expiresAt.setDate(rentedAt.getDate() + parseInt(durationValue));
    } else if (durationUnit === 'hours') {
      expiresAt.setHours(rentedAt.getHours() + parseInt(durationValue));
    } else {
      return res.status(400).json({ error: 'Invalid duration unit.' });
    }

    const basePrice = manga.rentalDetails?.price || 0;
    let totalPrice =
      durationUnit === 'days'
        ? basePrice * parseInt(durationValue)
        : (basePrice / 24) * parseInt(durationValue);
    totalPrice = Math.round(totalPrice * 100) / 100;

    // ✅ eSewa specific logic
    if (paymentMethod === 'Esewa') {
      const transaction_uuid = new mongoose.Types.ObjectId().toString();
      const product_code = process.env.ESEWA_MERCHANT_CODE;
      const secretKey = process.env.ESEWA_SECRET_KEY;

      const values = {
        amount: totalPrice.toString(),
        tax_amount: '0',
        product_service_charge: '0',
        product_delivery_charge: '0',
        total_amount: totalPrice.toString(),
        transaction_uuid,
        product_code,
        success_url: `${process.env.BACKEND_URL}/api/payment/esewa-success?userId=${userId}&mangaId=${mangaId}&rentedAt=${rentedAt.toISOString()}&expiresAt=${expiresAt.toISOString()}&price=${totalPrice}&phoneNumber=${phoneNumber}&location=${location}`,
        failure_url: `${process.env.BACKEND_URL}/api/payment/esewa-failure`,
      };

      const signedFields = ['total_amount', 'transaction_uuid', 'product_code'];
      values.signed_field_names = signedFields.join(',');
      values.signature = getSignature(secretKey, signedFields, values);

      return res.status(200).json({
        esewa: true,
        action: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
        values,
      });
    }

    // ✅ Other payment methods - save directly
   if (['Cash', 'Khalti', 'Card'].includes(paymentMethod)) {
      const rental = new Rental({
        userId,
        mangaId,
        rentedAt,
        expiresAt,
        price: totalPrice,
        paymentMethod,
        phoneNumber,
        location
      });

      await rental.save();
      await User.findByIdAndUpdate(userId, { $addToSet: { rentedManga: mangaId } });

await Manga.findByIdAndUpdate(mangaId, {
  $addToSet: {
    rentedBy: {
      userId: new mongoose.Types.ObjectId(userId),
      rentedAt,
      expiresAt
    }
  }
});

      return res.status(201).json({ message: 'Manga rented successfully', rental });
    }

    return res.status(400).json({ error: 'Invalid payment method' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to rent manga' });
  }
};



// export const rentManga = async (req, res) => {
//   try {
//     const { mangaId } = req.params;
//     const {
//       userId,
//       durationValue,
//       durationUnit,
//       paymentMethod,
//       phoneNumber,
//       location
//     } = req.body;

//     if (!userId || !paymentMethod || !phoneNumber) {
//       return res.status(400).json({ error: 'User ID, payment method, and phone number are required.' });
//     }

//     if (!/^\d{10}$/.test(phoneNumber)) {
//       return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
//     }

//     const manga = await Manga.findById(mangaId);
//     if (!manga || !manga.isRentable) {
//       return res.status(404).json({ error: 'Manga not found or not rentable.' });
//     }

//     const rentedAt = new Date();
//     const expiresAt = new Date(rentedAt);
//     if (durationUnit === 'days') {
//       expiresAt.setDate(rentedAt.getDate() + parseInt(durationValue));
//     } else if (durationUnit === 'hours') {
//       expiresAt.setHours(rentedAt.getHours() + parseInt(durationValue));
//     } else {
//       return res.status(400).json({ error: 'Invalid duration unit.' });
//     }

//     const basePrice = manga.rentalDetails?.price || 0;
//     let totalPrice =
//       durationUnit === 'days'
//         ? basePrice * parseInt(durationValue)
//         : (basePrice / 24) * parseInt(durationValue);
//     totalPrice = Math.round(totalPrice * 100) / 100;

//     // eSewa payment handling
//     if (paymentMethod === 'Esewa') {
//       const transaction_uuid = new mongoose.Types.ObjectId().toString();
//       const product_code = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
//       const secretKey = process.env.ESEWA_SECRET_KEY;

//       // Prepare extra data to send (optional)
//       const extraData = {
//         transaction_uuid,
//         total_amount: totalPrice,
//         product_code,
//         status: 'INITIATED',
//       };
//       const encodedData = encodeURIComponent(JSON.stringify(extraData));

//       const success_url = `${process.env.BACKEND_URL}/api/payment/esewa-success`
//         + `?userId=${userId}`
//         + `&mangaId=${mangaId}`
//         + `&rentedAt=${rentedAt.toISOString()}`
//         + `&expiresAt=${expiresAt.toISOString()}`
//         + `&price=${totalPrice}`
//         + `&phoneNumber=${phoneNumber}`
//         + `&location=${encodeURIComponent(location)}`
//         + `&data=${encodedData}`;

//       const failure_url = `${process.env.BACKEND_URL}/api/payment/esewa-failure`;

//       const values = {
//         amount: totalPrice.toString(),
//         tax_amount: '0',
//         product_service_charge: '0',
//         product_delivery_charge: '0',
//         transaction_uuid,
//         product_code,
//         success_url,
//         failure_url,
//       };

//       const signedFields = ['total_amount', 'transaction_uuid', 'product_code'];
//       values.signed_field_names = signedFields.join(',');
//       values.signature = getSignature(secretKey, signedFields, values);

//       return res.status(200).json({
//         esewa: true,
//         action: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
//         values,
//       });
//     }

//     // For other payment methods: Save rental immediately
//     const rental = new Rental({
//       userId,
//       mangaId,
//       rentedAt,
//       expiresAt,
//       price: totalPrice,
//       paymentMethod,
//       phoneNumber,
//       location
//     });

//     await rental.save();

//     await User.findByIdAndUpdate(userId, { $addToSet: { rentedManga: mangaId } });
//     await Manga.findByIdAndUpdate(mangaId, {
//       $addToSet: {
//         rentedBy: { userId, rentedAt, expiresAt }
//       }
//     });

//     res.status(201).json({ message: 'Manga rented successfully', rental });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to rent manga' });
//   }
// };


export const getUserRentals = async (req, res) => {
  try {
    const { userId } = req.params;

    const rentals = await Rental.find({ userId })
      .populate('mangaId') // To get manga details like title, cover, etc.
      .sort({ rentedAt: -1 });

    res.json(rentals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user rentals" });
  }
};



// Get all rentals
export const getAllRentals = async (req, res) => {
  try {
    const rentals = await Rental.find().populate('mangaId').populate('userId');
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rentals' });
  }
};
export const deleteRental = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const deleted = await Rental.findByIdAndDelete(rentalId);
    if (!deleted) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    res.json({ message: 'Rental deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete rental' });
  }
};

export const deleteCommentFromOverall = async (req, res) => {
  try {
    const { mangaId, commentId } = req.params;

    const manga = await Manga.findById(mangaId);
    if (!manga) {
      return res.status(404).json({ message: "Manga not found" });
    }

    // Log all existing comment IDs
    console.log("Existing comment IDs in overallComments:");
    manga.overallComments.forEach((comment) =>
      console.log(comment._id.toString())
    );

    // Trim the incoming commentId to avoid hidden characters
    const cleanCommentId = commentId.trim();
    console.log("Trying to delete comment ID:", cleanCommentId);

    // Find the index of the comment
    const commentIndex = manga.overallComments.findIndex(
      (comment) => comment._id.toString() === cleanCommentId
    );

    console.log("Found comment index:", commentIndex);

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Remove the comment and save
    manga.overallComments.splice(commentIndex, 1);
    await manga.save();

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error while deleting comment:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

export const addRating = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { userId, rating, review, avatar } = req.body;  // <--- add avatar here

    if (!userId || !rating) {
      return res.status(400).json({ message: "User ID and rating are required" });
    }

    // Fetch Manga
    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    // Update or add to manga.ratings
    const existingRating = manga.ratings.find(r => r.userId.toString() === userId);
    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
      existingRating.avatar = avatar;  // update avatar as well
    } else {
      manga.ratings.push({ userId, rating, review, avatar });
    }

    await manga.save();

    // Update user.reviews
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existingReview = user.reviews.find(r => r.manga.toString() === mangaId);
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.reviewText = review;
    } else {
      user.reviews.push({ manga: mangaId, rating, reviewText: review });
    }

    await user.save();

    // Populate user names in manga ratings
    const populatedManga = await Manga.findById(mangaId).populate({
      path: "ratings.userId",
      select: "name"
    });

    return res.status(200).json({
      message: "Rating and review saved successfully",
      ratings: populatedManga.ratings
    });

  } catch (error) {
    console.error("Error saving rating:", error);
    return res.status(500).json({ message: "Error saving rating and review" });
  }
};


export const removeRating = async (req, res) => {
  try {
    const { mangaId, reviewId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find the manga
    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    // Correct filtering line to remove the specific review by userId and reviewId:
    manga.ratings = manga.ratings.filter(
      (r) => !(r._id.toString() === reviewId && r.userId.toString() === userId)
    );

    await manga.save();

    // Remove from user reviews (optional)
    const user = await User.findById(userId);
    if (user) {
      user.reviews = user.reviews.filter((r) => r.manga.toString() !== mangaId);
      await user.save();
    }

    return res.status(200).json({ message: "Rating and review removed successfully" });
  } catch (error) {
    console.error("Error removing rating:", error);
    return res.status(500).json({ message: "Error removing rating" });
  }
};


export const removeBookmark = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(mangaId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid mangaId or userId' });
    }

    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: 'Manga not found' });

    // Remove userId from manga.bookmarks array
    manga.bookmarks = manga.bookmarks.filter(id => id.toString() !== userId);
    await manga.save();

    // Also remove mangaId from user's bookmarkedManga array
    await User.findByIdAndUpdate(userId, {
      $pull: { bookmarkedManga: mangaId }
    });

    res.status(200).json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error removing bookmark' });
  }
};

export const getDashboardSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalManga = await Manga.countDocuments();
    const totalRents = await Rental.countDocuments();

    const topRented = await Rental.aggregate([
      {
        $group: {
          _id: "$mangaId",
          rented: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "mangas",
          localField: "_id",
          foreignField: "_id",
          as: "manga",
        },
      },
      { $unwind: "$manga" },
      {
        $project: {
          name: "$manga.title",
          rented: 1,
        },
      },
      { $sort: { rented: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({ totalUsers, totalManga, totalRents, topRented });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTopRatedMangas = async (req, res) => {
  try {
    // Aggregate average rating per manga
    const mangas = await Manga.aggregate([
      {
        $addFields: {
          avgRating: { $avg: "$ratings.rating" }
        }
      },
      { $sort: { avgRating: -1 } },
      { $limit: 10 }
    ]);

    res.json(mangas);
  } catch (error) {
    console.error('Failed to get top rated mangas:', error);
    res.status(500).json({ error: 'Failed to get top rated mangas' });
  }
};

