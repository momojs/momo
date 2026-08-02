import { PickerMonth } from '@/components/picker-month';
import { useCalendarPageStore } from '@/stores/page';

export function CalendarPageExtra() {
  const { date, setDate } = useCalendarPageStore();
  return <PickerMonth value={date} onChange={setDate} />;
}
