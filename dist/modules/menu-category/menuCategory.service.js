import Vendor from "@modules/vendor/vendor.model";
import { AppError } from "@shared/middleware/error.middleware";
import MenuCategory from "./menuCategory.model";
const MENU_CATEGORIES_PER_PAGE = 10;
class MenuCategoryService {
    async createMenuCategory(payload) {
        const vendor = await Vendor.findById(payload.vendorId);
        if (!vendor) {
            throw new AppError(404, "Invalid vendor ID");
        }
        const menuCategory = await MenuCategory.create(payload);
        return {
            message: "Menu category created successfully",
            data: menuCategory.toObject(),
        };
    }
    async getMenuCategories(vendorId, page = 1) {
        const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
        const skip = (currentPage - 1) * MENU_CATEGORIES_PER_PAGE;
        const filter = { vendorId };
        const [menuCategories, total] = await Promise.all([
            MenuCategory.find(filter)
                .sort({ sortOrder: 1, createdAt: -1 })
                .skip(skip)
                .limit(MENU_CATEGORIES_PER_PAGE),
            MenuCategory.countDocuments(filter),
        ]);
        return {
            message: "Menu categories fetched successfully",
            data: menuCategories,
            meta: {
                page: currentPage,
                limit: MENU_CATEGORIES_PER_PAGE,
                total,
                totalPages: Math.ceil(total / MENU_CATEGORIES_PER_PAGE),
            },
        };
    }
}
export const menuCategoryService = new MenuCategoryService();
