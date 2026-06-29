import crypto from "crypto";
import { IUserDocument, UserModel } from "@modules/users/user.model.js";
import {
  generateTokenPair,
  verifyRefreshToken,
} from "@shared/utils/jwt-util.js";
import { redisSet, redisGet, redisDel } from "@shared/config/redis.js";
import { AppError } from "@shared/middleware/error.middleware";
import { RegisterDto, LoginDto, AuthTokens } from "./auth.types";
import { sendVerificationEmail } from "@shared/utils/email-util.js";
import Vendor from "@modules/vendor/vendor.model";
import { IAddress, IUser } from "@modules/users/user.types";
import { ALLOWED_LOCATIONS } from "@shared/constants/auth.constants";
import Rider from "@modules/rider/rider.model";
import { Request } from "express";

export class AuthService {
  async register(dto: RegisterDto) {
    const existing = await UserModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existing) throw new AppError(409, "Email already registered");
    try {
      const user = await UserModel.create({
        username: dto.username,
        email: dto.email.toLowerCase(),
        passwordHash: dto.password, // Pre-save hook hashes it
        role: dto.role,
      });

      // Generate email verification token (store in Redis, TTL 24h)
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await redisSet(`email_verify:${verifyToken}`, user._id.toString(), 86400);

      await sendVerificationEmail(user.email, user.username, verifyToken);

      return { message: "Registration successful. Please verify your email." };
    } catch (err) {
      throw new AppError(
        500,
        "An error occurred during registration. Please try again.",
      );
    }
  }

  async verifyNow(email: string) {
    const existing = await UserModel.findOne({
      email: email.toLowerCase(),
    });
    if (!existing) throw new AppError(409, "User does not exist");
    try {
      // Generate email verification token (store in Redis, TTL 24h)
      const verifyToken = crypto.randomBytes(32).toString("hex");
      await redisSet(
        `email_verify:${verifyToken}`,
        existing._id.toString(),
        86400,
      );

      await sendVerificationEmail(
        existing.email,
        existing.username,
        verifyToken,
        true,
      );

      return {
        message: "Verification email sent successfully.",
        statusCode: 200,
      };
    } catch (err) {
      throw new AppError(
        500,
        "An error occurred during verification. Please try again.",
      );
    }
  }

  async verifyEmail(token: string) {
    const userId = await redisGet<string>(`email_verify:${token}`);
    if (!userId)
      throw new AppError(400, "Invalid or expired verification link");

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        emailVerified: true,
        status: "active",
      },
      { returnDocument: "after" },
    ).select("-passwordHash -refreshTokens");
    await redisDel(`email_verify:${token}`);

    if (!user) throw new AppError(401, "User not found");

    const userObj = user.toObject();
    const { passwordHash, refreshTokens, _id, ...safeUser } = userObj;

    return {
      message: "Email verified successfully. You can now log in.",
      user: { ...safeUser, id: _id },
    };
  }

  async login(dto: LoginDto): Promise<{ user: object; tokens: AuthTokens }> {
    // Select passwordHash explicitly (it has select:false on schema)
    let hasProfile = false;
    const user = await UserModel.findOne({
      email: dto.email.toLowerCase(),
    }).select("+passwordHash +refreshTokens");

    if (!user) throw new AppError(401, "Invalid email or password");

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) throw new AppError(401, "Invalid email or password");

    if (!user.emailVerified)
      throw new AppError(403, "Please verify your email first");
    if (user.status !== "active")
      throw new AppError(403, `Account is ${user.status}`);

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    if (user.role === "vendor") {
      hasProfile =
        (await Vendor.countDocuments({ owner: user._id.toString() })) > 0;
    }

    if (user.role === "rider") {
      hasProfile =
        (await Rider.findOne({ owner: user._id.toString(), status: "active" })) !== null;
    }

    if (user.role === "customer") {
      hasProfile = true; // Customers don't have separate profiles
    }

    // Store refresh token hash (never store plain token in DB)
    const tokenHash = crypto
      .createHash("sha256")
      .update(tokens.refreshToken)
      .digest("hex");
    user.refreshTokens.push(tokenHash);
    // Cap at 5 active devices
    if (user.refreshTokens.length > 5)
      user.refreshTokens = user.refreshTokens.slice(-5);
    user.lastLogin = new Date();
    await user.save();

    const userObj = user.toObject();
    const { passwordHash, refreshTokens, _id, ...safeUser } = userObj;

    return { user: { ...safeUser, id: _id, hasProfile }, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const decoded = verifyRefreshToken(refreshToken); // throws if invalid/expired
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const user = await UserModel.findById(decoded.userId).select(
      "+refreshTokens",
    );
    if (!user || !user.refreshTokens.includes(tokenHash)) {
      throw new AppError(401, "Invalid refresh token");
    }

    // Token rotation — remove old, add new
    const newTokens = generateTokenPair({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    });
    const newHash = crypto
      .createHash("sha256")
      .update(newTokens.refreshToken)
      .digest("hex");
    user.refreshTokens = user.refreshTokens
      .filter((h) => h !== tokenHash)
      .concat(newHash);
    await user.save();

    return newTokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    //log-out from one device (remove specific refresh token)

    /* const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: tokenHash },
    }); */

    //log-out from all devices (remove all refresh tokens)
    await UserModel.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  async updateUserProfile(
    user: IUserDocument,
    updates: Partial<IUser>,
    type?: string,
  ) {
    const existingUser = user.toObject();
    const allowedFields = ["username", "phone", "walletBalance", "fcmToken"];
    const updateData: Partial<IUser> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        (updateData as Record<string, any>)[field] =
          updates[field as keyof IUser];
      }
    }
    if (updates.currentAddress) {
      if (!ALLOWED_LOCATIONS.includes(updates.currentAddress.state)) {
        throw new AppError(
          422,
          "User location is outside our delivery areas. Please choose a different address.",
        );
      }
      updateData.currentAddress = updates.currentAddress;
      updateData.savedAddresses = [
        ...(existingUser.savedAddresses || []),
        updates.currentAddress,
      ];
      updateData.location = {
        type: "Point",
        coordinates: [
          updates.currentAddress.coordinates.lng,
          updates.currentAddress.coordinates.lat,
        ],
      };
    }
    const updatedUser = await UserModel.findByIdAndUpdate(
      existingUser._id,
      { $set: updateData },
      { returnDocument: "after" },
    ).select("-passwordHash -refreshTokens");
    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }
    return {
      message: `${type == "address" ? "Address" : "Profile"} updated successfully`,
      user: updatedUser,
    };
  }

  async deleteUserAddress(user: IUserDocument, addressId: string) {
    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { $pull: { savedAddresses: { _id: addressId } } },
      { returnDocument: "after" },
    ).select("-passwordHash -refreshTokens");
    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }
    return {
      message: "Addresses deleted successfully",
      user: updatedUser,
    };
  }

  async updateUserCurrentAddress(user: IUserDocument, updates: IAddress) {
    const existingUser = user.toObject();

    const updateData: Partial<IUser> = {};
    if (updates) {
      if (existingUser.currentAddress._id.toString() === updates?._id) {
        throw new AppError(409, "User location is already set");
      }
      updateData.currentAddress = updates;
      updateData.location = {
        type: "Point",
        coordinates: [updates.coordinates.lng, updates.coordinates.lat],
      };
    }
    const updatedUser = await UserModel.findByIdAndUpdate(
      existingUser._id,
      { $set: updateData },
      { returnDocument: "after" },
    ).select("-passwordHash -refreshTokens");
    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }
    return {
      message: `Current address updated successfully`,
      user: updatedUser,
    };
  }

  async isAuthenticated(req: Request) {
    let hasProfile = false;
    const user = req?.user?.toObject();

    if (user.role === "vendor") {
      hasProfile =
        (await Vendor.countDocuments({ owner: user._id.toString(), status: "active" })) > 0;
    }

    if (user.role === "rider") {
      const profile =
        (await Rider.findOne({ owner: user._id.toString(), status: "active" })) !== null;
      hasProfile = profile ? true : false;
    }

    if (user.role === "customer") {
      hasProfile = true; // Customers don't have separate profiles
    }

    const { passwordHash, refreshTokens, _id, ...safeUser } = user;
    return { userObj: { ...safeUser, id: _id, hasProfile } };
  }
}

export const authService = new AuthService();
