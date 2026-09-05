import { useEffect, useState } from 'react';

function formatDhakaTime(date: Date): { time: string; date: string } {
  const timeStr = date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return { time: timeStr, date: dateStr };
}

export function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { time, date } = formatDhakaTime(now);

  return (
    <div className="flex-1 rounded-xl bg-[#0f1115]/60 backdrop-blur-md border border-white/10 px-4 py-3 flex flex-col items-center justify-center min-w-0">
      <p className="text-xl font-semibold text-white leading-tight tabular-nums">
        {time}
      </p>
      <p className="text-[11px] text-gray-300 mt-0.5">{date}</p>
    </div>
  );
}
