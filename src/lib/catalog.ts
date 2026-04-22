export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
};

export type Inclusion = {
  id: string;
  name: string;
  image: string;
};

export const SOURDOUGH_ID = "sourdough";
export const INCLUSION_PRICE = 2;

export const products: Product[] = [
  {
    id: SOURDOUGH_ID,
    name: "Sourdough",
    price: 10,
    description: "Slow-fermented with a crisp crust and airy crumb for everyday tables and cozy breakfasts.",
    image: "/assets/products/sour_dough.PNG",
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
    image: "/assets/products/cinnamon_rolls.PNG",
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

export const sourdoughInclusions: Inclusion[] = [
  {
    id: "blueberries-brown-sugar",
    name: "Blueberries in Brown Sugar",
    image: "/assets/inclusions/Blueberries in Brown Sugar.PNG",
  },
  {
    id: "cheddar-jalapeno",
    name: "Cheddar & Jalapeno",
    image: "/assets/inclusions/Cheddar & Jalapeño.PNG",
  },
  {
    id: "cherry-sugar",
    name: "Cherry & Sugar",
    image: "/assets/inclusions/Cherry & Sugar.PNG",
  },
  {
    id: "cinnamon-sugar",
    name: "Cinnamon & Sugar",
    image: "/assets/inclusions/Cinnamon & Sugar.PNG",
  },
  {
    id: "multigrain",
    name: "Multigrain",
    image: "/assets/inclusions/Multigrain.PNG",
  },
];
