import Vendor from "@modules/vendor/vendor.model";
import { TCreateMeuCategoryPayload } from "./menuCategory.types";
import { AppError } from "@shared/middleware/error.middleware";
import MenuCategory from "./menuCategory.model";
import { sanitizeToId } from "@shared/utils/helpers";

const MENU_CATEGORIES_PER_PAGE = 10;

class MenuCategoryService {
  async createMenuCategory(payload: TCreateMeuCategoryPayload) {
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

  async getMenuCategories(vendorId: string, page = 1, search?: string) {
    const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
    const skip = (currentPage - 1) * MENU_CATEGORIES_PER_PAGE;
    const filter:{ [key: string]: any} = { vendorId };

    if (search) {
      filter['name'] = { $regex: search, $options: 'i' };
    }

    const [menuCategories, total] = await Promise.all([
      MenuCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(MENU_CATEGORIES_PER_PAGE).lean(),
      MenuCategory.countDocuments(filter),
    ]);

    return {
      message: "Menu categories fetched successfully",
      data: menuCategories.map(sanitizeToId),
      meta: {
        page: currentPage,
        limit: MENU_CATEGORIES_PER_PAGE,
        total,
        totalPages: Math.ceil(total / MENU_CATEGORIES_PER_PAGE),
      },
    };
  }

    async updateMenuCategory(payload: TCreateMeuCategoryPayload) {

    const { id, vendorId, ...rest } = payload;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new AppError(404, "Invalid vendor ID");
    }

    const menuCategory = await MenuCategory.findByIdAndUpdate(id, rest, { returnDocument: "after" });
    return {
      message: "Menu category updated successfully",
      data: menuCategory?.toObject(),
    };
  }

  async deleteMenuCategory(categoryId: string) {
    const menuCategory = await MenuCategory.findByIdAndDelete(categoryId);
    if (!menuCategory) {
      throw new AppError(404, "Menu category not found");
    }
    return {
      message: "Menu category deleted successfully",
      data: null,
    };
  }

  async deleteMultipleMenuCategories(categoryIds: string[]) {
    const deleteResult = await MenuCategory.deleteMany({ _id: { $in: categoryIds } });
    if (deleteResult.deletedCount === 0) {
      throw new AppError(404, "No menu categories found to delete");
    }
    return {
      message: `${deleteResult.deletedCount} menu category(ies) deleted successfully`,
      data: null,
    };
  }
}

export const menuCategoryService = new MenuCategoryService();
