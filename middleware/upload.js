import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Create folders if they don't exist
const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// --- Cover Image Storage ---
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = 'uploads/covers';
    ensureFolderExists(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// --- Chapter Zip Storage ---
const chapterZipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = 'uploads/chapters/zips';
    ensureFolderExists(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

export { coverStorage, chapterZipStorage };
