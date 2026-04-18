import { forwardRef } from "react";

type GlassVariant = "default" | "strong" | "accent";

type GlassProps = {
  variant?: GlassVariant;
  hover?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">;

const VARIANT_CLASS: Record<GlassVariant, string> = {
  default: "glass",
  strong: "glass-strong",
  accent: "glass-accent",
};

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { variant = "default", hover = false, className = "", children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={
        `${VARIANT_CLASS[variant]} rounded-2xl ` +
        (hover ? "glass-hover " : "") +
        className
      }
      {...rest}
    >
      {children}
    </div>
  );
});
