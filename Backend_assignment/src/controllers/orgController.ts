import { Request, Response } from 'express';
import Organization from '../models/Organization';
import mongoose from 'mongoose';


const getDB = () => mongoose.connection.db;

export const createOrg = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDB();
    if (!db) {
      res.status(500).json({ error: 'Database connection not established' });
      return;
    }

    const { organization_name, email, password } = req.body;

    // Validate required fields
    if (!organization_name || !email || !password) {
      res.status(400).json({ error: 'organization_name, email, and password are required' });
      return;
    }

    // Check if organization name or admin email already exists
    const existingOrg = await Organization.findOne({
      $or: [
        { name: organization_name },
        { 'admin.email': email }
      ]
    });

    if (existingOrg) {
      res.status(400).json({
        error: existingOrg.name === organization_name
          ? 'Organization name already exists'
          : 'Admin email already registered'
      });
      return;
    }

    // Generate dynamic collection name: org_<lowercase_underscored_name>
    const collectionName = `org_${organization_name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')}`; // sanitize

    // Create the dedicated MongoDB collection for this organization
    await db.createCollection(collectionName);

    // Create organization document in master database
    const org = new Organization({
      name: organization_name,
      collectionName,
      admin: { email, password } // password will be hashed by pre-save hook
    });

    await org.save();

    // Success response with metadata
    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization_id: org._id,
        name: org.name,
        collectionName: org.collectionName,
        admin_email: org.admin.email,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization', details: error.message });
  }
};

export const getOrg = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organization_name } = req.query;

    // Validate input
    if (!organization_name || typeof organization_name !== 'string' || organization_name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'organization_name query parameter is required and must be a non-empty string'
      });
      return;
    }

    const trimmedName = organization_name.trim();

    // Fetch organization from Master Database (case-sensitive by default — adjust if needed)
    const org = await Organization.findOne({ name: trimmedName })
      .select('-admin.password -__v') // Never return hashed password or internal fields
      .lean(); // Return plain JS object for performance

    if (!org) {
      res.status(404).json({
        success: false,
        error: 'Organization not found',
        message: `No organization exists with the name: "${trimmedName}"`
      });
      return;
    }

    // Success response with clean metadata
    res.status(200).json({
      success: true,
      message: 'Organization retrieved successfully',
      data: {
        organization_id: org._id,
        name: org.name,
        collectionName: org.collectionName,
        admin_email: org.admin.email,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
       
      }
    });

  } catch (error: any) {
    console.error('Error in getOrgByName:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve organization'
    });
  }
};

export const updateOrg = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDB();
    if (!db) {
      res.status(500).json({ success: false, error: 'Database connection not available' });
      return;
    }

    // orgId comes from JWT auth middleware (you must set it there)
    const orgId = (req as any).orgId;
    if (!orgId) {
      res.status(401).json({ success: false, error: 'Unauthorized: Missing organization context' });
      return;
    }

    const { organization_name, email, password } = req.body;

    // At least one field must be provided
    if (!organization_name && !email && !password) {
      res.status(400).json({
        success: false,
        error: 'At least one field (organization_name, email, password) is required'
      });
      return;
    }

    // Fetch current organization
    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ success: false, error: 'Organization not found' });
      return;
    }

    let newCollectionName: string | undefined;

    // Handle organization name change (this triggers collection rename + data sync)
    if (organization_name && organization_name.trim() !== org.name) {
      const trimmedName = organization_name.trim();

      // Validate new name doesn't already exist
      const nameExists = await Organization.findOne({ name: trimmedName });
      if (nameExists) {
        res.status(400).json({
          success: false,
          error: 'Organization name already exists'
        });
        return;
      }

      // Generate sanitized new collection name
      newCollectionName = `org_${trimmedName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')}`;

      // Prevent self-conflict
      if (newCollectionName === org.collectionName) {
        res.status(400).json({
          success: false,
          error: 'New organization name results in the same collection name'
        });
        return;
      }

      // 1. Create new collection
      await db.createCollection(newCollectionName);

      // 2. Copy all data from old collection to new one
      const oldCollection = db.collection(org.collectionName);
      const allDocuments = await oldCollection.find({}).toArray();

      if (allDocuments.length > 0) {
        await db.collection(newCollectionName).insertMany(allDocuments);
      }

      // 3. Drop the old collection (safe now that data is migrated)
      try {
        await oldCollection.drop();
      } catch (err) {
        console.warn(`Old collection ${org.collectionName} already dropped or inaccessible`);
      }

      // Update org document
      org.name = trimmedName;
      org.collectionName = newCollectionName;
    }

    // Update admin email if provided and different
    if (email && email !== org.admin.email) {
      // Optional: Check if new email is already used by another org
      const emailExists = await Organization.findOne({ 'admin.email': email });
      if (emailExists && emailExists._id.toString() !== orgId) {
        res.status(400).json({
          success: false,
          error: 'Admin email is already registered with another organization'
        });
        return;
      }
      org.admin.email = email;
    }

    // Update password if provided (will be hashed by pre-save middleware)
    if (password) {
      org.admin.password = password;
    }

    // Save updated organization (triggers password hashing)
    await org.save();

    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: {
        organization_id: org._id,
        name: org.name,
        collectionName: org.collectionName,
        admin_email: org.admin.email,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt

      }
    });

  } catch (error: any) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization',
      details: error.message
    });
  }
};
export const deleteOrg = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDB();
    if (!db) {
      res.status(500).json({ error: 'Database connection not available' });
      return;
    }

    const orgId = (req as any).orgId;

    const org = await Organization.findById(orgId);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    // Drop the organization's dedicated collection
    try {
      await db.collection(org.collectionName).drop();
    } catch (err) {
      console.warn(`Collection ${org.collectionName} may not exist or already dropped`);
    }

    // Delete the organization record from master DB
    await org.deleteOne();

    res.json({
      success: true,
      message: 'Organization and all its data permanently deleted'
    });

  } catch (error: any) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
};