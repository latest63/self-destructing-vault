/**
 * ShipGuard brand mark.
 *
 * A shield outline whose interior is a checkmark — "guard" (the shield)
 * fused with "ship" (the check that the work landed). Drawn as a single
 * currentColor path so it inherits the lemon accent anywhere it's used,
 * and it stays legible down to 16px for the favicon.
 */

import React from 'react';

export type LogoVariant = 'full' | 'mark' | 'wordmark';
export type LogoSize = 'sm' | 'md' | 'lg';
export type LogoTheme = 'light' | 'dark';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
}

const sizeMap = {
  sm: { mark: 'w-5 h-5', text: 'text-base' },
  md: { mark: 'w-6 h-6', text: 'text-lg' },
  lg: { mark: 'w-8 h-8', text: 'text-2xl' },
};

const WORDMARK = 'ShipGuard';

export function Logo({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  className = '',
}: LogoProps) {
  const colorClass = theme === 'dark' ? 'text-foreground' : 'text-background';
  const { mark: markSize, text: textSize } = sizeMap[size];

  // Shield with an inset checkmark.
  const ShieldMark = () => (
    <svg
      className={`${markSize} transition-colors`}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ShipGuard"
      role="img"
      fill="none"
    >
      <path
        d="M12 2.5 4.5 5.4v6.1c0 4.6 3.1 8.5 7.5 9.9 4.4-1.4 7.5-5.3 7.5-9.9V5.4L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 11.9 2.4 2.4 4.4-4.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const Wordmark = () => (
    <span
      className={`${textSize} font-bold ${colorClass} font-[family-name:var(--font-display)] transition-colors`}
      style={{ letterSpacing: '-0.02em' }}
    >
      {WORDMARK}
    </span>
  );

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <ShieldMark />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <ShieldMark />
      <Wordmark />
    </div>
  );
}

export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="full" />;
}

export function LogoMark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="mark" />;
}

export function LogoWordmark(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="wordmark" />;
}
