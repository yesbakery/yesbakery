import { INCLUSION_PRICE, Inclusion, Product, SOURDOUGH_ID } from "./catalog";

export type CartItem = Product & {
  cartKey: string;
  quantity: number;
  unitPrice: number;
  selectedInclusions: Inclusion[];
};

export type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  fulfillmentMethod: "pickup" | "shipping-request" | "shipping-code";
  shippingAddress: string;
  shippingRequest: string;
  shippingApprovalCode: string;
  notes: string;
};

export type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
  message: string;
};

export const CART_STORAGE_KEY = "yesbakery-cart";
export const CHECKOUT_FORM_STORAGE_KEY = "yesbakery-checkout-form";
export const CART_UPDATED_EVENT = "yesbakery-cart-updated";
export const CHECKOUT_FORM_UPDATED_EVENT = "yesbakery-checkout-form-updated";

export const initialCheckoutForm: CheckoutForm = {
  fullName: "",
  email: "",
  phone: "",
  pickupDate: "",
  fulfillmentMethod: "pickup",
  shippingAddress: "",
  shippingRequest: "",
  shippingApprovalCode: "",
  notes: "",
};

export const initialContactForm: ContactForm = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
};

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function normalizeCartItem(item: Partial<CartItem> & Product): CartItem {
  const selectedInclusions = Array.isArray(item.selectedInclusions) ? item.selectedInclusions : [];
  const unitPrice =
    typeof item.unitPrice === "number"
      ? item.unitPrice
      : item.price + selectedInclusions.length * INCLUSION_PRICE;

  return {
    ...item,
    cartKey:
      typeof item.cartKey === "string" && item.cartKey.length > 0
        ? item.cartKey
        : item.id === SOURDOUGH_ID && selectedInclusions.length > 0
          ? `${item.id}:${selectedInclusions
              .map((inclusion) => inclusion.id)
              .sort()
              .join("-")}`
          : item.id,
    quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
    unitPrice,
    selectedInclusions,
  };
}

export function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!storedCart) {
    return [];
  }

  try {
    const parsedCart = JSON.parse(storedCart) as Array<Partial<CartItem> & Product>;
    return parsedCart.map(normalizeCartItem);
  } catch {
    return [];
  }
}

export function saveStoredCart(cart: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function readStoredForm(): CheckoutForm {
  if (typeof window === "undefined") {
    return initialCheckoutForm;
  }

  const storedForm = window.localStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
  if (!storedForm) {
    return initialCheckoutForm;
  }

  try {
    return JSON.parse(storedForm) as CheckoutForm;
  } catch {
    return initialCheckoutForm;
  }
}

export function saveStoredForm(form: CheckoutForm) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(form));
  window.dispatchEvent(new Event(CHECKOUT_FORM_UPDATED_EVENT));
}

export function clearStoredCheckout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CART_STORAGE_KEY);
  window.localStorage.removeItem(CHECKOUT_FORM_STORAGE_KEY);
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  window.dispatchEvent(new Event(CHECKOUT_FORM_UPDATED_EVENT));
}

export function buildSourdoughCartItem(product: Product, selectedInclusions: Inclusion[]): CartItem {
  const sortedInclusions = [...selectedInclusions].sort((left, right) => left.name.localeCompare(right.name));
  const inclusionKey = sortedInclusions.map((inclusion) => inclusion.id).join("-");

  return {
    ...product,
    cartKey: inclusionKey ? `${product.id}:${inclusionKey}` : product.id,
    quantity: 1,
    unitPrice: product.price + sortedInclusions.length * INCLUSION_PRICE,
    selectedInclusions: sortedInclusions,
  };
}

export function getEarliestPickupDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 2);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isPickupDateValid(value: string) {
  if (!value) {
    return false;
  }

  return value >= getEarliestPickupDate();
}

export function formatCartSummary(cart: CartItem[]) {
  return cart
    .map((item) => {
      const inclusionSummary =
        item.selectedInclusions.length > 0
          ? ` (${item.selectedInclusions.map((inclusion) => inclusion.name).join(", ")})`
          : "";

      return `${item.quantity}x ${item.name}${inclusionSummary}`;
    })
    .join(" | ");
}

export function getStoredCartItemCount() {
  return readStoredCart().reduce((total, item) => total + item.quantity, 0);
}
