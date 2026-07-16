import { FullRestaurantData } from "@shared/schemas/vendor.schema";
import { IVendorReqFiles } from "./vendor.types";
import { uploadToCloudinary } from "@shared/utils/cloudinary.service";
import Vendor from "./vendor.model";
import { IUserDocument } from "@modules/users/user.model";
import { sanitizeToId } from "@shared/utils/helpers";
import { AppError } from "@shared/middleware/error.middleware";

export class VendorService {
  async createVendor(
    user: IUserDocument,
    data: FullRestaurantData,
    files: IVendorReqFiles,
  ) {
    const [logo, coverImage, proofOfReg, proofOfId] = await Promise.all([
      uploadToCloudinary(files.logo[0], "mealjet/vendors/logos"),
      uploadToCloudinary(files.coverImage[0], "mealjet/vendors/covers"),
      uploadToCloudinary(
        files.proof_of_registration[0],
        "mealjet/vendors/documents",
      ),
      uploadToCloudinary(
        files.proof_of_identification[0],
        "mealjet/vendors/documents",
      ),
    ]);

    const newUser = user.toObject();

    const vendor = await Vendor.create({
      ...data,
      logo: logo.url,
      coverImage: coverImage.url,
      proof_of_registration: proofOfReg.url,
      proof_of_identification: proofOfId.url,
      location: {
        coordinates: [data.address.coordinates.lng, data.address.coordinates.lat],
        type: "Point",
      },
      address: data.address,
      owner: newUser._id,
      slug: "",
    });

    return { message: "Vendor created successfully", vendor };
  }

  async profileCount(userId: string) {
    const vendorCount = await Vendor.countDocuments({ owner: userId });
    return {
      message: "Vendor profile count fetched successfully",
      vendorCount,
    };
  }

  async getVendorProfiles(userId: string) {
    const vendors = await Vendor.find({ owner: userId })
      .select("-bankDetails");

    const serializedVendors = vendors.map((vendor) =>
      sanitizeToId(vendor.toObject({ virtuals: true })),
    );

    return {
      message: "Vendor profiles fetched successfully",
      vendors: serializedVendors,
    };
  }

  async getAllVendors() {
    const vendors = await Vendor.find({ status: "active" }).select("-bankDetails");

    const serializedVendors = vendors.map((vendor) =>
      sanitizeToId(vendor.toObject({ virtuals: true })),
    );

    return {
      message: "All vendors fetched successfully",
      vendors: serializedVendors,
    };
  }

  async getVendorProfile(vendorSlug: string) {
    const vendor = await Vendor.findOne({ slug: vendorSlug })
      .select("-bankDetails");

    if (!vendor) {
      throw new AppError(404, "Vendor not found");
    }

    const serializedVendor = sanitizeToId(vendor.toObject({ virtuals: true }));

    return {
      message: "Vendor profile fetched successfully",
      vendor: serializedVendor,
    };
  }
}

export const vendorService = new VendorService();
