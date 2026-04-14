import emailTemplates from "../templates/emailTemplates";
import type { EmailTemplate, TemplateVariables } from "../../types/notification";

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const replacePlaceholders = (
  template: string,
  templateData: TemplateVariables,
  shouldEscape: boolean
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = templateData[key];
    if (value == null) return "";
    const strValue = String(value);
    return shouldEscape ? escapeHtml(strValue) : strValue;
  });
};

function emailTemplatesHelper(
  templateName: string,
  templateData: TemplateVariables = {},
): EmailTemplate {
  const template = (emailTemplates as Record<string, EmailTemplate>)[templateName];

  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return {
    subject: replacePlaceholders(template.subject, templateData, false),
    text: replacePlaceholders(template.text, templateData, false),
    html: replacePlaceholders(template.html, templateData, true),
    attachmentRequired: template.attachmentRequired ?? false,
  };
}

export default emailTemplatesHelper;
