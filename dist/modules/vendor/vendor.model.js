import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import { env } from "@shared/config/env";
import { newDayJs } from "@shared/utils/helpers";
const ENCRYPTION_KEY = crypto
    .createHash('sha256')
    .update(env.BANK_DETAILS_ENCRYPTION_KEY)
    .digest(); // always returns exactly 32 bytes!; // must be 32 chars
const ALGORITHM = "aes-256-cbc";
const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};
const decrypt = (text) => {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]).toString();
};
// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
const openingHourSchema = new Schema({
    day: { type: String, required: true, min: 0, max: 6 },
    openTime: { type: String, default: "08:00" },
    closeTime: { type: String, default: "22:00" },
    isClosed: { type: Boolean, default: false },
}, { _id: false });
const addressSchema = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String },
}, { _id: false });
const bankDetailsSchema = new Schema({
    bankName: { type: String, required: true },
    bankCode: { type: String },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
}, { _id: false });
const vendorSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: "text", // text index for search
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    cuisineTypes: {
        type: [String],
        required: true,
        default: [],
    },
    status: {
        type: String,
        enum: ["pending_approval", "active", "suspended", "closed"],
        default: "pending_approval",
        index: true,
    },
    isOpen: {
        type: Boolean,
        default: false,
    },
    logo: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
        required: true,
    },
    proof_of_registration: {
        type: String,
        required: true,
    },
    proof_of_identification: {
        type: String,
        required: true,
    },
    address: {
        type: addressSchema,
        required: true,
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
            default: "Point",
        },
        coordinates: {
            type: [Number], // [lng, lat]
            required: true,
        },
    },
    phone: {
        type: String,
        required: true,
    },
    openingHours: {
        type: [openingHourSchema],
        default: [],
    },
    avgRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    totalRatings: {
        type: Number,
        default: 0,
    },
    avgPrepTime: {
        type: Number,
        required: true,
        min: 1,
    },
    minOrderAmount: {
        type: Number,
        default: 0,
    },
    deliveryFee: {
        type: Number,
        default: 0,
    },
    commissionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    bankDetails: {
        type: bankDetailsSchema,
        required: true,
    },
    totalOrders: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true,
    },
    tags: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
});
// ─────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────
vendorSchema.index({ location: "2dsphere" }); // geospatial queries
vendorSchema.index({ name: "text", tags: "text" }); // text search
vendorSchema.index({ status: 1, isFeatured: 1 }); // homepage featured query
vendorSchema.index({ owner: 1, status: 1 }); // vendor dashboard queries
// ─────────────────────────────────────────
// Encrypt bank details before saving
// ─────────────────────────────────────────
vendorSchema.pre("save", function (next) {
    if (this.isModified("bankDetails.accountNumber")) {
        this.bankDetails.accountNumber = encrypt(this.bankDetails.accountNumber);
    }
});
// ─────────────────────────────────────────
// Decrypt bank details when reading
// ─────────────────────────────────────────
vendorSchema.methods.getBankDetails = function () {
    return {
        ...this.bankDetails.toObject(),
        accountNumber: decrypt(this.bankDetails.accountNumber),
    };
};
// ─────────────────────────────────────────
// Auto-generate slug from name
// ─────────────────────────────────────────
vendorSchema.pre("save", function (next) {
    if (this.isModified("name") && !this.slug) {
        this.slug =
            this.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-") + newDayJs().toISOString();
    }
});
const Vendor = mongoose.model("Vendor", vendorSchema);
export default Vendor;
