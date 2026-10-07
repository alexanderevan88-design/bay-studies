/** Small line drawing: the Golden Gate in fog. Decorative only. */
export function BridgeInFog({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 190 96"
      fill="none"
      className={`mx-auto h-auto w-[190px] max-w-full ${className}`}
      aria-hidden
    >
      <path d="M0 84h190" stroke="#2D6A87" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M10 92h40M70 92h60M150 92h30"
        stroke="#BFD8E4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M48 84V22M142 84V22" stroke="#C8401A" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M8 64C30 64 40 26 48 22c12 18 30 34 47 36 17-2 35-18 47-36 8 4 18 42 40 42"
        stroke="#C8401A"
        strokeWidth="3"
      />
      <path d="M42 40h12M136 40h12" stroke="#C8401A" strokeWidth="3" />
      <path
        d="M-4 52c26-10 50 8 80-2s52-4 74 4 30-4 44-6"
        stroke="#fff"
        strokeWidth="16"
        strokeLinecap="round"
        opacity=".85"
      />
      <path d="M14 50c22-6 44 4 66 0" stroke="#E6DFD2" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 56c20-4 40 2 70-2" stroke="#E6DFD2" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
