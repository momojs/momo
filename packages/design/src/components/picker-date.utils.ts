import {
  getDaysInMonth,
  isDate,
  isValid,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';

/** Controls which date units are visible and emitted by `PickerDate`. */
export type PickerDatePrecision = 'year' | 'month' | 'date';

export interface PickerDateBounds {
  max?: Date;
  min?: Date;
}

export interface PickerDateOptions extends PickerDateBounds {
  precision?: PickerDatePrecision;
}

export interface PickerDateColumnOption {
  label: string;
  value: number;
}

const precisionLengths: Record<PickerDatePrecision, number> = {
  year: 1,
  month: 2,
  date: 3,
};
const yearsBeforeCurrent = 100;
const yearsAfterCurrent = 99;

const toPrecisionStart = (date: Date, precision: PickerDatePrecision) => {
  if (precision === 'year') return startOfYear(date);
  if (precision === 'month') return startOfMonth(date);
  return startOfDay(date);
};

const toValidDate = (
  value: Date | undefined,
  precision: PickerDatePrecision,
) => {
  if (!isDate(value) || !isValid(value)) return undefined;
  const normalized = toPrecisionStart(value, precision);
  return isValid(normalized) ? normalized : undefined;
};

const toBounds = (
  { max, min }: PickerDateBounds,
  precision: PickerDatePrecision,
) => {
  const normalizedMax = toValidDate(max, precision);
  const normalizedMin = toValidDate(min, precision);

  if (
    normalizedMax &&
    normalizedMin &&
    normalizedMin.getTime() > normalizedMax.getTime()
  ) {
    return { max: normalizedMin, min: normalizedMax };
  }

  return { max: normalizedMax, min: normalizedMin };
};

const clampDate = (date: Date, { max, min }: ReturnType<typeof toBounds>) => {
  if (min && date.getTime() < min.getTime()) return new Date(min);
  if (max && date.getTime() > max.getTime()) return new Date(max);
  return date;
};

const createDate = (year: number, month: number, day: number) => {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
};

const toOptions = (start: number, end: number) => {
  const length = Math.max(end - start + 1, 0);
  return Array.from({ length }, (_, index) => {
    const value = start + index;
    return { label: value.toString(), value };
  });
};

export const isPickerDateControlled = (props: object) => {
  return Object.hasOwn(props, 'value');
};

export const normalizePickerDate = (
  value: Date | undefined,
  fallback: Date,
  { max, min, precision = 'date' }: PickerDateOptions = {},
) => {
  const bounds = toBounds({ max, min }, precision);
  const fallbackDate =
    toValidDate(fallback, precision) ?? toPrecisionStart(new Date(), precision);
  const date = toValidDate(value, precision) ?? fallbackDate;
  return clampDate(date, bounds);
};

export const toPickerDateValue = (
  date: Date,
  precision: PickerDatePrecision = 'date',
) => {
  const value = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  return value.slice(0, precisionLengths[precision]);
};

export const toPickerDateColumns = (
  date: Date,
  {
    max,
    min,
    now = new Date(),
    precision = 'date',
  }: PickerDateOptions & { now?: Date } = {},
) => {
  const bounds = toBounds({ max, min }, precision);
  const normalizedNow =
    toValidDate(now, precision) ?? toPrecisionStart(new Date(), precision);
  const normalizedDate = clampDate(
    toValidDate(date, precision) ?? normalizedNow,
    bounds,
  );
  const year = normalizedDate.getFullYear();
  const startYear = Math.max(
    bounds.min?.getFullYear() ?? year - yearsBeforeCurrent,
    year - yearsBeforeCurrent,
  );
  const endYear = Math.min(
    bounds.max?.getFullYear() ?? year + yearsAfterCurrent,
    year + yearsAfterCurrent,
  );
  const years = toOptions(startYear, endYear).filter(({ value }) => {
    return isValid(createDate(value, 0, 1));
  });

  if (precision === 'year') return [years];

  const startMonth =
    bounds.min?.getFullYear() === year ? bounds.min.getMonth() + 1 : 1;
  const endMonth =
    bounds.max?.getFullYear() === year ? bounds.max.getMonth() + 1 : 12;
  const months = toOptions(startMonth, endMonth).filter(({ value }) => {
    return isValid(createDate(year, value - 1, 1));
  });

  if (precision === 'month') return [years, months];

  const month = normalizedDate.getMonth();
  const startDate =
    bounds.min?.getFullYear() === year && bounds.min.getMonth() === month
      ? bounds.min.getDate()
      : 1;
  const endDate =
    bounds.max?.getFullYear() === year && bounds.max.getMonth() === month
      ? bounds.max.getDate()
      : getDaysInMonth(normalizedDate);
  const dates = toOptions(startDate, endDate).filter(({ value }) => {
    return isValid(createDate(year, month, value));
  });

  return [years, months, dates];
};

export const fromPickerDateValue = (
  value: number[],
  current: Date,
  { max, min, precision = 'date' }: PickerDateOptions = {},
) => {
  const bounds = toBounds({ max, min }, precision);
  const year = value[0] ?? current.getFullYear();
  const month =
    precision === 'year'
      ? 0
      : Math.max((value[1] ?? current.getMonth() + 1) - 1, 0);
  const requestedDate =
    precision === 'date' ? (value[2] ?? current.getDate()) : 1;
  const monthStart = createDate(year, month, 1);
  const date = Math.min(Math.max(requestedDate, 1), getDaysInMonth(monthStart));
  const next = createDate(year, month, date);

  return clampDate(toPrecisionStart(next, precision), bounds);
};
