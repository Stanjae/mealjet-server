import z from "zod";
import { booleanSchema, createFileSchema, enumSchema, numberSchema, objectIdSchema, stringSchema } from "./zod";
import { menuAllergens, menuItemsTags } from "@shared/constants/menu.constants";

export const addonsSchema = z.object({
  name: stringSchema().min(2, 'Addon name is required').trim(),
  options: z
    .array(
      z.object({
        label: stringSchema().nonempty({ error: 'Option label is required' }),
        extraPrice: numberSchema('Option extra price is required'),
        isAvailable: booleanSchema().default(true),
      })
    )
    .refine((options) => options.length > 0, { message: 'At least one option is required' }),
  required: booleanSchema().default(false),
  maxSelect: numberSchema(),
  minSelect: numberSchema(),
  key: stringSchema().optional(),
});

export const fullMenuItemsSchema = z.object({
  vendor: objectIdSchema().optional(),
  name: stringSchema().nonempty({ error: 'Item name is required' }).trim(),
  category: stringSchema().nonempty({ error: 'Item category is required' }).trim(),
  description: stringSchema().nonempty({ error: 'Item description is required' }).trim(),
  price: numberSchema('Item price is required'),
  discountPrice: numberSchema().default(0),
  prepTime: numberSchema('Prep time is required'),
  isAvailable: booleanSchema().default(true),
  isPopular: booleanSchema().default(false),
  isFeatured: booleanSchema().default(false),
  calories: numberSchema().default(0),
  allergens: z.array(enumSchema(menuAllergens)),
  tags: z
    .array(enumSchema(menuItemsTags))
    .refine((tags) => tags.length > 0, { message: 'Select at least one tag' })
    .refine((tags) => tags.length <= 3, { message: 'You can select up to 3 tags' }),
  addons: z
    .array(addonsSchema)
    .refine(
      (addons) => {
        const hasDuplicateNames = addons.some((addon, index) => {
          return addons.findIndex((a) => a.name === addon.name) !== index;
        });
        return !hasDuplicateNames;
      },
      { message: 'Addon group names must be unique' }
    )
    .refine((addons) => addons.length > 0, { message: 'At least one addon group is required' }),
  image: createFileSchema({ maxSizeMB: 5}),
  images: z
    .array(createFileSchema({ maxSizeMB: 5, }))
    .refine((files) => files.length > 0, { message: 'At least one image is required' }),
});

const fileOrUrlSchema = z.union([
  createFileSchema({ maxSizeMB: 5 }),
  z.url("Must be a valid URL"),
]);

export const updateMenuItemsSchema = z.object({
  id: objectIdSchema(),
  ...fullMenuItemsSchema.shape,
  image: fileOrUrlSchema,
  images: z
    .array(fileOrUrlSchema)
    .refine((files) => files.length > 0, { message: 'At least one image is required' }),
});

export const updateMenuitemStockStatusSchema = z.object({
  id: objectIdSchema(),
  isAvailable: booleanSchema(),
});

export type FullMenuItemPayload = z.infer<typeof fullMenuItemsSchema>;
export type UpdateMenuItemPayload = z.infer<typeof updateMenuItemsSchema>;
export type UpdateMenuItemStockStatusPayload = z.infer<typeof updateMenuitemStockStatusSchema>;