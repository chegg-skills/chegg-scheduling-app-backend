import sanitizeHtmlLib from "sanitize-html";

/**
 * A secure HTML sanitizer for custom email inputs.
 * Uses an allowlist approach via the sanitize-html library to ensure
 * only safe rich-text formatting tags and attributes are permitted.
 * Blocks all event handlers, javascript:/data: URIs, and dangerous tags.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  return sanitizeHtmlLib(html, {
    allowedTags: [
      "b", "strong",
      "i", "em",
      "u",
      "s", "strike",
      "a",
      "p", "br",
      "ul", "ol", "li",
      "span", "div",
      "h1", "h2", "h3",
      "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
    },
    transformTags: {
      // Force all links to open in a new tab with safe rel
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  }).trim();
}

