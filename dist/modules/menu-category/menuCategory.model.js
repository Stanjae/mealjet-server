import { model, Schema } from "mongoose";
const menuCategorySchema = new Schema({
    vendorId: {
        type: Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: "text", // text index for search
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
    logo: {
        type: String,
        required: false,
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
const MenuCategory = model("MenuCategory", menuCategorySchema);
export default MenuCategory;
