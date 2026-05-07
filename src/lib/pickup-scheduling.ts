export type PickupScheduleSettings = {
  blockSaturday: boolean;
  blockSunday: boolean;
};

export const defaultPickupScheduleSettings: PickupScheduleSettings = {
  blockSaturday: false,
  blockSunday: false,
};

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isPickupDayAllowed(day: number, settings: PickupScheduleSettings = defaultPickupScheduleSettings) {
  if (day === 6) {
    return !settings.blockSaturday;
  }

  if (day === 0) {
    return !settings.blockSunday;
  }

  return false;
}

export function getEarliestShippingDate() {
  const date = startOfToday();
  date.setDate(date.getDate() + 2);
  return toLocalDateString(date);
}

export function getEarliestPickupDate(settings: PickupScheduleSettings = defaultPickupScheduleSettings) {
  if (settings.blockSaturday && settings.blockSunday) {
    return "";
  }

  const date = startOfToday();
  date.setDate(date.getDate() + 2);

  for (let index = 0; index < 366; index += 1) {
    if (isPickupDayAllowed(date.getDay(), settings)) {
      return toLocalDateString(date);
    }

    date.setDate(date.getDate() + 1);
  }

  return "";
}

export function getLatestPickupDate() {
  return "";
}

export function getPickupDateOptions(
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
  limit = 16,
) {
  const earliestPickupDate = getEarliestPickupDate(settings);
  if (!earliestPickupDate) {
    return [];
  }

  const options: string[] = [];
  const cursor = new Date(`${earliestPickupDate}T00:00:00`);

  while (options.length < limit) {
    if (isPickupDayAllowed(cursor.getDay(), settings)) {
      options.push(toLocalDateString(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return options;
}

export function isPickupDateValid(
  value: string,
  fulfillmentMethod: "pickup" | "shipping-request" | "shipping-code" = "pickup",
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
) {
  if (!value) {
    return false;
  }

  if (fulfillmentMethod === "shipping-request" || fulfillmentMethod === "shipping-code") {
    return value >= getEarliestShippingDate();
  }

  const earliestPickupDate = getEarliestPickupDate(settings);
  if (!earliestPickupDate || value < earliestPickupDate) {
    return false;
  }

  const pickupDay = new Date(`${value}T00:00:00`).getDay();
  return isPickupDayAllowed(pickupDay, settings);
}
