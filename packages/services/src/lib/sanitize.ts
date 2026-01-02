import sanitizeHtml from "sanitize-html";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe HTML tags for email templates.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "style",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "div",
      "br",
      "hr",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "class", "id"],
      img: ["src", "alt", "width", "height", "style"],
      a: ["href", "target", "rel"],
      table: ["border", "cellpadding", "cellspacing", "width"],
      td: ["align", "valign", "width", "colspan", "rowspan"],
      th: ["align", "valign", "width", "colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
  });
}

/**
 * Sanitize plain text to escape HTML entities.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
