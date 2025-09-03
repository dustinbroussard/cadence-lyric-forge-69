import { describe, it, expect } from 'vitest';
import { extractJsonFromMarkdown } from '../src/lib/openrouter/client';

describe('extractJsonFromMarkdown', () => {
  it('extracts JSON', () => {
    const out = extractJsonFromMarkdown('```json\n{"a":1}\n```');
    expect((out as { a: number }).a).toBe(1);
  });

  it('extracts JSON from unlabeled fence', () => {
    const out = extractJsonFromMarkdown('```\n{"b":2}\n```');
    expect((out as { b: number }).b).toBe(2);
  });

  it('extracts first JSON object from mixed text', () => {
    const out = extractJsonFromMarkdown('prefix {"c":{"d":3}} suffix');
    expect((out as { c: { d: number } }).c.d).toBe(3);
  });

  it('throws without JSON', () => {
    expect(() => extractJsonFromMarkdown('nope')).toThrow();
  });
});
