import { type Severity, severityMeta } from "@/lib/format";

export function StatusDot({
  severity,
  size = 8,
  pulse,
  className = "",
}: {
  severity: Severity;
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  const meta = severityMeta(severity);
  return (
    <span className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      {pulse && (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60"
          style={{ background: meta.glow }}
        />
      )}
      <span
        className={`relative inline-block rounded-full ${meta.dotClass}`}
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 ${size + 2}px ${meta.glow}`,
        }}
      />
    </span>
  );
}
