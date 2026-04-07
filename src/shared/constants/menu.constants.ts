export const initialMenuItemValues = {
  name: '',
  category: '',
  description: '',
  price: 0,
  discountPrice: 0,
  prepTime: 0,
  isAvailable: true,
  isPopular: false,
  isFeatured: false,
  calories: 0,
  allergens: [],
  tags: [],
  addons: [
    {
      name: '',
      options: [{ label: '', extraPrice: 0, isAvailable: true }],
      required: true,
      maxSelect: 0,
      minSelect: 1,
      key: ''
    },
  ],
  image: undefined,
  images: [],
};


export const menuItemsTags = [
  'Snacks',
  'African',
  'Breakfast',
  'Meat',
  'Lunch',
  'Fries',
  'Vegetables',
];

export const menuAllergens = [
  'Gluten',
  'Peanuts',
  'Shellfish',
  'Dairy',
  'Soy',
  'Eggs',
  'Tree Nuts',
  'Fish',
];