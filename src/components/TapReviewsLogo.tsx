import React from 'react';

interface TapReviewsLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

export const TapReviewsLogo: React.FC<TapReviewsLogoProps> = ({
  size = 'md',
  showWordmark = true,
  subtitle,
  className = '',
}) => {
  const iconSizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  }[size];

  const svgDimension = {
    sm: 16,
    md: 20,
    lg: 26,
  }[size];

  const titleSizeClasses = {
    sm: 'text-sm font-bold',
    md: 'text-base sm:text-lg font-bold',
    lg: 'text-xl sm:text-2xl font-extrabold',
  }[size];

  const subSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Mark */}
      <div
        className={`${iconSizeClasses} bg-[#1C1C1E] text-[#C5A059] flex items-center justify-center shadow-xs shrink-0 relative overflow-hidden`}
        aria-hidden="true"
      >
        <svg
          width={svgDimension}
          height={svgDimension}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* NFC Tap concentric arcs */}
          <path
            d="M5.5 18.5C3.5 15.5 3.5 8.5 5.5 5.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M8.5 16C7.2 13.8 7.2 10.2 8.5 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Star review center */}
          <path
            d="M15.5 5.5L16.8 9.5H21L17.6 12L18.9 16L15.5 13.5L12.1 16L13.4 12L10 9.5H14.2L15.5 5.5Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <div className={`${titleSizeClasses} tracking-tight text-[#1C1C1E] flex items-center`}>
            <span>Tap</span>
            <span className="text-[#C5A059] font-medium">Reviews</span>
          </div>
          {subtitle && (
            <span className={`${subSizeClasses} text-[#8E8E93] leading-none mt-0.5`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
