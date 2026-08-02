import { PickerMonth } from '@/components/picker-month';
import { useDashboardPageStore } from '@/stores/page';

export function DashboardPageExtra() {
  const { date, setDate } = useDashboardPageStore();
  return <PickerMonth value={date} onChange={setDate} />;
}
