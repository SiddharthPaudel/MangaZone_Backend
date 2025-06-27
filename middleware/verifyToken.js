import jwt from 'jsonwebtoken';

const SECRET_KEY = "8261ba19898d0dcdfe6c0c411df74b587b2e54538f5f451633b71e39f957cf01";

export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;  // Store the user data in the request
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Invalid or expired token' });
  }
};
