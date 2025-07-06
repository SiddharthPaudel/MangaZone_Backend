// import Rental from '../models/Rental.js';
// import User from '../models/User.js';
// import Manga from '../models/Manga.js';

// export const esewaSuccess = async (req, res) => {
//   try {
//     const {
//       userId,
//       mangaId,
//       rentedAt,
//       expiresAt,
//       price,
//       phoneNumber,
//       location
//     } = req.query;

//     const rental = new Rental({
//       userId,
//       mangaId,
//       rentedAt: new Date(rentedAt),
//       expiresAt: new Date(expiresAt),
//       price,
//       paymentMethod: 'Esewa',
//       phoneNumber,
//       location
//     });

//     await rental.save();
//     await User.findByIdAndUpdate(userId, { $addToSet: { rentedManga: mangaId } });
//     await Manga.findByIdAndUpdate(mangaId, {
//       $addToSet: {
//         rentedBy: {
//           userId,
//           rentedAt: new Date(rentedAt),
//           expiresAt: new Date(expiresAt)
//         }
//       }
//     });

//     res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Payment processing failed');
//   }
// };

// export const esewaFailure = (req, res) => {
//   res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
// };


import mongoose from 'mongoose';
import Rental from '../models/Rental.js';
import User from '../models/User.js';
import Manga from '../models/Manga.js';

export const esewaSuccess = async (req, res) => {
  try {
    const {
      userId,
      mangaId,
      rentedAt,
      expiresAt,
      price,
      phoneNumber,
      location,
    } = req.query;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const mangaObjectId = new mongoose.Types.ObjectId(mangaId);

    const rental = new Rental({
      userId: userObjectId,
      mangaId: mangaObjectId,
      rentedAt: new Date(rentedAt),
      expiresAt: new Date(expiresAt),
      price,
      paymentMethod: 'Esewa',
      phoneNumber,
      location,
    });

    await rental.save();

    await User.findByIdAndUpdate(userObjectId, {
      $addToSet: { rentedManga: mangaObjectId },
    });

    await Manga.findByIdAndUpdate(mangaObjectId, {
      $addToSet: {
        rentedBy: {
          userId: userObjectId,
          rentedAt: new Date(rentedAt),
          expiresAt: new Date(expiresAt),
        },
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
  } catch (err) {
    console.error('Esewa payment success error:', err);
    res.status(500).send('Payment processing failed');
  }
};

export const esewaFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
};
