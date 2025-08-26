import { describe, it, expect } from 'vitest';
import { extractJsonFromMarkdown } from '../src/lib/openrouter/client';

describe('extractJsonFromMarkdown', () => {
  it('extracts JSON', () => {
    const out = extractJsonFromMarkdown('```json\n{"a":1}\n```');
    expect((out as any).a).toBe(1);
  });

  it('throws without JSON', () => {
    expect(() => extractJsonFromMarkdown('nope')).toThrow();
  });
});
