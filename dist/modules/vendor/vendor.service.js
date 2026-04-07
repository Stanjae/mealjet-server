import { uploadToCloudinary } from "@shared/utils/cloudinary.service";
import Vendor from "./vendor.model";
import { sanitizeToId } from "@shared/utils/helpers";
export class VendorService {
    async createVendor(user, data, files) {
        const [logo, coverImage, proofOfReg, proofOfId] = await Promise.all([
            uploadToCloudinary(files.logo[0], "mealjet/vendors/logos"),
            uploadToCloudinary(files.coverImage[0], "mealjet/vendors/covers"),
            uploadToCloudinary(files.proof_of_registration[0], "mealjet/vendors/documents"),
            uploadToCloudinary(files.proof_of_identification[0], "mealjet/vendors/documents"),
        ]);
        const { address: { coordinates, type, ...restAddress }, } = data;
        const newUser = user.toObject();
        const vendor = await Vendor.create({
            ...data,
            logo: logo.url,
            coverImage: coverImage.url,
            proof_of_registration: proofOfReg.url,
            proof_of_identification: proofOfId.url,
            location: {
                coordinates,
                type,
            },
            address: restAddress,
            owner: newUser._id,
            slug: "",
        });
        return { message: "Vendor created successfully", vendor };
    }
    async profileCount(userId) {
        const vendorCount = await Vendor.countDocuments({ owner: userId });
        return {
            message: "Vendor profile count fetched successfully",
            vendorCount,
        };
    }
    async getVendorProfiles(userId) {
        const vendors = await Vendor.find({ owner: userId }).select('-bankDetails').lean();
        return {
            message: "Vendor profiles fetched successfully",
            vendors: vendors.map(sanitizeToId),
        };
    }
}
export const vendorService = new VendorService();
