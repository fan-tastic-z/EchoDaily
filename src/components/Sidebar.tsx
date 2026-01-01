import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { addMonths, format, getDaysInMonth } from 'date-fns';

export function Sidebar() {
  const { currentMonth, setCurrentMonth, selectedDate, setSelectedDate } = useAppStore();

  const [year, month] = currentMonth.split('-').map((part) => Number(part));
  const monthStart = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(monthStart);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    setCurrentMonth(format(addMonths(monthStart, -1), 'yyyy-MM'));
  };

  const nextMonth = () => {
    setCurrentMonth(format(addMonths(monthStart, 1), 'yyyy-MM'));
  };

  const formatDate = (day: number) => {
    return `${currentMonth}-${String(day).padStart(2, '0')}`;
  };

  const isSelected = (date: string) => date === selectedDate;
  const today = format(new Date(), 'yyyy-MM-dd');
  const isToday = (date: string) => date === today;

  return (
    <aside className="w-64 border-r border-border/40 bg-paper-bg flex flex-col">
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-white/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-ink-primary">
            {format(monthStart, 'MMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-white/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div
              key={day}
              className="text-center text-xs text-ink-secondary py-1"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dateStr = formatDate(day);
            const selected = isSelected(dateStr);
            const today = isToday(dateStr);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg
                  transition-all hover:scale-105
                  ${selected
                    ? 'bg-accent-blue text-white shadow-elevated'
                    : 'hover:bg-white/60 text-ink-primary'
                  }
                  ${today && !selected ? 'ring-2 ring-accent-blue/50' : ''}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
