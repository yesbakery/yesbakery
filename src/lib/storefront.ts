import { getMinimumQuantityForProduct, Product } from "./catalog";
import {
  defaultPickupScheduleSettings,
  getEarliestPickupDate as getEarliestPickupDateBase,
  getEarliestShippingDate as getEarliestShippingDateBase,
  getLatestPickupDate as getLatestPickupDateBase,
  getPickupDateOptions as getPickupDateOptionsBase,
  isPickupDateValid as isPickupDateValidBase,
  PickupScheduleSettings,
} from "./pickup-scheduling";
export { defaultPickupScheduleSettings };
export type { PickupScheduleSettings };

export type CartItem = Product & {
  cartKey: string;
  quantity: number;
  unitPrice: number;
  selectedInclusions: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
};

export type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  fulfillmentMethod: "pickup" | "shipping-request" | "shipping-code";
  paymentMethod: "stripe" | "pickup";
  pickupApprovalCode: string;
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
  paymentMethod: "pickup",
  pickupApprovalCode: "",
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
  const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : item.price;
  const minimumQuantity = getMinimumQuantityForProduct(item.id);

  return {
    ...item,
    cartKey: typeof item.cartKey === "string" && item.cartKey.length > 0 ? item.cartKey : item.id,
    quantity:
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.max(item.quantity, minimumQuantity)
        : minimumQuantity,
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

export function canPlacePickupOrder() {
  return true;
}

export function getEarliestShippingDate() {
  return getEarliestShippingDateBase();
}

export function getEarliestPickupDate(settings: PickupScheduleSettings = defaultPickupScheduleSettings) {
  return getEarliestPickupDateBase(settings);
}

export function getLatestPickupDate() {
  return getLatestPickupDateBase();
}

export function getPickupDateOptions(
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
  limit = 16,
) {
  return getPickupDateOptionsBase(settings, limit);
}

export function isPickupDateValid(
  value: string,
  fulfillmentMethod: CheckoutForm["fulfillmentMethod"] = "pickup",
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
) {
  return isPickupDateValidBase(value, fulfillmentMethod, settings);
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

export function getCartItemMinimumQuantity(item: Pick<CartItem, "id">) {
  return getMinimumQuantityForProduct(item.id);
}
