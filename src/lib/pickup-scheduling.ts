export type PickupScheduleSettings = {
  blockSaturday: boolean;
  blockSunday: boolean;
};

export const defaultPickupScheduleSettings: PickupScheduleSettings = {
  blockSaturday: false,
  blockSunday: false,
};

const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const PACIFIC_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const PACIFIC_OFFSET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  timeZoneName: "shortOffset",
});

const weekdayToIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getPacificParts(referenceDate = new Date()) {
  const parts = PACIFIC_PARTS_FORMATTER.formatToParts(referenceDate);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    weekday: weekdayToIndex[lookup.weekday] ?? 0,
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
  };
}

function getPacificOffsetMinutes(referenceDate: Date) {
  const parts = PACIFIC_OFFSET_FORMATTER.formatToParts(referenceDate);
  const offsetValue = parts.find((part) => part.type === "timeZoneName")?.value || "GMT-8";
  const match = offsetValue.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return -8 * 60;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");

  return sign * (hours * 60 + minutes);
}

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

function toDateStringFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addDaysToDateString(dateString: string, daysToAdd: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + daysToAdd);

  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
}

function createPacificDate(year: number, month: number, day: number, hour: number, minute: number) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getPacificOffsetMinutes(utcGuess);

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60_000);
}

export function getNextAvailableSaturdayPickupDate(
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
  referenceDate = new Date(),
) {
  if (settings.blockSaturday) {
    return "";
  }

  const pacificParts = getPacificParts(referenceDate);
  const todayString = toDateStringFromParts(pacificParts);
  let daysUntilSaturday = (6 - pacificParts.weekday + 7) % 7;
  const isPastThursdayCutoff =
    pacificParts.weekday > 4 || (pacificParts.weekday === 4 && pacificParts.hour >= 18);

  if (isPastThursdayCutoff) {
    if (daysUntilSaturday === 0) {
      daysUntilSaturday = 7;
    } else {
      daysUntilSaturday += 7;
    }
  }

  return addDaysToDateString(todayString, daysUntilSaturday);
}

export function getNextSaturdayCutoffDate(referenceDate = new Date()) {
  const pacificParts = getPacificParts(referenceDate);
  const todayString = toDateStringFromParts(pacificParts);
  let daysUntilThursday = (4 - pacificParts.weekday + 7) % 7;
  const isPastThursdayCutoff =
    pacificParts.weekday > 4 || (pacificParts.weekday === 4 && pacificParts.hour >= 18);

  if (isPastThursdayCutoff && daysUntilThursday === 0) {
    daysUntilThursday = 7;
  }

  const cutoffDateString = addDaysToDateString(todayString, daysUntilThursday);
  const [year, month, day] = cutoffDateString.split("-").map(Number);

  return createPacificDate(year, month, day, 18, 0);
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
  const saturdayDate = getNextAvailableSaturdayPickupDate(settings);

  if (saturdayDate) {
    return saturdayDate;
  }

  if (settings.blockSunday) {
    return "";
  }

  const date = startOfToday();
  date.setDate(date.getDate() + 2);
  for (let index = 0; index < 366; index += 1) {
    if (date.getDay() === 0 && !settings.blockSunday) {
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
    if (!settings.blockSaturday) {
      if (cursor.getDay() === 6) {
        options.push(toLocalDateString(cursor));
      }
    } else if (!settings.blockSunday && cursor.getDay() === 0) {
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
  if (!settings.blockSaturday) {
    return pickupDay === 6;
  }

  return pickupDay === 0 && !settings.blockSunday;
}
