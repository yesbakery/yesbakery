import { Resend } from "resend";
import { renderOrderItemsEmail } from "./email-order-items";

export type PaidOrderEmailItem = {
  name: string;
  quantity: number;
  amount?: number;
};

export type PaidOrderEmailDetails = {
  sessionId: string;
  customerEmail: string;
  customerName: string;
  phone: string;
  pickupDate: string;
  fulfillmentMethod: string;
  shippingRequest: string;
  notes: string;
  amountTotal: number;
  currency: string;
  items: PaidOrderEmailItem[];
  origin: string;
};

export type PaidOrderEmailResult = {
  admin: {
    attempted: boolean;
    id: string;
    error: string;
  };
  customer: {
    attempted: boolean;
    id: string;
    error: string;
  };
  skippedReason: string;
};

function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || "",
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev",
  };
}

function formatTotal(amountTotal: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amountTotal / 100);
}

function formatEmailError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown email error.";
  }
}

export async function sendPaidOrderEmails(details: PaidOrderEmailDetails): Promise<PaidOrderEmailResult> {
  const result: PaidOrderEmailResult = {
    admin: {
      attempted: false,
      id: "",
      error: "",
    },
    customer: {
      attempted: false,
      id: "",
      error: "",
    },
    skippedReason: "",
  };
  const { apiKey, fromEmail } = getResendConfig();

  if (!apiKey || apiKey === "re_xxxxxxxxx") {
    console.error("Paid order emails skipped because Resend is not configured.");
    result.skippedReason = "RESEND_API_KEY is not configured.";
    return result;
  }

  if (!fromEmail) {
    console.error("Paid order emails skipped because RESEND_FROM_EMAIL is not configured.");
    result.skippedReason = "RESEND_FROM_EMAIL is not configured.";
    return result;
  }

  const resend = new Resend(apiKey);
  const itemListMarkup = renderOrderItemsEmail(details.items, details.origin);
  const totalPaid = formatTotal(details.amountTotal, details.currency);
  const shippingRequestMarkup =
    details.fulfillmentMethod === "shipping-code" || details.fulfillmentMethod === "shipping-request"
      ? `<p><strong>Shipping request:</strong> ${details.shippingRequest || "Requested. Please review the arrangement details."}</p>`
      : "";
  const notesMarkup =
    details.notes && details.notes !== "None" ? `<p><strong>Order notes:</strong> ${details.notes}</p>` : "";
  const orderDetailsMarkup = `
    <p><strong>Order summary:</strong></p>
    ${itemListMarkup}
    <p><strong>Total paid:</strong> ${totalPaid}</p>
    <p><strong>Pickup date:</strong> ${details.pickupDate || "Not provided"}</p>
    <p><strong>Fulfillment:</strong> ${details.fulfillmentMethod}</p>
    <p><strong>Phone:</strong> ${details.phone || "Not provided"}</p>
    <p><strong>Stripe session:</strong> ${details.sessionId}</p>
    ${shippingRequestMarkup}
    ${notesMarkup}
  `;

  try {
    result.admin.attempted = true;
    const adminEmail = await resend.emails.send({
      from: fromEmail,
      to: "yesbakery@gmail.com",
      replyTo: details.customerEmail || "yesbakery@gmail.com",
      subject: `New paid order from ${details.customerName || details.customerEmail || "Yes Bakery customer"}`,
      html: `
        <h2>New Paid Order</h2>
        <p><strong>Name:</strong> ${details.customerName || "Not provided"}</p>
        <p><strong>Email:</strong> ${details.customerEmail || "Not provided"}</p>
        ${orderDetailsMarkup}
      `,
    });
    result.admin.id = adminEmail.data?.id || "";
  } catch (error) {
    console.error("Paid order admin email failed.", error);
    result.admin.error = formatEmailError(error);
  }

  if (!details.customerEmail) {
    return result;
  }

  try {
    result.customer.attempted = true;
    const customerEmail = await resend.emails.send({
      from: fromEmail,
      to: details.customerEmail,
      replyTo: "yesbakery@gmail.com",
      subject: "Your Yes Bakery order is confirmed",
      html: `
        <h2>Thank you for your order${details.customerName ? `, ${details.customerName}` : ""}.</h2>
        <p>Your payment has been received and your Yes Bakery order is confirmed.</p>
        ${
          details.fulfillmentMethod === "pickup"
            ? `
              <div style="margin: 22px auto; max-width: 460px; padding: 20px; border-radius: 20px; background: #fbf1ea; border: 1px solid rgba(166, 84, 45, 0.16); text-align: center;">
                <p style="margin: 0 0 8px; color: #8f583c; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700;">
                  Pick Up Date
                </p>
                <p style="margin: 0; color: #b43d2a; font-size: 32px; line-height: 1.2; font-weight: 800;">
                  ${details.pickupDate || "Not provided"}
                </p>
                <p style="margin: 14px 0 0; color: #6f5143; line-height: 1.7;">
                  This is not a delivery order, you will have to pick this order up at Union City, CA. Details will be provided once your order is completed.
                </p>
              </div>
            `
            : ""
        }
        ${orderDetailsMarkup}
        <p>Thank you for supporting Yes Bakery & More.</p>
      `,
    });
    result.customer.id = customerEmail.data?.id || "";
  } catch (error) {
    console.error("Paid order customer email failed.", error);
    result.customer.error = formatEmailError(error);
  }

  return result;
}
