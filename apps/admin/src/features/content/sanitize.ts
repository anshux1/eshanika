import sanitizeHtml from "sanitize-html";

// Matches what the page editor can produce. Anything else, including
// scripts, styles, event handlers, and iframes, is dropped on save.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h2",
    "h3",
    "h4",
    "strong",
    "em",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "br",
    "hr",
    "code",
    "pre",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["https", "mailto", "tel"],
  allowProtocolRelative: false,
  transformTags: {
    // Links that open a new tab can't reach back into the store page.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const safe: sanitizeHtml.Attributes =
        attribs.target === "_blank"
          ? { href, target: "_blank", rel: "noopener noreferrer" }
          : { href };
      return { tagName, attribs: safe };
    },
  },
};

export function sanitizeContentHtml(html: string) {
  return sanitizeHtml(html, OPTIONS).trim();
}
