import { BRAND_ORANGE } from "./layout";

/**
 * Renders a single labelled detail row used in booking/coach email bodies.
 * e.g. detailRow("Time", "{{startTime}}") → <strong>Time:</strong> {{startTime}}<br/>
 */
export const detailRow = (label: string, value: string): string =>
  `<strong>${label}:</strong> ${value}<br/>`;

/**
 * Renders an inline text link (for secondary CTAs inside the email body,
 * e.g. "Reschedule session"). Not for the primary CTA button — pass that to wrapLayout.
 */
export const inlineLink = (text: string, url: string): string =>
  `<a href="${url}" style="color:${BRAND_ORANGE};text-decoration:none;font-weight:600;">${text}</a>`;
