/**
 * ShipGuard brand mark.
 *
 * Traced from the supplied artwork: the wordmark "SHIPGUARD" where the "I" is
 * replaced by the brand glyph — a checkmark over three tapering bars.
 *
 * The letterforms are real outline paths (potrace, from the 1983x793 source
 * PNG), not re-drawn approximations, so they match the brand book exactly.
 * Letters use currentColor so the mark adapts to light/dark; the glyph is
 * always brand lime.
 */

import React from 'react';

export const BRAND_LIME = '#b2fb28';

/** Native aspect of the traced artwork (content box of the source PNG). */
const WORDMARK_VIEWBOX = '0 0 1266 171';
/** The glyph alone (the "I" slot): checkmark over three tapering bars. */
const GLYPH_VIEWBOX = '299 0 57 171';

export type LogoVariant = 'full' | 'mark' | 'wordmark';

interface LogoProps {
  /** 'full' = glyph + wordmark text; 'mark' = glyph only; 'wordmark' = text only. */
  variant?: LogoVariant;
  /** Rendered height in px. Width follows the native aspect ratio. */
  height?: number;
  className?: string;
}

/**
 * The brand glyph — checkmark over three tapering bars.
 * This is the "I" of SHIPGUARD, so it reads as an I inside the wordmark.
 */
export function GlyphMark({
  height = 24,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox={GLYPH_VIEWBOX}
      height={height}
      width={(height * 57) / 171}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ShipGuard"
      fill="none"
    >
      <g fill={BRAND_LIME} stroke="none" transform="translate(0,171) scale(0.1,-0.1)">
        <path d="M3333 1568 l-133 -133 -65 65 -65 64 -45 -44 -45 -44 107 -108 c59 -60 111 -107 115 -106 3 2 88 81 188 177 l181 174 -42 43 c-24 24 -48 44 -54 44 -5 0 -70 -60 -142 -132z" />
        <path d="M3223 1100 l-113 -109 0 -110 c0 -61 3 -111 6 -111 4 0 73 66 155 147 l149 147 0 73 0 73 -42 0 c-41 0 -48 -5 -155 -110z" />
        <path d="M3258 694 l-148 -147 0 -115 0 -116 68 64 c37 36 106 103 155 150 l87 85 0 112 c0 62 -3 113 -7 113 -5 0 -74 -66 -155 -146z" />
        <path d="M3257 252 l-147 -147 0 -48 0 -47 155 0 155 0 0 195 c0 107 -3 195 -8 195 -4 0 -74 -66 -155 -148z" />
      </g>
    </svg>
  );
}

/**
 * The full traced wordmark, letters + glyph, as one SVG.
 * Letters are currentColor; the glyph keeps brand lime.
 */
export function WordmarkSVG({
  height = 24,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      height={height}
      width={(height * 1266) / 171}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ShipGuard"
      fill="none"
    >
      <g fill="currentColor" stroke="none" transform="translate(0,171) scale(0.1,-0.1)">
        <path d="M5580 1209 c-81 -13 -207 -79 -267 -139 -63 -63 -125 -180 -147 -277 -37 -165 -14 -385 52 -506 46 -85 135 -173 215 -212 125 -61 159 -65 670 -65 l457 0 0 360 0 360 -367 -2 -368 -3 0 -110 0 -110 241 -3 241 -2 7 -117 c3 -66 2 -121 -3 -126 -5 -5 -156 -7 -347 -5 l-339 3 -57 28 c-118 58 -171 157 -172 322 -2 221 89 341 275 364 41 6 251 10 467 10 217 -1 395 1 397 3 1 2 4 55 6 118 l4 115 -455 1 c-250 1 -480 -2 -510 -7z" />
        <path d="M6732 818 c4 -461 3 -457 93 -582 62 -87 127 -137 230 -177 174 -68 476 -78 650 -22 140 45 265 143 324 252 56 106 61 147 61 559 l0 372 -119 0 -119 0 -4 -367 c-3 -367 -3 -368 -27 -418 -51 -102 -136 -162 -268 -186 -92 -18 -296 -6 -364 20 -121 46 -193 130 -209 243 -5 35 -10 208 -10 386 l0 322 -120 0 -121 0 3 -402z" />
        <path d="M8726 1158 c-19 -35 -57 -103 -84 -153 -151 -278 -297 -544 -352 -645 -91 -165 -179 -334 -180 -342 0 -5 64 -8 143 -8 l142 0 90 165 c50 91 108 198 131 238 76 134 233 422 240 440 3 9 10 17 14 17 4 0 90 -152 190 -337 101 -186 207 -380 237 -430 l54 -93 144 0 c80 0 145 2 145 5 0 2 -25 51 -56 107 -32 57 -88 162 -126 233 -39 72 -81 149 -95 173 -13 24 -65 118 -115 210 -191 352 -222 408 -245 445 l-23 37 -110 0 -109 0 -35 -62z" />
        <path d="M9756 1173 c-3 -27 -4 -298 -3 -603 l2 -555 122 -3 123 -3 2 483 3 483 353 3 c235 1 368 -1 395 -9 58 -16 102 -63 115 -126 23 -105 -31 -206 -125 -232 -23 -7 -151 -11 -320 -11 l-283 0 -5 -22 c-3 -13 -5 -63 -3 -113 l3 -90 116 -5 116 -5 58 -50 c32 -27 126 -107 209 -178 l150 -127 183 0 c101 0 183 1 183 3 0 1 -66 59 -147 127 -81 69 -173 149 -205 177 -57 53 -57 53 -30 59 15 3 49 12 77 21 173 53 275 200 275 399 0 165 -80 308 -210 374 -89 46 -143 50 -662 50 l-486 0 -6 -47z" />
        <path d="M11300 1216 c-4 -3 -4 -716 -1 -1119 l1 -88 433 3 432 4 79 28 c193 70 324 207 382 402 24 80 24 264 0 354 -20 75 -87 188 -143 242 -67 64 -155 118 -237 145 l-81 28 -430 3 c-237 2 -433 1 -435 -2z m855 -263 c155 -46 239 -164 239 -333 0 -175 -89 -301 -244 -347 -45 -14 -105 -17 -330 -17 l-275 -1 0 355 0 355 55 6 c106 11 501 -1 555 -18z" />
        <path d="M312 1199 c-123 -24 -219 -98 -270 -207 -24 -50 -27 -69 -27 -162 0 -92 3 -112 26 -161 29 -62 85 -121 141 -150 87 -44 133 -49 504 -49 194 0 360 -3 369 -6 19 -8 45 -55 45 -84 0 -12 -13 -35 -29 -51 l-29 -29 -496 0 -496 0 0 -145 0 -146 553 3 552 3 65 32 c90 44 134 84 163 146 38 80 51 159 39 245 -18 127 -72 207 -182 267 l-55 30 -395 5 c-217 3 -403 9 -413 14 -43 21 -51 99 -14 134 23 22 26 22 528 24 l504 3 0 145 0 145 -520 1 c-286 1 -539 -2 -563 -7z" />
        <path d="M1607 1204 c-4 -4 -7 -274 -7 -601 l0 -593 163 2 162 3 3 222 2 222 43 6 c61 9 564 2 574 -8 4 -5 9 -86 9 -180 1 -95 2 -193 3 -219 l1 -48 160 0 160 0 0 600 0 600 -160 0 -160 0 -2 -222 -3 -223 -312 -3 -313 -2 -2 222 -3 223 -156 3 c-85 1 -158 -1 -162 -4z" />
        <path d="M3655 1198 c-3 -7 -4 -276 -3 -598 l3 -585 160 0 160 0 3 162 2 162 388 3 387 3 55 26 c114 55 188 150 211 277 16 80 6 266 -16 322 -47 117 -126 194 -231 226 -65 19 -1112 21 -1119 2z m967 -288 c57 -16 78 -50 78 -127 0 -67 -17 -116 -48 -132 -14 -7 -483 -16 -634 -12 l-38 1 0 133 c0 74 3 137 7 140 11 11 594 8 635 -3z" />
      </g>
      <g fill={BRAND_LIME} stroke="none" transform="translate(0,171) scale(0.1,-0.1)">
        <path d="M3333 1568 l-133 -133 -65 65 -65 64 -45 -44 -45 -44 107 -108 c59 -60 111 -107 115 -106 3 2 88 81 188 177 l181 174 -42 43 c-24 24 -48 44 -54 44 -5 0 -70 -60 -142 -132z" />
        <path d="M3223 1100 l-113 -109 0 -110 c0 -61 3 -111 6 -111 4 0 73 66 155 147 l149 147 0 73 0 73 -42 0 c-41 0 -48 -5 -155 -110z" />
        <path d="M3258 694 l-148 -147 0 -115 0 -116 68 64 c37 36 106 103 155 150 l87 85 0 112 c0 62 -3 113 -7 113 -5 0 -74 -66 -155 -146z" />
        <path d="M3257 252 l-147 -147 0 -48 0 -47 155 0 155 0 0 195 c0 107 -3 195 -8 195 -4 0 -74 -66 -155 -148z" />
      </g>
    </svg>
  );
}

/**
 * Default export kept for existing call sites.
 * `full` is now the real traced wordmark (the old hand-drawn shield is gone).
 */
export function Logo({
  variant = 'full',
  height = 24,
  className = '',
}: LogoProps) {
  if (variant === 'mark') {
    return <GlyphMark height={height} className={className} />;
  }
  if (variant === 'wordmark') {
    return <WordmarkSVG height={height} className={className} />;
  }
  return <WordmarkSVG height={height} className={className} />;
}

export function LogoFull(props: Omit<LogoProps, 'variant'>) {
  return <Logo {...props} variant="full" />;
}

export function LogoMark(props: Omit<LogoProps, 'variant'>) {
  return <GlyphMark height={props.height ?? 24} className={props.className} />;
}

export function LogoWordmark(props: Omit<LogoProps, 'variant'>) {
  return <WordmarkSVG height={props.height ?? 24} className={props.className} />;
}
