export interface CalendarGeometry {
  outer: number;
  content: number;
  months: Array<{ top: number; height: number; bottom: number }>;
  footerVisible: boolean;
  direction: string;
}

export interface CalendarHeightBrowserTests {
  errors: string[];
  render: (options?: {
    months?: number;
    month?: number;
    footer?: number;
  }) => void;
  classes: () => string[];
  settle: () => Promise<CalendarGeometry>;
  setFooterHeight: (height: number) => void;
  reset: () => void;
}

declare global {
  interface Window {
    momoCalendarHeightTests: CalendarHeightBrowserTests;
  }
}
