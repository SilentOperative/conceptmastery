import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean;
}

function renderMathSegment(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: false,
    });
  } catch {
    return latex;
  }
}

function parseAndRender(text: string): string {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const blockStart = remaining.indexOf("$$");
    const inlineStart = remaining.indexOf("$");

    if (blockStart === -1 && inlineStart === -1) {
      parts.push(escapeHtml(remaining));
      break;
    }

    if (blockStart !== -1 && (inlineStart === -1 || blockStart <= inlineStart)) {
      if (blockStart > 0) {
        parts.push(escapeHtml(remaining.slice(0, blockStart)));
      }
      const end = remaining.indexOf("$$", blockStart + 2);
      if (end === -1) {
        parts.push(escapeHtml(remaining));
        break;
      }
      const math = remaining.slice(blockStart + 2, end);
      parts.push(renderMathSegment(math, true));
      remaining = remaining.slice(end + 2);
    } else {
      if (inlineStart > 0) {
        parts.push(escapeHtml(remaining.slice(0, inlineStart)));
      }
      const end = remaining.indexOf("$", inlineStart + 1);
      if (end === -1) {
        parts.push(escapeHtml(remaining));
        break;
      }
      const math = remaining.slice(inlineStart + 1, end);
      parts.push(renderMathSegment(math, false));
      remaining = remaining.slice(end + 1);
    }
  }

  return parts.join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function MathText({ text, className = "", block = false }: MathTextProps) {
  const html = parseAndRender(text);

  if (block) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
