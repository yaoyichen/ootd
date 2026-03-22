"use client";

import Image from "next/image";

interface CheckinDay {
  id: string;
  date: string;
  realPhotoPath: string;
  outfitId?: string | null;
  outfit?: { resultImagePath: string; score: number | null } | null;
}

export type { CheckinDay };

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  checkins: CheckinDay[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (checkin: CheckinDay) => void;
  today: string; // YYYY-MM-DD
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function CalendarGrid({
  year,
  month,
  checkins,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  today,
}: CalendarGridProps) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build a map of date string -> checkin
  const checkinMap = new Map<string, CheckinDay>();
  for (const c of checkins) {
    // Normalize to YYYY-MM-DD
    const dateKey = c.date.slice(0, 10);
    checkinMap.set(dateKey, c);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDate = (day: number) => {
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ color: "#E8A0B0" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 12L6 8L10 4" />
          </svg>
        </button>
        <span
          className="text-sm font-semibold"
          style={{ color: "#F5F5F7" }}
        >
          {year}年{month}月
        </span>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ color: "#E8A0B0" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4L10 8L6 12" />
          </svg>
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 px-2">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-medium py-1"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 px-2 pb-2">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} className="h-12" />;
          }

          const dateStr = formatDate(day);
          const checkin = checkinMap.get(dateStr);
          const isToday = dateStr === today;

          if (checkin) {
            return (
              <button
                key={dateStr}
                onClick={() => onDayClick(checkin)}
                className="relative h-12 rounded-lg overflow-hidden transition-transform active:scale-95"
                style={{
                  border: isToday
                    ? "2px solid #E8A0B0"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Image
                  src={checkin.realPhotoPath}
                  alt={`${month}/${day}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <span
                  className="absolute top-0.5 left-1 text-[10px] font-medium"
                  style={{
                    color: "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                  }}
                >
                  {day}
                </span>
              </button>
            );
          }

          return (
            <div
              key={dateStr}
              className="relative h-12 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: isToday
                  ? "2px solid #E8A0B0"
                  : "1px solid transparent",
              }}
            >
              <span
                className="absolute top-0.5 left-1 text-[10px]"
                style={{
                  color: isToday
                    ? "#E8A0B0"
                    : "rgba(255,255,255,0.25)",
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
