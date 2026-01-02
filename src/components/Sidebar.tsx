import { ChevronLeft, ChevronRight, Sparkles, Search, X, BookOpen, Flame, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { addMonths, format, getDaysInMonth } from 'date-fns';
import { useEffect, useState } from 'react';
import { listEntries, searchEntries, getWritingStats } from '../lib/api';
import { MOOD_OPTIONS } from '../types';
import type { DiaryEntry, WritingStats } from '../types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiaryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [stats, setStats] = useState<WritingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  // Handle search
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchEntries(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Failed to search entries:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Load writing statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getWritingStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load writing stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, []);

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
      {/* Header with Month Navigation and Search Toggle */}
      <div className="p-4 border-b border-border/40 space-y-3">
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

        {/* Search Toggle Button */}
        {!showSearch ? (
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-stone-700 bg-white border border-stone-300 hover:border-accent-blue hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search entries...</span>
          </button>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded"
              >
                <X className="w-3 h-3 text-stone-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Search Results */}
        {showSearch && (searchQuery || searchResults.length > 0) && (
          <div className="mb-4">
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-8 text-stone-400 text-sm">
                No results found for "{searchQuery}"
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-stone-500 mb-2">
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                </div>
                {searchResults.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      requestSelectDate(entry.entry_date);
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      entry.entry_date === selectedDate
                        ? 'bg-accent-blue text-white shadow-md'
                        : 'bg-white/60 hover:bg-white/80 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {format(new Date(entry.entry_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </span>
                      {entry.mood_emoji && (
                        <span className="text-xs">{entry.mood_emoji}</span>
                      )}
                    </div>
                    <div className={`text-xs truncate ${
                      entry.entry_date === selectedDate ? 'text-white/80' : 'text-stone-500'
                    }`}>
                      {entry.content_json ? JSON.parse(entry.content_json).content?.[0]?.content?.[0]?.text || 'No content' : 'Empty entry'}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {isSearching && (
              <div className="text-center py-8 text-stone-400 text-sm">
                Searching...
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-7 gap-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div
              key={`header-${index}`}
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

        {/* Writing Statistics */}
        {!statsLoading && stats && (
          <div className="mt-4 pt-4 border-t border-stone-200/60">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium">Writing Stats</span>
            </div>
            <div className="space-y-2">
              {/* Total Entries */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg">
                <BookOpen className="w-4 h-4 text-accent-blue" />
                <div className="flex-1">
                  <div className="text-xs text-stone-500">Total Entries</div>
                  <div className="text-lg font-semibold text-stone-800">{stats.total_entries}</div>
                </div>
              </div>

              {/* Current Streak */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <Flame className="w-4 h-4 text-orange-500" />
                <div className="flex-1">
                  <div className="text-xs text-stone-500">Current Streak</div>
                  <div className="text-lg font-semibold text-orange-700">
                    {stats.current_streak} {stats.current_streak === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>

              {/* Longest Streak */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-xs text-stone-500">Longest Streak</div>
                  <div className="text-lg font-semibold text-stone-800">
                    {stats.longest_streak} {stats.longest_streak === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
