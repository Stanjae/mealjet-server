import { IUserDocument, UserModel } from "@modules/users/user.model";
import { IVendorReqFiles } from "@modules/vendor/vendor.types";
import { FullRiderData } from "@shared/schemas/rider.schema";
import { uploadToCloudinary } from "@shared/utils/cloudinary.service";
import Rider from "./rider.model";

export class RiderService {
  async createRider(
    user: IUserDocument,
    data: FullRiderData,
    files: IVendorReqFiles,
  ) {
    const newUser = user.toObject();

    const {first_name, last_name, phone, ...riderData} = data

    const [vehicleDocument, profilePicture, proofOfId] = await Promise.all([
      uploadToCloudinary(files.vehicle_document[0], "mealjet/riders/documents"),
      uploadToCloudinary(files.profile_picture[0], "mealjet/riders/profile"),
      uploadToCloudinary(
        files.proof_of_identification[0],
        "mealjet/riders/documents",
      ),
    ]);

    await Rider.create({
      ...riderData,
      owner: newUser._id,
      profile_picture: profilePicture.url,
      proof_of_identification: proofOfId.url,
      vehicle_document: vehicleDocument.url,
    });

    await UserModel.findByIdAndUpdate(newUser._id, {
      firstName: first_name,
      lastName: last_name,
      phone,
    });

    return { message: "Rider created successfully" };
  }

  async isRiderApproved(userId: string) {
    const rider = await Rider.findOne({ owner: userId }).select("status");

    if (!rider) {
      return { status: null };
    }

    return { status: rider?.status };
  }
}

export const riderService = new RiderService();
