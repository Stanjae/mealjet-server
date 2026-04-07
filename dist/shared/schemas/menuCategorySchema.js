import z4 from "zod/v4";
import { objectIdSchema, stringSchema } from "./zod";
export const createMenuCategorySchema = z4.object({
    name: stringSchema().nonempty(),
    vendorId: objectIdSchema()
});
