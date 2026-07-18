import { DAYS } from "@shared/constants/vendor.constants";
import mongoose from "mongoose";
import z from "zod";

export const stringSchema = () => z.string();

export const objectIdSchema = () =>
  stringSchema().refine(
    (id) => mongoose.Types.ObjectId.isValid(id),
    "Invalid ObjectId format",
  );

export const emailSchema = () => z.email("Please enter a valid email address");

export const dobSchema = () =>
  z.coerce.date({
    error: "Date of birth is required",
  });

export const passwordSchema = () =>
  z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^a-zA-Z0-9]/,
      "Password must contain at least one special character",
    );

export const enumSchema = <T extends string[]>(list: T) => z.enum(list);

export const phoneSchema = () =>
  z
    .string()
    .trim()
    .regex(
      /^\+?[1-9]\d{7,14}$/,
      "Enter a valid phone number (e.g. +2348012345678)",
    );

export const accountNumberSchema = () =>
  stringSchema()
    .trim()
    .regex(/^\d{10}$/, "Account number must be exactly 10 digits");

export const cloudinaryUrlSchema = z
  .url("Must be a valid URL")
  .refine((url) => url.includes("cloudinary.com"), {
    message: "Image must be uploaded via Cloudinary",
  });

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const MB = 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

// ─────────────────────────────────────────
// BASE FACTORY
// ─────────────────────────────────────────
const isServer = typeof window === "undefined";

export const createFileSchema = ({ maxSizeMB }: { maxSizeMB: number }) => {
  if (isServer) {
    return z.object({
      fieldname: z.string(),
      originalname: z.string(),
      mimetype: z
        .string()
        .refine(
          (type) =>
            ACCEPTED_IMAGE_TYPES.includes(
              type as (typeof ACCEPTED_IMAGE_TYPES)[number],
            ),
          {
            message: `Invalid file type. Accepted: ${ACCEPTED_IMAGE_TYPES.join(", ")}`,
          },
        ),
      size: z
        .number()
        .max(maxSizeMB * 1024 * 1024, `File must be under ${maxSizeMB}MB`),
      buffer: z.instanceof(Buffer),
    });
  }

  // Browser — File object
  return z
    .instanceof(File)
    .refine((file) => file.size <= maxSizeMB * 1024 * 1024, {
      message: `File must be under ${maxSizeMB}MB`,
    })
    .refine(
      (file) =>
        ACCEPTED_IMAGE_TYPES.includes(
          file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
        ),
      {
        message: `Invalid file type. Accepted: ${ACCEPTED_IMAGE_TYPES.join(", ")}`,
      },
    );
};

export const numberSchema = (error?: string) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;

    const trimmedValue = value.trim();
    if (trimmedValue === "") return undefined;

    const numericValue = Number(trimmedValue);
    return Number.isNaN(numericValue) ? value : numericValue;
  }, z.number({ error }));

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm 24-hour format

export const singleDaySchema = z
  .object({
    day: z.enum(DAYS.map((d) => d.value)),
    isClosed: z.boolean().default(false),
    openTime: z
      .string()
      .regex(timeRegex, "Use HH:mm format (e.g. 08:00)")
      .optional(),
    closeTime: z
      .string()
      .regex(timeRegex, "Use HH:mm format (e.g. 22:00)")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.isClosed) return true;
      return !!data.openTime && !!data.closeTime;
    },
    {
      message: "Open and close times are required when the restaurant is open",
    },
  )
  .refine(
    (data) => {
      if (data.isClosed || !data.openTime || !data.closeTime) return true;
      return data.openTime < data.closeTime;
    },
    { message: "Opening time must be before closing time" },
  );

export const booleanSchema = () => z.boolean();
