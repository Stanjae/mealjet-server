import { newDayJs } from "@shared/utils/helpers";

export const CUISINE_TYPES = [
  // African
  "Nigerian",
  "Ghanaian",
  "Ethiopian",
  "South African",

  // Continental / Western
  "Continental",
  "Italian",
  "French",
  "Mediterranean",
  "American",

  // Asian
  "Chinese",
  "Indian",
  "Japanese",
  "Thai",
  "Korean",

  // Middle Eastern
  "Lebanese",
  "Turkish",
  "Arabic",

  // Popular categories
  "Fast Food",
  "Grills & BBQ",
  "Shawarma",
  "Pizza",
  "Burgers",
  "Seafood",
  "Soups & Stews",
  "Salads",
  "Desserts & Pastries",
  "Smoothies & Drinks",
] as const;

export type CuisineType = (typeof CUISINE_TYPES)[number];

export const RESTAURANT_TAGS = [
  "halal",
  "vegan",
  "vegetarian",
  "fast-delivery",
  "kosher",
  "gluten-free",
  "organic",
];

export const DAYS = Array.from({ length: 7 }, (_, i) => ({
  value: i.toString(),
  label: newDayJs().day(i).format("dddd"),
}));

export const vendorStatus = [
  "pending_approval",
  "active",
  "suspended",
  "closed",
];
