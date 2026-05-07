import { getLocalizedProductName, products } from "./catalog";

type EmailOrderItem = {
  id?: string;
  name: string;
  quantity: number;
  amount?: number;
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findProductByItem(item: EmailOrderItem) {
  if (item.id) {
    return products.find((product) => product.id === item.id) || null;
  }

  const normalizedName = normalizeLabel(item.name);
  return (
    products.find((product) => normalizeLabel(product.name) === normalizedName) ||
    products.find((product) => normalizedName.includes(normalizeLabel(product.name))) ||
    null
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderOrderItemsEmail(
  items: EmailOrderItem[],
  origin: string,
  language: "en" | "es" = "en",
) {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return `
    <div style="display:grid; gap:12px; margin:16px 0;">
      ${items
        .map((item) => {
          const product = findProductByItem(item);
          const localizedName = getLocalizedProductName(product?.id || "", product?.name || item.name, language);
          const imageUrl = product?.image ? `${origin}${product.image}` : "";
          const amountMarkup =
            typeof item.amount === "number"
              ? `<strong style="color:#5f311c; font-size:15px;">${currencyFormatter.format(item.amount)}</strong>`
              : "";

          return `
            <div style="display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:18px; background:rgba(250, 241, 235, 0.88); border:1px solid rgba(107, 68, 45, 0.08);">
              ${
                imageUrl
                  ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(localizedName)}" width="74" height="74" style="width:74px; height:74px; object-fit:contain; border-radius:16px; background:#fff7f1; padding:6px; display:block;" />`
                  : ""
              }
              <div style="display:grid; gap:4px; flex:1;">
                <strong style="color:#5f311c; font-size:16px;">${escapeHtml(localizedName)}</strong>
                <span style="color:#6f5143; font-size:14px;">${
                  language === "es" ? "Cantidad" : "Quantity"
                }: ${item.quantity}</span>
              </div>
              ${amountMarkup}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}
