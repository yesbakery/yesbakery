export type PickupScheduleSettings = {
  blockSaturday: boolean;
  blockSunday: boolean;
  blockedDates: string[];
};

export const defaultPickupScheduleSettings: PickupScheduleSettings = {
  blockSaturday: false,
  blockSunday: false,
  blockedDates: [],
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

function isDateBlocked(dateString: string, settings: PickupScheduleSettings = defaultPickupScheduleSettings) {
  return settings.blockedDates.includes(dateString);
}

function createPacificDate(year: number, month: number, day: number, hour: number, minute: number) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = getPacificOffsetMinutes(utcGuess);

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60_000);
}

function getNextWeekendSaturdayDate(referenceDate = new Date()) {
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

export function getNextAvailableSaturdayPickupDate(
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
  referenceDate = new Date(),
) {
  let saturdayDate = getNextWeekendSaturdayDate(referenceDate);

  for (let index = 0; index < 52; index += 1) {
    if (!settings.blockSaturday && !isDateBlocked(saturdayDate, settings)) {
      return saturdayDate;
    }

    saturdayDate = addDaysToDateString(saturdayDate, 7);
  }

  return "";
}

export function getNextAvailableWeekendPickupDates(
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
  referenceDate = new Date(),
) {
  let saturdayDate = getNextWeekendSaturdayDate(referenceDate);

  for (let index = 0; index < 52; index += 1) {
    const sundayDate = addDaysToDateString(saturdayDate, 1);
    const saturdayAvailable = !settings.blockSaturday && !isDateBlocked(saturdayDate, settings);
    const sundayAvailable = !settings.blockSunday && !isDateBlocked(sundayDate, settings);

    if (saturdayAvailable || sundayAvailable) {
      return {
        saturday: saturdayAvailable ? saturdayDate : "",
        sunday: sundayAvailable ? sundayDate : "",
      };
    }

    saturdayDate = addDaysToDateString(saturdayDate, 7);
  }

  return {
    saturday: "",
    sunday: "",
  };
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
  return getPickupDateOptions(settings, 1)[0] || "";
}

export function getLatestPickupDate() {
  return "";
}

export function getPickupDateOptions(
  settings: PickupScheduleSettings = defaultPickupScheduleSettings,
  limit = 16,
) {
  const options: string[] = [];
  const saturdayCursor = new Date(`${getNextWeekendSaturdayDate()}T00:00:00`);
  let weekCount = 0;

  while (options.length < limit && weekCount < 52) {
    const saturdayDate = toLocalDateString(saturdayCursor);
    if (!settings.blockSaturday && !isDateBlocked(saturdayDate, settings)) {
      options.push(saturdayDate);
    }

    if (!settings.blockSunday && options.length < limit) {
      const sundayCursor = new Date(saturdayCursor);
      sundayCursor.setDate(sundayCursor.getDate() + 1);
      const sundayDate = toLocalDateString(sundayCursor);
      if (!isDateBlocked(sundayDate, settings)) {
        options.push(sundayDate);
      }
    }

    saturdayCursor.setDate(saturdayCursor.getDate() + 7);
    weekCount += 1;
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
  return isPickupDayAllowed(pickupDay, settings) && !isDateBlocked(value, settings);
}
