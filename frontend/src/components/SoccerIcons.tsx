import React from 'react';

interface CardIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Tarjeta Amarilla de fútbol reglamentaria con acabado premium,
 * gradiente de color y bordes redondeados.
 */
export const YellowCardIcon: React.FC<CardIconProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses =
    size === 'sm' ? 'w-2.5 h-3.5' : size === 'lg' ? 'w-5 h-6' : 'w-3.5 h-4.5 sm:w-4 sm:h-5';

  return (
    <svg
      className={`${sizeClasses} shrink-0 -rotate-3 drop-shadow-[0_2px_4px_rgba(234,179,8,0.35)] transition-transform ${className}`}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tarjeta Amarilla"
    >
      <rect
        x="0.75"
        y="0.75"
        width="14.5"
        height="18.5"
        rx="2.5"
        fill="url(#yellowCardGradient)"
        stroke="#fef08a"
        strokeWidth="0.75"
      />
      <defs>
        <linearGradient id="yellowCardGradient" x1="0" y1="0" x2="16" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef08a" />
          <stop offset="0.45" stopColor="#eab308" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/**
 * Tarjeta Roja de fútbol reglamentaria con acabado premium,
 * gradiente carmesí y bordes redondeados.
 */
export const RedCardIcon: React.FC<CardIconProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses =
    size === 'sm' ? 'w-2.5 h-3.5' : size === 'lg' ? 'w-5 h-6' : 'w-3.5 h-4.5 sm:w-4 sm:h-5';

  return (
    <svg
      className={`${sizeClasses} shrink-0 -rotate-3 drop-shadow-[0_2px_4px_rgba(225,29,72,0.4)] transition-transform ${className}`}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tarjeta Roja"
    >
      <rect
        x="0.75"
        y="0.75"
        width="14.5"
        height="18.5"
        rx="2.5"
        fill="url(#redCardGradient)"
        stroke="#fca5a5"
        strokeWidth="0.75"
      />
      <defs>
        <linearGradient id="redCardGradient" x1="0" y1="0" x2="16" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f87171" />
          <stop offset="0.45" stopColor="#dc2626" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/**
 * Doble Tarjeta Amarilla (Expulsión por acumulación):
 * Representación en abanico con tarjeta amarilla al frente y roja de fondo.
 */
export const DoubleYellowCardIcon: React.FC<CardIconProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-5 h-5 flex items-center justify-center shrink-0 ${className}`}
      title="Segunda Tarjeta Amarilla (Expulsión)"
      role="img"
      aria-label="Doble Tarjeta Amarilla"
    >
      {/* Tarjeta Roja de fondo inclinada hacia la derecha */}
      <svg
        className="w-3.5 h-4.5 absolute left-1.5 top-0.5 rotate-12 drop-shadow-[0_2px_3px_rgba(225,29,72,0.4)]"
        viewBox="0 0 16 20"
        fill="none"
      >
        <rect x="0.75" y="0.75" width="14.5" height="18.5" rx="2.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.75" />
      </svg>
      {/* Tarjeta Amarilla al frente inclinada hacia la izquierda */}
      <svg
        className="w-3.5 h-4.5 absolute left-0 top-0.5 -rotate-6 drop-shadow-[0_2px_3px_rgba(234,179,8,0.4)]"
        viewBox="0 0 16 20"
        fill="none"
      >
        <rect x="0.75" y="0.75" width="14.5" height="18.5" rx="2.5" fill="#eab308" stroke="#fef08a" strokeWidth="0.75" />
      </svg>
    </div>
  );
};
