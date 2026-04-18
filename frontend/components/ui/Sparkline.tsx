export function Sparkline({
  values,
  width = 96,
  height = 28,
  stroke = "#60A5FA",
  fill = "rgba(96,165,250,0.18)",
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
}) {
  if (!values.length) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 0.0001);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const pad = 2;
  const innerH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + (1 - (v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;

  const gradId = `spark-${Math.random().toString(36).slice(2, 9)}`;
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={2.5}
        fill={stroke}
        style={{ filter: `drop-shadow(0 0 4px ${stroke})` }}
      />
    </svg>
  );
}
