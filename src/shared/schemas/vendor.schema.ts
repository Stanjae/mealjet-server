import { z } from "zod/v4";
import {
  accountNumberSchema,
  createFileSchema,
  enumSchema,
  numberSchema,
  phoneSchema,
  singleDaySchema,
  stringSchema,
} from "./zod";
import {
  RESTAURANT_TAGS,
  vendorStatus,
} from "@shared/constants/vendor.constants";

// ─────────────────────────────────────────
// STEP 1: Basic Info
// ─────────────────────────────────────────
export const basicInfoSchema = z.object({
  name: stringSchema()
    .min(2, "Vendor name must be at least 2 characters")
    .max(100, "Vendor name must not exceed 100 characters")
    .trim(),

  description: stringSchema()
    .min(20, "Description must be at least 20 characters")
    .max(500, "Description must not exceed 500 characters")
    .trim(),

  cuisineTypes: z
    .array(stringSchema().min(1).trim())
    .min(1, "Select at least one cuisine type")
    .max(5, "You can select up to 5 cuisine types"),

  tags: z
    .array(enumSchema(RESTAURANT_TAGS))
    .max(5, "You can add up to 5 tags")
    .default([]),

  phone: phoneSchema(),

  logo: createFileSchema({
    maxSizeMB: 2,
  }),
  coverImage: createFileSchema({
    maxSizeMB: 1,
  }),
  address: z.object({
    street: stringSchema()
      .min(5, "Street address must be at least 5 characters")
      .max(200, "Street address is too long")
      .trim(),

    formattedAddress: stringSchema()
      .min(5, "Formatted address must be at least 5 characters")
      .max(200, "Formatted address is too long")
      .trim(),

    city: stringSchema()
      .min(2, "City name must be at least 2 characters")
      .max(100)
      .trim(),

    state: stringSchema()
      .min(2, "State must be at least 2 characters")
      .max(100)
      .trim(),

    country: stringSchema()
      .min(2, "Country must be at least 2 characters")
      .max(100)
      .trim(),

    postalCode: stringSchema()
      .trim()
      .regex(/^[A-Z0-9\s]{3,10}$/i, "Enter a valid postal code")
      .optional(),

    coordinates: z
      .object({
        lng: z
          .number()
          .min(-180)
          .max(180, "Longitude must be between -180 and 180"),
        lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
      })
      .refine(({ lng, lat }) => !(lng === 0 && lat === 0), {
        message: "Please select a valid location on the map",
      }),
  }),
});

// ─────────────────────────────────────────
// STEP 3: Opening Hours
// ─────────────────────────────────────────

export const openingHoursSchema = z.object({
  openingHours: z
    .array(singleDaySchema)
    .length(7, "You must provide hours for all 7 days")
    .refine(
      (hours) => {
        const days = hours.map((h) => h.day);
        return new Set(days).size === 7;
      },
      { message: "Each day must appear exactly once" },
    )
    .refine((hours) => hours.some((h) => !h.isClosed), {
      message: "Restaurant must be open at least one day a week",
    }),
});

// ─────────────────────────────────────────
// STEP 4: Media (Logo & Cover Image)
// ─────────────────────────────────────────

export const identificationSchema = z.object({
  proof_of_registration: createFileSchema({
    maxSizeMB: 2,
  }),
  proof_of_identification: createFileSchema({
    maxSizeMB: 2,
  }),
});

// ─────────────────────────────────────────
// STEP 5: Pricing & Operations
// ─────────────────────────────────────────
export const operationsSchema = z.object({
  avgPrepTime: numberSchema("Average prep time is required"),

  minOrderAmount: numberSchema("Minimum order amount is required"),

  baseDeliveryFee: numberSchema("Delivery fee is required"),

  commissionRate: numberSchema(),
});

// ─────────────────────────────────────────
// STEP 6: Bank Details
// ─────────────────────────────────────────
export const bankDetailsSchema = z.object({
  bankDetails: z.object({
    bankName: stringSchema()
      .min(2, "Bank name must be at least 2 characters")
      .max(100)
      .trim(),

    accountNumber: accountNumberSchema(),

    bankCode: stringSchema().optional(), // For future use with certain banks

    accountName: stringSchema()
      .min(3, "Account name must be at least 3 characters")
      .max(150)
      .trim()
      .refine((val) => /^[a-zA-Z\s\-'.]+$/.test(val), {
        message:
          "Account name must contain only letters, spaces, and common punctuation",
      }),
  }),
});

// ─────────────────────────────────────────
// FULL COMBINED SCHEMA (all steps merged)
// ─────────────────────────────────────────
export const fullRestaurantSchema = z.object({
  ...basicInfoSchema.shape,
  ...openingHoursSchema.shape,
  ...identificationSchema.shape,
  ...operationsSchema.shape,
  ...bankDetailsSchema.shape,
  status: z.enum(vendorStatus).default("pending_approval"),
  isOpen: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export type BasicInfoData = z.infer<typeof basicInfoSchema>;
export type OpeningHoursData = z.infer<typeof openingHoursSchema>;
export type IdentificationData = z.infer<typeof identificationSchema>;
export type OperationsData = z.infer<typeof operationsSchema>;
export type BankDetailsData = z.infer<typeof bankDetailsSchema>;
export type FullRestaurantData = z.infer<typeof fullRestaurantSchema>;
