export const getTodayIso = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const REFERENCE_TODAY = getTodayIso();

export const BUSINESS_HOURS = {
  startTime: "09:00",
  endTime: "18:00",
} as const;
