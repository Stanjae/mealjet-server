import { asyncHandler } from "@shared/middleware/error.middleware";
import { ApiResponse } from "@shared/utils/api-response";
import { menuCategoryService } from "./menuCategory.service";
const getPageFromQuery = (pageQuery) => {
    const rawPage = Array.isArray(pageQuery) ? pageQuery[0] : pageQuery;
    const pageValue = typeof rawPage === "string" ? rawPage : "1";
    const parsedPage = Number.parseInt(pageValue, 10);
    if (Number.isNaN(parsedPage) || parsedPage < 1) {
        return 1;
    }
    return parsedPage;
};
export const createMenuCategory = asyncHandler(async (req, res) => {
    const result = await menuCategoryService.createMenuCategory(req.body);
    ApiResponse.created(res, result.data, result.message);
});
export const getMenuCategories = asyncHandler(async (req, res) => {
    const page = getPageFromQuery(req.query.page);
    const result = await menuCategoryService.getMenuCategories(req.params.vendorId, page);
    ApiResponse.paginated(res, result.data, result.meta, result.message);
});
