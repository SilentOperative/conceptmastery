import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean;
}

function fixLatex(latex: string): string {
  return latex
    // Fix bare superscripts without braces: x^2 → x^{2}, 10^-9 → 10^{-9}
    .replace(/\^(-?[a-zA-Z0-9]+)(?![{])/g, "^{$1}")
    // Fix bare subscripts without braces
    .replace(/_([a-zA-Z0-9]+)(?![{])/g, "_{$1}")
    // Fix \cdot or \times followed directly by unit letters (no space)
    .replace(/\\cdot([a-zA-Z]+)/g, (_m, unit) => `\\cdot\\,\\text{${unit}}`)
    .replace(/\\times([a-zA-Z]+)/g, (_m, unit) => `\\times\\,\\text{${unit}}`)
    // Fix bare unit letters after a number (e.g. "60V" → "60\\,\\text{V}")
    .replace(/(\d)(pF|nF|µF|uF|mF|pC|nC|µC|uC|mC|kΩ|MΩ|Ω|kV|mV|kW|MW|mW|kJ|MJ|mJ|eV|keV|MeV|GeV|mol|atm|Pa|kPa|MPa|rpm|rad)(?=[^a-zA-Z]|$)/g,
      (_m, num, unit) => `${num}\\,\\text{${unit}}`)
    // Fix \text{} immediately followed by extra letters that got outside the braces
    .replace(/\\text\{([^}]+)\}([a-zA-Z/·•]+)/g, (_m, t, rest) => `\\text{${t}${rest}}`)
    // Fix degree symbol written as ° (not in LaTeX)
    .replace(/°/g, "^{\\circ}")
    // Fix common chemistry element patterns like H2O, CO2 used outside \text{}
    .replace(/\b([A-Z][a-z]?)(\d+)(?=[^a-zA-Z{]|$)/g, (_m, el, n) => `\\text{${el}}_{${n}}`)
    // Ensure \frac, \sqrt, \vec etc. are handled (should already be fine after server fix)
    ;
}

function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(fixLatex(latex), {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: false,
      macros: {
        // Common physics/chemistry macros
        "\\degree": "^{\\circ}",
        "\\ohm": "\\Omega",
      },
    });
  } catch {
    return escapeHtml(latex);
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
      if (blockStart > 0) parts.push(escapeHtml(remaining.slice(0, blockStart)));
      const end = remaining.indexOf("$$", blockStart + 2);
      if (end === -1) { parts.push(escapeHtml(remaining)); break; }
      parts.push(renderMath(remaining.slice(blockStart + 2, end), true));
      remaining = remaining.slice(end + 2);
    } else {
      if (inlineStart > 0) parts.push(escapeHtml(remaining.slice(0, inlineStart)));
      const end = remaining.indexOf("$", inlineStart + 1);
      if (end === -1) { parts.push(escapeHtml(remaining)); break; }
      parts.push(renderMath(remaining.slice(inlineStart + 1, end), false));
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
    .replace(/'/g, "&#39;")
    .replace(/\\n/g, "<br>")
    .replace(/\n/g, "<br>");
}

export function MathText({ text, className = "", block = false }: MathTextProps) {
  const html = parseAndRender(text);

  if (block) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
