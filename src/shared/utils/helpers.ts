import MenuItem from "@modules/menus/menu.model";
import { MJAddToCartItem } from "@modules/orders/orders.types";
import { IUserDocument } from "@modules/users/user.model";
import Vendor from "@modules/vendor/vendor.model";
import { env } from "@shared/config/env.js";
import { AppError } from "@shared/middleware/error.middleware";
import { ApplicationCharges } from "@shared/types/enums";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import inBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { Request } from "express";
import crypto from "crypto";
import { ILocation } from "@shared/models/shared.types";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(inBetween);

dayjs.tz.setDefault("Africa/Lagos");

export const newDayJs = () => dayjs();

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "none" | "lax";
  maxAge?: number;
  path?: string;
};
export const cookieOptions = (maxAge?: number, path?: string) => {
  const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite:
      env.NODE_ENV === "production" ? ("none" as const) : ("strict" as const),
  };
  if (path) {
    COOKIE_OPTIONS.path = path;
  }
  if (maxAge) {
    COOKIE_OPTIONS.maxAge = maxAge; //30 * 24 * 60 * 60 * 1000, // 30 days in ms
  }
  return COOKIE_OPTIONS;
};

export const sanitizeToId = <T extends { _id?: any; __v?: any; id?: any }>(
  doc: T,
): T => {
  doc.id = doc._id;
  delete doc._id;
  delete doc.__v;
  return doc;
};

export const getPageFromQuery = (pageQuery: Request["query"]["page"]) => {
  const rawPage = Array.isArray(pageQuery)
    ? (pageQuery[0] as string)
    : (pageQuery as string);
  const pageValue = typeof rawPage === "string" ? rawPage : "1";
  const parsedPage = Number.parseInt(pageValue, 10);

  if (Number.isNaN(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
};

export async function validateCart(cartItems: MJAddToCartItem[]) {
  const errors: string[] = [];
  const detailedErrors: {
    itemId: string;
    message: string;
    type: "vendor" | "item";
  }[] = [];

  await Promise.all(
    cartItems.map(async (item) => {
      const menuItem = await MenuItem.findById(item.id);
      const vendor = (await Vendor.findById(item.vendorId))?.toObject({
        virtuals: true,
      });

      const addonsTotal =
        item.addons?.reduce((addonAcc, addon) => {
          const optionsTotal = addon.options.reduce((optionAcc, option) => {
            return optionAcc + option.extraPrice * (option.quantity || 0);
          }, 0);
          return addonAcc + optionsTotal;
        }, 0) || 0;

      if (!vendor || !vendor.isOpen) {
        errors.push(`${vendor?.name} vendor is no longer open for orders`);
        detailedErrors.push({
          itemId: item.id,
          message: `${vendor?.name} vendor is no longer open for orders`,
          type: "vendor",
        });
      }

      if (!menuItem || !menuItem.isAvailable) {
        errors.push(`${item.title} is no longer available`);
        detailedErrors.push({
          itemId: item.id,
          message: `${item.title} is no longer available`,
          type: "item",
        });
      } else if (menuItem.price !== item.price - addonsTotal) {
        errors.push(`${item.title} price has changed to ₦${menuItem.price}`);
        detailedErrors.push({
          itemId: item.id,
          message: `${item.title} price has changed to ₦${menuItem.price}`,
          type: "item",
        });
      }
    }),
  );
  return { errors, detailedErrors };
}

export function getDistanceInKmAndFees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  baseDeliveryFee: number,
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const PER_KM_RATE = 150;

  const fee = baseDeliveryFee + distanceKm * PER_KM_RATE;

  return {
    distanceKm: distanceKm.toFixed(2),
    fee,
  };
}

export async function buildCheckoutSummary(
  cartItems: MJAddToCartItem[],
  user: IUserDocument,
) {
  const vendorMap = new Map<
    string,
    {
      vendorId: string;
      vendorImage: string;
      vendorName: string;
      vendorSlug: string;
      vendorDeliveryFee: number;
      vendorLocation: ILocation;
      calculatedDistanceKm: string;
      calculatedSubtotal: number;
      items: MJAddToCartItem[];
      total: number;
      serviceCharge: number;
    }
  >();

  await Promise.all(
    cartItems.map(async (product, _, arr) => {
      const existing = vendorMap.get(product.vendorId);
      if (existing) {
        existing.items.push(product);
      } else {
        const vendor = await Vendor.findById(product.vendorId);
        if (vendor) {
          const { _id, name, logo, slug, location, deliveryFee } =
            vendor.toObject();
          const { distanceKm, fee } = getDistanceInKmAndFees(
            location.coordinates[0],
            location.coordinates[1],
            user?.location.coordinates[0] as number,
            user?.location.coordinates[1] as number,
            deliveryFee,
          );

          const totalPrice = arr
            .filter((item) => item.vendorId == _id.toString())
            .reduce((tot, curr) => curr.price * curr.quantity + tot, 0);

          vendorMap.set(_id.toString(), {
            vendorId: _id.toString(),
            vendorImage: logo,
            vendorName: name,
            vendorSlug: slug,
            vendorDeliveryFee: fee,
            vendorLocation: location,
            calculatedDistanceKm: distanceKm,
            calculatedSubtotal: totalPrice,
            items: [
              arr.filter((item) => item.vendorId == _id.toString()),
            ].flat(),
            serviceCharge: ApplicationCharges.SERVICE_CHARGES,
            total:
              totalPrice * product.quantity +
              fee +
              ApplicationCharges.SERVICE_CHARGES,
          });
        }
      }
    }),
  );

  const resolvedVendors = Array.from(vendorMap.values());

  const grandTotal = resolvedVendors.reduce((acc, vendor) => {
    return acc + vendor.total;
  }, 0);

  const totalServiceCharge = resolvedVendors.reduce((acc, vendor) => {
    return acc + vendor.serviceCharge;
  }, 0);

  const totalSubtotal = resolvedVendors.reduce((acc, vendor) => {
    return acc + vendor.calculatedSubtotal;
  }, 0);

  const totalDeliveryFee = resolvedVendors.reduce((acc, vendor) => {
    return acc + vendor.vendorDeliveryFee;
  }, 0);

  return {
    newCart: resolvedVendors,
    grandTotal,
    totalServiceCharge,
    totalSubtotal,
    totalDeliveryFee,
  };
}

let dailyCounter = 0;
const lastDate = new Date().toDateString();
export async function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase(); // Base36 = shorter

  const now = new Date();
  const currentDate = now.toDateString();

  // Reset counter at midnight
  if (currentDate !== lastDate) {
    dailyCounter = 0;
  }

  dailyCounter++;
  const counter = dailyCounter.toString().padStart(4, "0"); // 0001

  return `ORD-${timestamp}-${counter}`; // ORD-LXJQ2X-0001
}

export function calculateEstimatedDelivery(
  distanceKm: number,
  prepTimeMinutes: number,
) {
  const BUFFER_MINUTES = 5; // pickup buffer
  const AVERAGE_SPEED = 20; // km/h

  const rideTime = Math.ceil((distanceKm / AVERAGE_SPEED) * 60);
  const totalMinutes = prepTimeMinutes + rideTime + BUFFER_MINUTES;

  const now = new Date();
  const eta = new Date(now.getTime() + totalMinutes * 60 * 1000);

  return {
    totalMinutes,
    eta, // exact ETA Date object → store in DB
    display: `${totalMinutes} mins`,
    range: `${formatTime(eta)} – ${formatTime(addMinutes(eta, 10))}`, // e.g "1:00 PM – 1:10 PM"
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60 * 1000);
}

const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(env.BANK_DETAILS_ENCRYPTION_KEY!)
  .digest(); // always returns exactly 32 bytes!; // must be 32 chars
const ALGORITHM = "aes-256-cbc";

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (text: string): string => {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString();
};
