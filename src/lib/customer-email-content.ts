export function renderPickupConfirmationPanel(pickupDate: string) {
  return `
    <div style="margin: 24px 0; overflow: hidden; border-radius: 22px; border: 2px solid #e7a23b; background: #fff8e8; font-family: Arial, sans-serif;">
      <div style="padding: 16px 22px; background: #b43d2a; color: #ffffff; text-align: center;">
        <p style="margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;">Your order is confirmed</p>
        <p style="margin: 8px 0 0; font-size: 25px; line-height: 1.25; font-weight: 800;">We will fulfill your order for pickup</p>
      </div>
      <div style="padding: 22px; color: #5f311c;">
        <p style="margin: 0 0 6px; color: #9a4c24; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-align: center; text-transform: uppercase;">Requested pickup date</p>
        <p style="margin: 0 0 22px; color: #b43d2a; font-size: 28px; line-height: 1.25; font-weight: 800; text-align: center;">${pickupDate || "Not provided"}</p>
        <p style="margin: 0 0 14px; font-size: 18px; font-weight: 800;">How pickup works</p>
        <div style="display: grid; gap: 12px;">
          <p style="margin: 0; padding: 12px 14px; border-radius: 14px; background: #ffffff;"><strong style="color: #b43d2a;">1. Order confirmed:</strong> This email confirms that we received your order and will fulfill it.</p>
          <p style="margin: 0; padding: 12px 14px; border-radius: 14px; background: #ffffff;"><strong style="color: #b43d2a;">2. We start baking:</strong> You will receive a second email when we are preparing your order.</p>
          <p style="margin: 0; padding: 12px 14px; border-radius: 14px; background: #ffffff;"><strong style="color: #b43d2a;">3. Ready for pickup:</strong> A final pickup email will tell you that your order is ready and include the full pickup address and a Google Maps link.</p>
        </div>
        <p style="margin: 18px 0 0; padding: 14px; border-radius: 14px; background: #ffe1d8; color: #8e2f20; font-weight: 800; line-height: 1.55; text-align: center;">Please wait for the “ready for pickup” email before traveling to pick up your order.</p>
      </div>
    </div>
  `;
}

export function renderBakingPickupPanel() {
  return `
    <div style="margin: 22px 0; padding: 20px; border-radius: 20px; border: 2px solid #e7a23b; background: #fff3cf; color: #5f311c; font-family: Arial, sans-serif;">
      <p style="margin: 0 0 8px; color: #b43d2a; font-size: 21px; font-weight: 800;">We’re baking your order now!</p>
      <p style="margin: 0; line-height: 1.7;">One more email is coming when your order is ready. That email will include the <strong>full pickup address</strong> and a <strong>Google Maps link</strong>.</p>
      <p style="margin: 14px 0 0; padding: 12px; border-radius: 12px; background: #ffffff; color: #8e2f20; font-weight: 800; text-align: center;">Please wait for the “ready for pickup” email before heading over.</p>
    </div>
  `;
}
