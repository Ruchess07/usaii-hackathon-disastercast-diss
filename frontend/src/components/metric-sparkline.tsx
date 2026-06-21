"use client";

interface Props {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function MetricSparkline({ values, color = "#787774", width = 80, height = 20 }: Props) {
  if (!values.length || values.every((v) => v === 0)) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = 2;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * chartW;
    const y = pad + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block align-middle" aria-hidden="true">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
