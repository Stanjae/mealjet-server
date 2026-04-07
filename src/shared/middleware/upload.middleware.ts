// src/shared/middleware/upload.middleware.ts
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { AppError } from "./error.middleware";

const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError(400, "Only image files are allowed"));
  }
};

export const uploadImage = multer({
  storage: multer.memoryStorage(), // Buffer in memory — stream to Cloudinary
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: imageFilter,
});

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for documents
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "image/jpg",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(400, "Only JPG, PNG, or PDF files are allowed"));
  },
});
