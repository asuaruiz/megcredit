const DOT_ANGLES = [0, 60, 120, 180, 240, 300];

/** Isotipo vectorizado: átomo dorado (sistemas, precisión) + sombrero de copa (posibilidad). */
export function Mark({ size = 44, onNavy = false, className = '' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`meg-mark${onNavy ? ' on-navy' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <g fill="none" stroke="var(--mark-orbit)" strokeWidth="5">
        <ellipse cx="100" cy="100" rx="34" ry="84" />
        <ellipse cx="100" cy="100" rx="34" ry="84" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="34" ry="84" transform="rotate(-60 100 100)" />
      </g>
      <g fill="var(--mark-dot)">
        {DOT_ANGLES.map((a) => (
          <circle key={a} cx="100" cy="16" r="7" transform={`rotate(${a} 100 100)`} />
        ))}
      </g>
      <ellipse
        cx="100"
        cy="107"
        rx="30"
        ry="6.5"
        fill="var(--mark-hat)"
        stroke="var(--mark-hat-stroke)"
        strokeWidth="1.5"
      />
      <path
        d="M79 62 Q100 56 121 62 L118 104 Q100 110 82 104 Z"
        fill="var(--mark-hat)"
        stroke="var(--mark-hat-stroke)"
        strokeWidth="1.5"
      />
      <path d="M81.9 93 Q100 98 118.1 93 L118 104 Q100 110 82 104 Z" fill="var(--mark-band)" />
    </svg>
  );
}

/** Lockup horizontal (nav) o vertical (footer, portadas). */
export function Lockup({ vertical = false, onNavy = false, markSize = 44 }) {
  return (
    <span className={`meg-lockup ${vertical ? 'vertical' : 'horizontal'}${onNavy ? ' on-navy' : ''}`}>
      <Mark size={markSize} onNavy={onNavy} />
      <span className="meg-wordmark">
        <span className="w1">MAGIC</span>
        <span className="w2">ENTERPRISE&nbsp;GROUP</span>
      </span>
    </span>
  );
}
