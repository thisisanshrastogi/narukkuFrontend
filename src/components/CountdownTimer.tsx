"use client";

import React, { useState, useEffect } from "react";

interface CountdownTimerProps {
  endTime: string;
}

export default function CountdownTimer({ endTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date(endTime).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        ),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const timeBlocks = [
    { label: "Days", value: timeLeft.days },
    { label: "Hrs", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {timeBlocks.map((time, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1">
          <div className="neu-inset-shallow w-full h-14 rounded-xl flex items-center justify-center">
            <span className="text-lg md:text-xl font-mono text-[var(--text-primary)] font-bold">
              {time.value.toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {time.label}
          </span>
        </div>
      ))}
    </div>
  );
}
