import { create } from 'zustand';

interface CalendarPageStore {
  date: Date;
  setDate: (date: Date) => void;
}

export const useCalendarPageStore = create<CalendarPageStore>((set) => ({
  date: new Date(),
  setDate: (date: Date) => set({ date }),
}));

interface DashboardPageStore {
  date: Date;
  setDate: (date: Date) => void;
}

export const useDashboardPageStore = create<DashboardPageStore>((set) => ({
  date: new Date(),
  setDate: (date: Date) => set({ date }),
}));
