import {
  FullMenuItemPayload,
  UpdateMenuItemPayload,
  UpdateMenuItemStockStatusPayload,
} from "@shared/schemas/menu.schema";
import { uploadToCloudinary } from "@shared/utils/cloudinary.service";
import { IMenuReqFiles } from "./menu.types";
import MenuItem from "./menu.model";
import { sanitizeToId } from "@shared/utils/helpers";
import { AppError } from "@shared/middleware/error.middleware";
import { menuCategoryService } from "@modules/menu-category";
import { IUserDocument } from "@modules/users";

const MENU_PER_PAGE = 10;

export class MenuService {
  menu() {
    return MenuItem;
  }
  async createMenuItem(
    user: IUserDocument,
    data: FullMenuItemPayload,
    files: IMenuReqFiles,
  ) {
    console.log("Creating menu item with data:", files, data);
    const image = await uploadToCloudinary(
      files.image[0] as Express.Multer.File,
      "mealjet/menus/items",
    );

    const images = await Promise.all(
      (files.images as Express.Multer.File[]).map((file) =>
        uploadToCloudinary(file, "mealjet/menus/items-gallery"),
      ),
    );

    const menuitem = await MenuItem.create({
      ...data,
      image: image.url,
      images: images.map((img) => img.url),
      slug: "",
    });

    return { message: "Menu item created successfully", menuitem };
  }

  async getMenuItems(
    vendorId: string,
    page = 1,
    search?: string,
    categoryId?: string,
    stockStatus?: string,
  ) {
    const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
    const skip = (currentPage - 1) * MENU_PER_PAGE;
    const filter: { [key: string]: any } = { vendor: vendorId };

    if (search) {
      filter["name"] = { $regex: search, $options: "i" };
    }

    if (categoryId) {
      filter["category"] = categoryId;
    }

    if (stockStatus !== undefined) {
      filter["isAvailable"] = stockStatus === "in_stock";
    }

    const [menuItems, total] = await Promise.all([
      MenuItem.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(MENU_PER_PAGE)
        .populate("category", "name")
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    return {
      message: "Menu items fetched successfully",
      data: menuItems.map(sanitizeToId),
      meta: {
        page: currentPage,
        limit: MENU_PER_PAGE,
        total,
        totalPages: Math.ceil(total / MENU_PER_PAGE),
      },
    };
  }

  async getMenuItem(vendorId: string, itemId?: string) {
    let filter: { [key: string]: any } = {};

    if (itemId && vendorId) {
      filter["$and"] = [{ _id: itemId }, { vendor: vendorId }];
    }

    const menuItem = await MenuItem.findOne(filter)
      .populate("category", "name")
      .lean();

    return {
      message: "Menu item fetched successfully",
      data: menuItem ? sanitizeToId(menuItem) : null,
    };
  }

  async updateMenuItem(data: UpdateMenuItemPayload, files: IMenuReqFiles) {
    const { id, image, images, ...rest } = data;

    const existing = await MenuItem.findById(id);
    if (!existing) throw new AppError(404, "Menu item not found");

    // Handle category change manually
    if (data.category && !existing.category.equals(data.category)) {
      await Promise.all([
        menuCategoryService
          .menuCategory()
          .findByIdAndUpdate(existing.category, {
            $inc: { itemCount: -1 },
          }),
        menuCategoryService.menuCategory().findByIdAndUpdate(data.category, {
          $inc: { itemCount: 1 },
        }),
      ]);
    }

    let resolvedImage = image;
    const uploadedImage = files.image?.[0];
    if (uploadedImage) {
      const uploaded = await uploadToCloudinary(
        uploadedImage,
        "mealjet/menus/items",
      );
      resolvedImage = uploaded.url;
    }

    const existingImageUrls = images.filter(
      (item): item is string => typeof item === "string",
    );

    const uploadedGalleryFiles = files.images ?? [];
    const uploadedGallery = uploadedGalleryFiles.length
      ? await Promise.all(
          uploadedGalleryFiles.map((file) =>
            uploadToCloudinary(file, "mealjet/menus/items-gallery"),
          ),
        )
      : [];

    const resolvedImages = [
      ...existingImageUrls,
      ...uploadedGallery.map((img) => img.url),
    ];

    if (typeof resolvedImage !== "string") {
      throw new AppError(422, "Image must be an existing URL or uploaded file");
    }

    const menuitem = await MenuItem.findByIdAndUpdate(
      id,
      {
        ...rest,
        image: resolvedImage,
        images: resolvedImages,
      },
      { returnDocument: "after" },
    );

    if (!menuitem) {
      throw new AppError(404, "Menu item not found");
    }

    return { message: "Menu item updated successfully", menuitem };
  }

  async updateMenuItemStockStatus(data: UpdateMenuItemStockStatusPayload) {
    const { id, isAvailable } = data;

    const menuitem = await MenuItem.findByIdAndUpdate(
      id,
      { isAvailable },
      { returnDocument: "after" },
    );

    if (!menuitem) {
      throw new AppError(404, "Menu item not found");
    }

    return { message: "Menu item updated successfully", menuitem };
  }

  async deleteMenuItem(itemId: string) {
    const menuitem = await MenuItem.findByIdAndDelete(itemId);
    if (!menuitem) {
      throw new AppError(404, "Menu item not found");
    }
    return {
      message: "Menu item deleted successfully",
      data: null,
    };
  }

  async deleteMultipleMenuItems(itemIds: string[]) {
    const deleteResult = await MenuItem.deleteMany({ _id: { $in: itemIds } });
    if (deleteResult.deletedCount === 0) {
      throw new AppError(404, "No menu items found to delete");
    }
    return {
      message: `${deleteResult.deletedCount} menu item(s) deleted successfully`,
      data: null,
    };
  }
}

const menuService = new MenuService();
export default menuService;
