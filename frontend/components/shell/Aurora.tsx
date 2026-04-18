export function Aurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="animate-aurora absolute -left-[10%] -top-[20%] h-[55vmax] w-[55vmax] rounded-full opacity-90 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(59,130,246,0.85) 0%, rgba(59,130,246,0) 65%)",
          willChange: "transform",
        }}
      />
      <div
        className="animate-aurora-alt absolute -right-[15%] top-[5%] h-[60vmax] w-[60vmax] rounded-full opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.8) 0%, rgba(99,102,241,0) 65%)",
          willChange: "transform",
          animationDelay: "-8s",
        }}
      />
      <div
        className="animate-aurora absolute bottom-[-25%] left-[10%] h-[55vmax] w-[55vmax] rounded-full opacity-75 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(34,211,238,0.65) 0%, rgba(34,211,238,0) 65%)",
          willChange: "transform",
          animationDelay: "-16s",
        }}
      />
      <div
        className="animate-aurora-alt absolute right-[5%] bottom-[-15%] h-[40vmax] w-[40vmax] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(139,92,246,0.65) 0%, rgba(139,92,246,0) 65%)",
          willChange: "transform",
          animationDelay: "-22s",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(5,7,13,0.35) 95%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
