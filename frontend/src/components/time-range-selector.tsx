"use client";

interface Props {
  since: number;
  until: number;
  minYear: number;
  maxYear: number;
  onChange: (since: number, until: number) => void;
}

export function TimeRangeSelector({ since, until, minYear, maxYear, onChange }: Props) {
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  return (
    <div className="flex items-center gap-3 text-[11px] text-[#787774]">
      <span className="font-medium uppercase tracking-[0.05em]">Range:</span>
      <select
        value={since}
        onChange={(e) => onChange(Number(e.target.value), until)}
        className="border border-[#EAEAEA] rounded px-2 py-1 bg-white text-[#1E293B] text-[11px]"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <span>–</span>
      <select
        value={until}
        onChange={(e) => onChange(since, Number(e.target.value))}
        className="border border-[#EAEAEA] rounded px-2 py-1 bg-white text-[#1E293B] text-[11px]"
      >
        {years.filter((y) => y >= since).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
