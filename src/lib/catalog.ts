export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
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
  },
  {
    id: "empanada",
    name: "Empanada",
    price: 3,
    description: "Golden pastry with a flaky finish that feels comforting, simple, and freshly baked.",
    image: "/assets/products/empanadas.PNG",
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
