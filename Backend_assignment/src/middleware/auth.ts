import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

interface JwtPayload {
  orgId: string;
}

declare global {
  namespace Express {
    interface Request {
      orgId?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    console.log("token",token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    console.log("decoded",decoded);
    req.orgId = decoded.orgId;
    next();
  } catch (error) {
    return res.status(401).json({ error: error });
  }
};