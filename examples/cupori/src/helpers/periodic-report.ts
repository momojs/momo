import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns';

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export function startOfPeriod(period: Period, date: Date) {
  switch (period) {
    case 'daily':
      return startOfDay(date);
    case 'weekly':
      return startOfWeek(date);
    case 'monthly':
      return startOfMonth(date);
    case 'quarterly':
      return startOfQuarter(date);
  }
}

export function endOfPeriod(period: Period, date: Date) {
  switch (period) {
    case 'daily':
      return endOfDay(date);
    case 'weekly':
      return endOfWeek(date);
    case 'monthly':
      return endOfMonth(date);
    case 'quarterly':
      return endOfQuarter(date);
  }
}
