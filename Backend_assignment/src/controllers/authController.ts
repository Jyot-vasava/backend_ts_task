import { Request, Response } from 'express';
import Organization from '../models/Organization';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const org = await Organization.findOne({ 'admin.email': email });
    if (!org || !(await org.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ orgId: org._id }, process.env.JWT_SECRET as string);
    console.log(token);
    res.json({
      success: true,
      token,
      organization: {
        id: org._id,
        name: org.name,
        email: org.admin.email,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};