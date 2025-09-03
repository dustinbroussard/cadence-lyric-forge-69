export function normalizeSectionLabels(input: string): string {
  if (!input) return '';
  const lines = input.split(/\r?\n/);
  let verseCounter = 0;
  return lines
    .map((raw) => {
      const line = raw.trim();
      if (!line) return raw;
      const m = line.match(/^(?:[*\s_=~`-]*)(?:[([{]?\s*)?([A-Za-z]+(?:\s*\d+)?(?:\s*-?\s*[A-Za-z]+)?)\s*(?:[)\]}]|:)?\s*$/);
      if (!m) return raw;
      const labelRaw = m[1] || '';
      const normalized = labelRaw
        .replace(/\s+/g, ' ')
        .replace(/\b(pre)\s*[- ]?\s*(chorus)\b/i, 'Pre-Chorus')
        .replace(/\bverse\b/i, 'Verse')
        .replace(/\bchorus\b/i, 'Chorus')
        .replace(/\bbridge\b/i, 'Bridge')
        .replace(/\bintro\b/i, 'Intro')
        .replace(/\boutro\b/i, 'Outro')
        .replace(/\bhook\b/i, 'Hook')
        .replace(/\brefrain\b/i, 'Refrain')
        .replace(/\bcoda\b/i, 'Coda')
        .replace(/\bsolo\b/i, 'Solo')
        .replace(/\binterlude\b/i, 'Interlude')
        .replace(/\bbreakdown\b/i, 'Breakdown')
        .replace(/\bending\b/i, 'Ending')
        .replace(/\btag\b/i, 'Tag')
        .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

      // Detect if it's a recognizable section label
      const isSection = /^(Intro|Verse(?:\s*\d+)?|Pre-Chorus|Chorus|Bridge|Outro|Hook|Refrain|Coda|Solo|Interlude|Ending|Breakdown|Tag)(?:\s*\d+)?$/i.test(
        normalized
      );
      if (!isSection) return raw;

      let finalLabel = normalized;
      // Auto-number verses if no number present (Verse -> Verse 1, Verse -> Verse 2, ...)
      if (/^Verse(\s*\d+)?$/i.test(finalLabel)) {
        const hasNumber = /\d+/.test(finalLabel);
        if (!hasNumber) {
          verseCounter += 1;
          finalLabel = `Verse ${verseCounter}`;
        }
      }

      return `[${finalLabel}]`;
    })
    .join('\n');
}

// Simple export used before saving/exporting final lyrics
export function normalizeFinalLyrics(text: string): string {
  const withLabels = normalizeSectionLabels(text);
  // Ensure single blank line between sections
  return withLabels
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Basic syllable estimation for a single word
export function countSyllables(word: string): number {
  let w = (word || '').toLowerCase();
  if (w.length <= 3) return w ? 1 : 0;
  w = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '')
    .replace(/^y/, '');
  const matches = w.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 0;
}

// Count syllables in an entire line by summing each word
export function lineSyllableCount(line: string): number {
  return (line || '')
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, w) => sum + countSyllables(w), 0);
}
