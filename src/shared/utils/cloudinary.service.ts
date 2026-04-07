import cloudinary from "@shared/config/cloudinary";


interface UploadResult {
  url: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(file.buffer); // multer memoryStorage gives us buffer
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};