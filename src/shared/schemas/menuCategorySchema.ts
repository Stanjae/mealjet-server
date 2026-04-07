import z4, { boolean } from "zod/v4";
import { objectIdSchema, stringSchema } from "./zod";
import { is } from "zod/v4/locales";

export const createMenuCategorySchema = z4.object({
  name: stringSchema().nonempty(),
  vendorId: objectIdSchema(),
});

export const updateMenuCategorySchema = z4.object({
  name: stringSchema().optional(),
  vendorId: objectIdSchema(),
  id: objectIdSchema(),
  isVisible: boolean().optional(),
});
