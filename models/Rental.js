// models/Rental.js
import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  mangaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rentedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  price: { type: Number, required: true },

  // ✅ New field
  paymentMethod: { type: String, enum: ['Esewa', 'Khalti', 'Cash', 'Card'], required: true },
  phoneNumber: { type: String, required: true },
  location: { type: String }
});

export default mongoose.model('Rental', rentalSchema);
