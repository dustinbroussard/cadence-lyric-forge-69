import React from 'react';

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toHtml(md: string): string {
  if (!md) return '';
  let out = escapeHtml(md);

  // code fences
  out = out.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre class="rounded-lg p-3 bg-black/30 border border-white/10 overflow-auto"><code>${code.replace(/\n/g, '<br/>')}</code></pre>`);

  // headings
  out = out.replace(/^######\s*(.*)$/gm, '<h6 class="text-xs font-semibold mt-2">$1</h6>');
  out = out.replace(/^#####\s*(.*)$/gm, '<h5 class="text-sm font-semibold mt-2">$1</h5>');
  out = out.replace(/^####\s*(.*)$/gm, '<h4 class="text-base font-semibold mt-2">$1</h4>');
  out = out.replace(/^###\s*(.*)$/gm, '<h3 class="text-lg font-bold mt-2">$1</h3>');
  out = out.replace(/^##\s*(.*)$/gm, '<h2 class="text-xl font-bold mt-2">$1</h2>');
  out = out.replace(/^#\s*(.*)$/gm, '<h1 class="text-2xl font-bold mt-2">$1</h1>');

  // inline code (after escaping, before bold/italic)
  out = out.replace(/`([^`]+?)`/g, '<code class="px-1 py-0.5 rounded bg-black/30 border border-white/10">$1</code>');

  // bold/italic (order matters)
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // links [text](url)
  out = out.replace(/\[(.*?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline">$1</a>');

  // unordered lists
  out = out.replace(/(^|\n)[-*]\s+(.*)(?=\n|$)/g, (_m, prefix, item) => `${prefix}<li class="ul">${item}</li>`);
  out = out.replace(/(?:\n<li class="ul">.*<\/li>)+/g, (m) => `<ul class="list-disc pl-5 space-y-1">${m.replace(/\n/g, '').replace(/ class="ul"/g, '')}</ul>`);

  // ordered lists
  out = out.replace(/(^|\n)\d+\.\s+(.*)(?=\n|$)/g, (_m, prefix, item) => `${prefix}<li class="ol">${item}</li>`);
  out = out.replace(/(?:\n<li class="ol">.*<\/li>)+/g, (m) => `<ol class="list-decimal pl-5 space-y-1">${m.replace(/\n/g, '').replace(/ class="ol"/g, '')}</ol>`);

  // blockquotes (line-based)
  out = out.replace(/(^|\n)>\s?(.*)(?=\n|$)/g, (_m, prefix, body) => `${prefix}<blockquote class="border-l-2 pl-3 opacity-90">${body}</blockquote>`);

  // paragraphs (split on double newline)
  out = out
    .split(/\n{2,}/)
    .map((blk) => blk.trim().startsWith('<') ? blk : `<p class="leading-relaxed">${blk.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');

  return out;
}

export const Markdown: React.FC<{ content: string } > = ({ content }) => {
  const html = React.useMemo(() => toHtml(content || ''), [content]);
  return <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
};
