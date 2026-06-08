import React from "react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Minimal monochrome spinner. */
export const Spinner: React.FC<SpinnerProps> = ({ size = 16, className = "" }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em] ${className}`}
    style={{
      width: size,
      height: size,
      borderWidth: Math.max(1.5, size / 9),
    }}
  />
);

export default Spinner;
