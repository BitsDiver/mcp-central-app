import { marked, type Tokens } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";

// ── Custom renderer: syntax-highlighted code blocks with a language header ───
const renderer = new marked.Renderer();

renderer.code = function (token: Tokens.Code): string {
  const { text, lang } = token;
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language }).value;
  const header =
    language !== "plaintext"
      ? `<div class="code-block-header"><span class="code-block-lang">${language}</span></div>`
      : "";
  return `<div class="code-block">${header}<pre class="hljs"><code class="hljs language-${language}">${highlighted}</code></pre></div>`;
};

marked.use({
  breaks: true,
  gfm: true,
  renderer,
});

export function renderMarkdown(content: string): string {
  if (!content) return "";
  const raw = marked.parse(content) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
      "div",
      "span",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false,
  });
}
