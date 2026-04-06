import emailTemplates from "../templates/emailTemplates";
import type { EmailTemplate, TemplateVariables } from "../../types/notification";

const replacePlaceholders = (
  template: string,
  templateData: TemplateVariables,
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = templateData[key];
    return value == null ? "" : String(value);
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
    subject: replacePlaceholders(template.subject, templateData),
    text: replacePlaceholders(template.text, templateData),
    html: replacePlaceholders(template.html, templateData),
    attachmentRequired: template.attachmentRequired ?? false,
  };
}

export default emailTemplatesHelper;
