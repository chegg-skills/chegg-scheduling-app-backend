import { emailTemplates } from "./registry";
import type { EmailTemplate, TemplateVariables } from "../types/notification";

// These keys carry pre-rendered server-side HTML fragments (e.g. co-host detail rows).
// They must NOT be escaped — escaping would render them as visible literal tags.
// IMPORTANT: values for these keys must always be constructed server-side from
// trusted DB data, never from user-submitted free text.
const RAW_HTML_FIELDS = new Set<string>(["coHostDetailsHtml"]);

const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const replacePlaceholders = (
  template: string,
  data: TemplateVariables,
  escapeValues: boolean,
): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key];
    if (value == null) return "";
    const str = String(value);
    return escapeValues && !RAW_HTML_FIELDS.has(key) ? escapeHtml(str) : str;
  });

export function renderTemplate(
  templateName: string,
  variables: TemplateVariables = {},
): EmailTemplate {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return {
    subject: replacePlaceholders(template.subject, variables, false),
    text: replacePlaceholders(template.text, variables, false),
    html: replacePlaceholders(template.html, variables, true),
    preheader: template.preheader
      ? replacePlaceholders(template.preheader, variables, false)
      : undefined,
  };
}
