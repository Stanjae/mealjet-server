import cloudinary from "@shared/config/cloudinary";
export const uploadToCloudinary = async (file, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
            folder,
            resource_type: 'image',
        }, (error, result) => {
            if (error || !result)
                return reject(error);
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
            });
        });
        stream.end(file.buffer); // multer memoryStorage gives us buffer
    });
};
export const deleteFromCloudinary = async (publicId) => {
    await cloudinary.uploader.destroy(publicId);
};
