import { config } from "../config/env";

export const BRAND_ORANGE = "#E87100";
export const BRAND_DARK = "#3A2C41";
export const TEXT_MAIN = "#3A2C41";
export const TEXT_SECONDARY = "#525252";
export const DIVIDER = "#DEE3ED";

export type CtaOptions = { text: string; url: string };

export function wrapLayout(
  title: string,
  content: string,
  preheader?: string,
  cta?: CtaOptions,
  year = new Date().getFullYear(),
): string {
  const logoUrl = config.email.logoUrl;

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .email-container { padding: 20px 10px !important; }
          .email-card { padding: 24px !important; width: 100% !important; border-radius: 4px !important; }
          .email-title { font-size: 16px !important; }
          .email-content { font-size: 13px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8F9FA;">
      <!-- Preheader: hidden inbox preview text -->
      <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader ?? title}</span>
      <div class="email-container" style="font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; padding: 40px 20px; color: ${TEXT_MAIN}; line-height: 1.6;">
        <div class="email-card" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-sizing: border-box; border: 1px solid ${DIVIDER};">
          <h1 class="email-title" style="font-size: 20px; font-weight: 800; margin: 0 0 24px; color: ${BRAND_DARK}; text-align: left; letter-spacing: -0.01em;">${title}</h1>

          <div class="email-content" style="font-size: 15px; color: ${TEXT_MAIN}; text-align: left; font-weight: 500;">
            ${content}
          </div>

          ${
            cta
              ? `
            <div style="margin: 32px 0; text-align: left;">
              <a href="${cta.url}" style="display: inline-block; background-color: ${BRAND_ORANGE}; color: #ffffff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
                ${cta.text}
              </a>
            </div>
          `
              : ""
          }

          <div style="margin-top: 40px; padding-top: 20px;">
            <img src="${logoUrl}" alt="Chegg Logo" width="60" style="display: block; margin: 0 0 12px; text-align: left;" />
            <p style="font-size: 12px; color: ${TEXT_SECONDARY}; margin: 0; text-align: left;">
              Automated priority message from Chegg Scheduling.
            </p>
            <p style="font-size: 11px; color: #9CA3AF; margin: 8px 0 0; text-align: left;">
              &copy; ${year} Chegg Inc.
            </p>
          </div>
        </div>
      </div>
    </body>
  </html>
`;
}
