// middleware/auth.ts
import jwt from 'jsonwebtoken';

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(token,"============jh")
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    console.log('JWT_SECRET:', process.env.JWT_SECRET);

    req.user = decoded; // contains user ID, role etc.
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
