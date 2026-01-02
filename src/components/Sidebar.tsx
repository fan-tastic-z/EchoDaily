import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { addMonths, format, getDaysInMonth } from 'date-fns';
import { useEffect } from 'react';
import { listEntries } from '../lib/api';
import { MOOD_OPTIONS } from '../types';

// Mood colors for calendar badges
const MOOD_COLORS = {
  amazing: { bg: '#fef3c7', border: '#fbbf24' },
  happy: { bg: '#dbeafe', border: '#60a5fa' },
  neutral: { bg: '#f3f4f6', border: '#9ca3af' },
  sad: { bg: '#e0e7ff', border: '#818cf8' },
  awful: { bg: '#fee2e2', border: '#f87171' },
};

export function Sidebar() {
  const { currentMonth, setCurrentMonth, selectedDate, requestSelectDate, monthEntries, setMonthEntries } = useAppStore();

  // Load entries for the current month
  useEffect(() => {
    const loadMonthEntries = async () => {
      try {
        const entries = await listEntries(currentMonth);
        setMonthEntries(entries);
      } catch (error) {
        console.error('Failed to load month entries:', error);
      }
    };

    loadMonthEntries();
  }, [currentMonth, setMonthEntries]);

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

  // Get mood info for a specific date
  const getMoodForDate = (date: string) => {
    const entry = monthEntries.find(e => e.entry_date === date);
    if (!entry?.mood) return null;
    const moodOption = MOOD_OPTIONS.find(m => m.type === entry.mood);
    return {
      emoji: moodOption?.emoji,
      color: MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS],
    };
  };

  return (
    <aside className="w-64 border-r border-border/40 bg-paper-bg flex flex-col">
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-all hover:scale-110"
          >
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>
          <span className="text-sm font-semibold text-ink-primary tracking-wide">
            {format(monthStart, 'MMMM yyyy')}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-all hover:scale-110"
          >
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-stone-400 py-2"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dateStr = formatDate(day);
            const selected = isSelected(dateStr);
            const isTodayDate = isToday(dateStr);
            const moodInfo = getMoodForDate(dateStr);

            return (
              <button
                key={day}
                onClick={() => requestSelectDate(dateStr)}
                className={`
                  relative aspect-square rounded-xl
                  transition-all duration-200 ease-out
                  ${selected
                    ? 'bg-accent-blue text-white shadow-lg scale-105'
                    : moodInfo
                      ? 'hover:scale-105 hover:shadow-md'
                      : 'hover:bg-white/50 hover:scale-105'
                  }
                  ${isTodayDate && !selected ? 'ring-2 ring-accent-blue/40' : ''}
                `}
                style={
                  moodInfo && !selected
                    ? {
                        backgroundColor: moodInfo.color.bg,
                        border: `1px solid ${moodInfo.color.border}`,
                      }
                    : {}
                }
              >
                <span className={`text-sm ${selected ? 'font-semibold' : ''}`}>
                  {day}
                </span>

                {/* Mood indicator badge */}
                {moodInfo && !selected && (
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">
                    {moodInfo.emoji}
                  </span>
                )}

                {/* Today dot */}
                {isTodayDate && !selected && !moodInfo && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent-blue rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Month mood summary */}
        {monthEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-200/60">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
              <Sparkles className="w-3 h-3" />
              <span className="font-medium">This Month</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {MOOD_OPTIONS.map((mood) => {
                const count = monthEntries.filter(e => e.mood === mood.type).length;
                if (count === 0) return null;
                return (
                  <div
                    key={mood.type}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: MOOD_COLORS[mood.type].bg,
                      border: `1px solid ${MOOD_COLORS[mood.type].border}`,
                    }}
                  >
                    <span>{mood.emoji}</span>
                    <span className="font-medium" style={{ color: MOOD_COLORS[mood.type].border }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
