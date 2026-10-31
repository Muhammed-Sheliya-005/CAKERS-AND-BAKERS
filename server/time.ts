const calendarDate = /^\d{4}-\d{2}-\d{2}$/;
const wallTime = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

function partsInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== "literal") parts[part.type] = part.value;
    return parts;
  }, {});
}

export function localDateInTimezone(value = new Date(), timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function localDateTimeToUtc(dateText: string, timeText: string, timeZone: string) {
  if (!calendarDate.test(dateText)) throw new Error("Invalid local date.");
  const match = wallTime.exec(timeText);
  if (!match) throw new Error("Invalid local time.");
  const [, hourText, minuteText, secondText = "0", fractionText = "0"] = match;
  const year = Number(dateText.slice(0, 4));
  const month = Number(dateText.slice(5, 7));
  const day = Number(dateText.slice(8, 10));
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fractionText.padEnd(3, "0"));
  if (hour > 23 || minute > 59 || second > 59) throw new Error("Invalid local time.");
  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let guess = targetWallTime;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const guessDate = new Date(guess);
    const parts = partsInZone(guessDate, timeZone);
    const localWallAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
      guessDate.getUTCMilliseconds()
    );
    const adjustment = targetWallTime - localWallAsUtc;
    if (adjustment === 0) return guessDate;
    guess += adjustment;
  }
  const result = new Date(guess);
  const resultParts = partsInZone(result, timeZone);
  if (
    resultParts.year !== String(year) ||
    resultParts.month !== String(month).padStart(2, "0") ||
    resultParts.day !== String(day).padStart(2, "0") ||
    resultParts.hour !== String(hour).padStart(2, "0") ||
    resultParts.minute !== String(minute).padStart(2, "0")
  ) throw new Error("That local time is not valid in the configured business timezone.");
  return result;
}

export function dateWindowInTimezone(startDate: string, endDate: string, timeZone: string) {
  if (!calendarDate.test(startDate) || !calendarDate.test(endDate) || endDate < startDate) {
    throw new Error("Choose a valid date range with the end date on or after the start date.");
  }
  const startCalendar = Date.parse(`${startDate}T00:00:00.000Z`);
  const endCalendar = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(startCalendar) || !Number.isFinite(endCalendar) || endCalendar - startCalendar > 366 * 86_400_000) {
    throw new Error("Choose a valid report range of up to 366 days.");
  }
  return {
    from: localDateTimeToUtc(startDate, "00:00:00.000", timeZone),
    to: localDateTimeToUtc(endDate, "23:59:59.999", timeZone),
  };
}

export function localTimeRangeStartToUtc(dateText: string, timeRange: string, timeZone: string) {
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(timeRange);
  if (!match) throw new Error("Choose a valid pickup or delivery time.");
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toLowerCase();
  if (hour < 1 || hour > 12 || minute > 59) throw new Error("Choose a valid pickup or delivery time.");
  if (meridiem === "am") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  return localDateTimeToUtc(dateText, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, timeZone);
}
