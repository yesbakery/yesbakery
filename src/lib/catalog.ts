export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  minimumQuantity?: number;
};

export const SOURDOUGH_ID = "sourdough";

export const products: Product[] = [
  {
    id: SOURDOUGH_ID,
    name: "Plain Sourdough",
    price: 10,
    description: "Slow-fermented with a crisp crust and airy crumb for everyday tables and cozy breakfasts.",
    image: "/assets/products/sourdough/sour_dough-plain.PNG",
  },
  {
    id: "sourdough-raspberry-white-chocolate",
    name: "Sourdough with Raspberry & White Chocolate",
    price: 12,
    description: "Our signature slow-fermented loaf with bright raspberry notes and pockets of white chocolate.",
    image: "/assets/products/sourdough/raspberry_white_chocolate_20260505.jpg",
  },
  {
    id: "sourdough-blueberry-cream-cheese",
    name: "Sourdough with Blueberry & Cream Cheese",
    price: 12,
    description: "A soft-tangy sourdough variation layered with blueberry sweetness and creamy richness.",
    image: "/assets/products/sourdough/Blueberries_Cream_Cheese.jpg",
  },
  {
    id: "sourdough-multi-grain",
    name: "Sourdough Multi-Grain",
    price: 12,
    description: "A hearty sourdough loaf with a multigrain finish for extra texture and a more rustic bite.",
    image: "/assets/products/sourdough/multi-grain.jpg",
  },
  {
    id: "sourdough-double-chocolate-chocolate-chips",
    name: "Sourdough with Double Chocolate & Chocolate Chips",
    price: 12,
    description: "A rich chocolate sourdough loaf with extra chocolate chips folded throughout.",
    image: "/assets/products/sourdough/Double_Chocolate_with_Chocolate_Chips.jpg",
  },
  {
    id: "sourdough-jalapeno-cheddar",
    name: "Sourdough with Jalapeno & Cheddar Cheese",
    price: 12,
    description: "A savory sourdough loaf baked with jalapeno and cheddar cheese for a bolder, bakery-style bite.",
    image: "/assets/products/sourdough/jalapeno_and_Cheddar-Cheese.PNG",
  },
  {
    id: "sourdough-cinnamon-sugar",
    name: "Sourdough with Cinnamon & Sugar",
    price: 12,
    description: "A cozy sourdough loaf with sweet cinnamon warmth and a soft sugar-kissed finish.",
    image: "/assets/products/sourdough/cinnamon_sugar.jpeg",
  },
  {
    id: "quesadilla-salvadorena",
    name: "Quesadilla Salvadorena",
    price: 25,
    description: "A classic Salvadoran bake with a soft, rich interior and a golden sesame-speckled top.",
    image: "/assets/products/quesadilla_salvadorena.PNG",
  },
  {
    id: "cinnamon-rolls",
    name: "Cinnamon Rolls",
    price: 6,
    description: "Tender spirals layered with cinnamon warmth and baked until beautifully golden.",
    image: "/assets/products/cinnamon.jpg",
    minimumQuantity: 4,
  },
  {
    id: "empanada",
    name: "Empanada",
    price: 3,
    description: "Golden pastry filled with Cajeta, a rich Mexican caramel, wrapped in a flaky freshly baked crust.",
    image: "/assets/products/empanadas.PNG",
    minimumQuantity: 4,
  },
  {
    id: "gluten-free-chocolate-chip-cookies",
    name: "Gluten-Free Chocolate Chip Cookies",
    price: 3,
    description:
      "Can't eat gluten? You can still enjoy a warm, soft, chocolate chip cookie. Freshly baked, loaded with chocolate chips, and made with love because gluten-free should still taste amazing.",
    image: "/assets/products/gluten-free-chocolate-chip-cookies.jpeg",
    minimumQuantity: 4,
  },
  {
    id: "tropical-paradise-jam",
    name: "Tropical Paradise Jam",
    price: 5,
    description:
      "A 4-ounce jam bursting with pineapple, mango, strawberries, cherry, and raspberry for a bright, fruity spread.",
    image: "/assets/products/jams.PNG",
  },
];

const spanishProductNames: Record<string, string> = {
  [SOURDOUGH_ID]: "Pan de Masa Madre Clásico",
  "sourdough-raspberry-white-chocolate": "Pan de Masa Madre con Frambuesa y Chocolate Blanco",
  "sourdough-blueberry-cream-cheese": "Pan de Masa Madre con Arándano y Queso Crema",
  "sourdough-multi-grain": "Pan de Masa Madre Multigrano",
  "sourdough-double-chocolate-chocolate-chips": "Pan de Masa Madre con Doble Chocolate y Chispas de Chocolate",
  "sourdough-jalapeno-cheddar": "Pan de Masa Madre con Jalapeño y Queso Cheddar",
  "sourdough-cinnamon-sugar": "Pan de Masa Madre con Canela y Azúcar",
  "quesadilla-salvadorena": "Quesadilla Salvadoreña",
  "cinnamon-rolls": "Rollos de Canela",
  empanada: "Empanada",
  "gluten-free-chocolate-chip-cookies": "Galletas de Chispas de Chocolate Sin Gluten",
  "tropical-paradise-jam": "Mermelada Paraíso Tropical",
};

const spanishProductDescriptions: Record<string, string> = {
  [SOURDOUGH_ID]:
    "Fermentada lentamente con una corteza crujiente y una miga aireada para mesas de todos los días y desayunos acogedores.",
  "sourdough-raspberry-white-chocolate":
    "Nuestro pan de masa madre de fermentación lenta con notas brillantes de frambuesa y bolsillos de chocolate blanco.",
  "sourdough-blueberry-cream-cheese":
    "Una variación suave y ligeramente ácida de masa madre con dulzura de arándano y cremosidad de queso crema.",
  "sourdough-multi-grain":
    "Un pan abundante de masa madre con acabado multigrano para más textura y un bocado más rústico.",
  "sourdough-double-chocolate-chocolate-chips":
    "Un pan rico de masa madre con doble chocolate y chispas de chocolate integradas en toda la pieza.",
  "sourdough-jalapeno-cheddar":
    "Un pan salado de masa madre horneado con jalapeño y queso cheddar para un sabor más intenso y artesanal.",
  "sourdough-cinnamon-sugar":
    "Un pan acogedor de masa madre con el calor dulce de la canela y un acabado suave con azúcar.",
  "quesadilla-salvadorena":
    "Un clásico salvadoreño con interior suave y abundante, coronado con una superficie dorada con ajonjolí.",
  "cinnamon-rolls": "Espirales tiernas con el calor de la canela, horneadas hasta quedar doradas y hermosas.",
  empanada:
    "Pastel dorado relleno de cajeta, un caramelo mexicano delicioso, con un acabado hojaldrado y recién horneado.",
  "gluten-free-chocolate-chip-cookies":
    "No puede comer gluten? Aun puede disfrutar una galleta tibia, suave y con chispas de chocolate. Horneadas frescas, cargadas de chocolate y hechas con amor porque sin gluten tambien debe saber increible.",
  "tropical-paradise-jam":
    "Una mermelada de 4 onzas con piña, mango, fresas, cereza y frambuesa para una mezcla brillante y frutal.",
};

export function getProductById(productId: string) {
  return products.find((product) => product.id === productId);
}

export function getMinimumQuantityForProduct(productId: string) {
  return getProductById(productId)?.minimumQuantity || 1;
}

export function getLocalizedProductName(productId: string, fallbackName: string, language: "en" | "es") {
  if (language === "es") {
    return spanishProductNames[productId] || fallbackName;
  }

  return fallbackName;
}

export function getLocalizedProductDescription(
  productId: string,
  fallbackDescription: string,
  language: "en" | "es",
) {
  if (language === "es") {
    return spanishProductDescriptions[productId] || fallbackDescription;
  }

  return fallbackDescription;
}
