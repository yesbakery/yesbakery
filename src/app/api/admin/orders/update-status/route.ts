import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import {
  getSuggestedProducts,
  getUnifiedOrder,
  OrderStatus,
  updateUnifiedOrder,
  UnifiedOrder,
} from "../../../../../lib/order-processing";

type Payload = {
  id?: string;
  type?: UnifiedOrder["type"];
  status?: OrderStatus;
};

const EMAIL_LOGO_PATH = "/assets/email/logo.png";

const EMAIL_PRODUCT_IMAGE_PATHS: Record<string, string> = {
  "/assets/products/sourdough/sour_dough-plain.PNG": "/assets/email/products/sourdough/sour_dough-plain.PNG",
  "/assets/products/sourdough/raspberry_white_chocolate_20260505.jpg":
    "/assets/email/products/sourdough/raspberry_white_chocolate_20260505.jpg",
  "/assets/products/sourdough/Blueberries_Cream_Cheese.jpg":
    "/assets/email/products/sourdough/Blueberries_Cream_Cheese.jpg",
  "/assets/products/sourdough/multi-grain.jpg": "/assets/email/products/sourdough/multi-grain.jpg",
  "/assets/products/sourdough/Double_Chocolate_with_Chocolate_Chips.jpg":
    "/assets/email/products/sourdough/Double_Chocolate_with_Chocolate_Chips.jpg",
  "/assets/products/sourdough/jalapeno_and_Cheddar-Cheese.PNG":
    "/assets/email/products/sourdough/jalapeno_and_Cheddar-Cheese.PNG",
  "/assets/products/quesadilla_salvadorena.PNG": "/assets/email/products/quesadilla_salvadorena.PNG",
  "/assets/products/cinnamon.jpg": "/assets/email/products/cinnamon.jpg",
  "/assets/products/empanadas.PNG": "/assets/email/products/empanadas.PNG",
  "/assets/products/jams.PNG": "/assets/email/products/jams.PNG",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatStatusLabel(status: OrderStatus) {
  switch (status) {
    case "in-progress":
      return "In Progress";
    case "done":
      return "Done";
    case "picked-up":
      return "Picked Up";
    default:
      return "New";
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getContentType(assetPath: string) {
  const extension = path.extname(assetPath).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function buildInlineImageAttachment(publicAssetPath: string, contentId: string) {
  try {
    const assetPath = path.join(process.cwd(), "public", publicAssetPath.replace(/^\//, ""));
    const content = await readFile(assetPath);

    return {
      attachment: {
        content: content.toString("base64"),
        contentId,
        contentType: getContentType(publicAssetPath),
        filename: path.basename(publicAssetPath),
      },
      src: `cid:${contentId}`,
    };
  } catch (error) {
    console.error(`Unable to load email image asset: ${publicAssetPath}`, error);
    return null;
  }
}

type InlineImageAttachment = NonNullable<Awaited<ReturnType<typeof buildInlineImageAttachment>>>;

async function sendPickedUpEmail(order: UnifiedOrder) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!resendApiKey || resendApiKey === "re_xxxxxxxxx" || !order.customerEmail) {
    return;
  }

  const suggestions = getSuggestedProducts(order.orderSummary);
  const resend = new Resend(resendApiKey);
  const logoImage = await buildInlineImageAttachment(EMAIL_LOGO_PATH, "yesbakery-logo");
  const suggestionImages = await Promise.all(
    suggestions.map(async (product, index) => {
      const image = await buildInlineImageAttachment(
        EMAIL_PRODUCT_IMAGE_PATHS[product.image] || product.image,
        `recommended-product-${index + 1}`,
      );

      return {
        image,
        product,
      };
    }),
  );
  const suggestionsMarkup = suggestionImages
    .map(({ image, product }) => {
      return `
        <div style="display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 14px; align-items: center; padding: 14px; border-radius: 18px; background: #fffaf7; border: 1px solid rgba(107, 68, 45, 0.08); margin-top: 12px;">
          ${
            image?.src
              ? `<img src="${image.src}" alt="${product.name}" style="width: 104px; height: 104px; object-fit: cover; border-radius: 14px; display: block;" />`
              : ""
          }
          <div>
            <p style="margin: 0 0 6px; font-weight: 700; color: #5f311c;">${product.name}</p>
            <p style="margin: 0; color: #6f5143; line-height: 1.6;">${product.description}</p>
            <p style="margin: 8px 0 0; color: #a6542d; font-weight: 700;">${formatMoney(product.price * 100, "usd")}</p>
          </div>
        </div>
      `;
    })
    .join("");
  const emailAttachments = [
    ...(logoImage ? [logoImage.attachment] : []),
    ...suggestionImages
      .map(({ image }) => image?.attachment)
      .filter((attachment): attachment is InlineImageAttachment["attachment"] => Boolean(attachment)),
  ];

  await resend.emails.send({
    attachments: emailAttachments,
    from: resendFromEmail,
    to: order.customerEmail,
    replyTo: "yesbakery@gmail.com",
    subject: "Thank you for picking up your Yes Bakery order",
    html: `
      <div style="font-family: Georgia, serif; background: #fbf3ef; padding: 32px; color: #4f2c1a;">
        <div style="max-width: 640px; margin: 0 auto; background: #fffaf7; border-radius: 24px; padding: 28px; border: 1px solid rgba(107, 68, 45, 0.12);">
          ${
            logoImage?.src
              ? `<div style="text-align:center; margin-bottom: 20px;"><img src="${logoImage.src}" alt="Yes Bakery & More logo" style="width: 220px; max-width: 100%; height: auto; display: inline-block;" /></div>`
              : ""
          }
          <h2 style="font-size: 32px; margin: 0 0 14px; color: #5f311c;">Thank you${order.customerName ? `, ${order.customerName}` : ""}.</h2>
          <p style="line-height: 1.7; color: #6f5143; margin-bottom: 16px;">
            We loved preparing your order, and we hope everything brought a little extra warmth to your table.
          </p>
          <p style="line-height: 1.7; color: #6f5143; margin-bottom: 16px;">
            <strong style="color:#5f311c;">Order:</strong> ${order.orderSummary}<br />
            <strong style="color:#5f311c;">Total:</strong> ${formatMoney(order.amountTotal, order.currency)}<br />
            <strong style="color:#5f311c;">Pickup date:</strong> ${order.pickupDate || "Not provided"}
          </p>
          ${
            suggestions.length > 0
              ? `
                <div style="margin-top: 24px; padding: 18px; border-radius: 18px; background: #f8eee7;">
                  <p style="margin: 0 0 10px; font-weight: 700; color: #5f311c;">For your next order, you might enjoy:</p>
                  ${suggestionsMarkup}
                </div>
              `
              : ""
          }
          <p style="line-height: 1.7; color: #6f5143; margin-top: 24px;">
            If you ever have a question about a future order, reply to this email or contact us and we will be happy to help.
          </p>
        </div>
      </div>
    `,
  });
}

export async function POST(request: NextRequest) {
  try {
    let payload: Payload;

    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const id = clean(payload.id);
    const type = payload.type;
    const status = payload.status;

    if (!id || (type !== "paid-online" && type !== "pay-at-pickup")) {
      return NextResponse.json({ error: "Order information is missing." }, { status: 400 });
    }

    if (!status || !["new", "in-progress", "done", "picked-up"].includes(status)) {
      return NextResponse.json({ error: "A valid status is required." }, { status: 400 });
    }

    const existingOrder = await getUnifiedOrder(type, id);

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updatedOrder = await updateUnifiedOrder(type, id, {
      status,
      statusUpdatedAt: now,
      pickedUpAt: status === "picked-up" ? now : existingOrder.pickedUpAt,
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order could not be updated." }, { status: 500 });
    }

    let followUpEmailSent = false;

    if (status === "picked-up" && !existingOrder.followUpEmailSentAt) {
      await sendPickedUpEmail(updatedOrder);
      await updateUnifiedOrder(type, id, {
        followUpEmailSentAt: now,
      });
      followUpEmailSent = true;
    }

    return NextResponse.json({
      ok: true,
      order: {
        ...updatedOrder,
        followUpEmailSentAt: followUpEmailSent ? now : updatedOrder.followUpEmailSentAt,
      },
      statusLabel: formatStatusLabel(status),
    });
  } catch (error) {
    console.error("Admin order status update failed.", error);
    return NextResponse.json({ error: "Order update failed unexpectedly." }, { status: 500 });
  }
}
