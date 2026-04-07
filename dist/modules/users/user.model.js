import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
const addressSchema = new Schema({
    label: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
}, { _id: true });
const userSchema = new Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, sparse: true },
    passwordHash: { type: String, select: false }, // Never returned by default
    role: { type: String, enum: ['customer', 'vendor', 'driver', 'admin'], default: 'customer' },
    status: { type: String, enum: ['active', 'suspended', 'pending_verification', 'banned'], default: 'pending_verification' },
    avatar: { type: String },
    relatedEntityStatus: { type: String, enum: ['approved', 'in-review', 'pending'], default: 'pending' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, sparse: true },
    refreshTokens: { type: [String], default: [], select: false },
    savedAddresses: { type: [addressSchema], default: [] },
    walletBalance: { type: Number, default: 0 },
    fcmToken: { type: String },
    lastLogin: { type: Date },
}, { timestamps: true });
// Hash password before save — only if modified
userSchema.pre('save', async function () {
    if (!this.isModified('passwordHash') || !this.passwordHash)
        return;
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});
// Instance method to compare passwords
userSchema.methods.comparePassword = async function (candidate) {
    if (!this.passwordHash)
        return false;
    return bcrypt.compare(candidate, this.passwordHash);
};
export const UserModel = model('User', userSchema);
