interface Props {
  className?: string;
}

export default function Logo({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 160 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Slemtech Admin"
    >
      {/* Icon mark — hexagon with "S" */}
      <polygon
        points="16,2 29,9.5 29,24.5 16,32 3,24.5 3,9.5"
        fill="#2563EB"
      />
      <polygon
        points="16,5.5 26,11.25 26,22.75 16,28.5 6,22.75 6,11.25"
        fill="#1D4ED8"
        opacity="0.4"
      />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="15"
        fill="white"
      >
        S
      </text>

      {/* Wordmark */}
      <text
        x="38"
        y="24"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="16"
        fill="#111827"
        letterSpacing="-0.3"
      >
        slem
      </text>
      <text
        x="79"
        y="24"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="16"
        fill="#2563EB"
        letterSpacing="-0.3"
      >
        tech
      </text>

      {/* "admin" badge */}
      <rect x="119" y="12" width="38" height="14" rx="3" fill="#EFF6FF" />
      <text
        x="138"
        y="22.5"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize="9"
        fill="#2563EB"
        letterSpacing="0.5"
      >
        ADMIN
      </text>
    </svg>
  );
}
