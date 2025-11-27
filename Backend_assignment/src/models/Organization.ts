import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IOrganization extends Document {
  name: string;
  collectionName: string;
  admin: {
    email: string;
    password: string;
  };
   createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, unique: true, trim: true },
  collectionName: { type: String, required: true, unique: true },
  admin: {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }
  }
}, { timestamps: true });

OrganizationSchema.pre('save', async function (next) {
  if (this.isModified('admin.password')) {
    this.admin.password = await bcrypt.hash(this.admin.password, 12);
  }
});

OrganizationSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.admin.password);
};

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);