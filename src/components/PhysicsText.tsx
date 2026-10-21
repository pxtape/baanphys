import katex from "katex";

function MathMarkup({ source, display = false }: { source: string; display?: boolean }) {
  const markup = katex.renderToString(source, { displayMode: display, throwOnError: false, output: "html" });
  return <span className={display ? "my-3 block overflow-x-auto text-center" : "inline-block max-w-full align-middle"} dangerouslySetInnerHTML={{ __html: markup }} />;
}

function inlineParts(text: string, keyPrefix: string) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) return <MathMarkup key={`${keyPrefix}-${index}`} display source={part.slice(2, -2).trim()} />;
    if (part.startsWith("$") && part.endsWith("$")) return <MathMarkup key={`${keyPrefix}-${index}`} source={part.slice(1, -1).trim()} />;
    return <span key={`${keyPrefix}-${index}`}>{part}</span>;
  });
}

export function PhysicsText({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`space-y-3 whitespace-pre-wrap break-words leading-7 ${className}`}>
    {value.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length >= 4) {
        return <div key={index} className="overflow-x-auto py-1 text-center"><MathMarkup display source={trimmed.slice(2, -2).trim()} /></div>;
      }
      return <p key={index}>{inlineParts(paragraph, `p-${index}`)}</p>;
    })}
  </div>;
}
