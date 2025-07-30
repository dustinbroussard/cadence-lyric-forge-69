
export const CRITIQUE_PROMPT = `You're a professional lyric editor and music critic. Evaluate the following song lyrics based on the criteria below. Give a percentage score and letter grade. Provide a brief summary of strengths and weaknesses, then list up to 3 suggested improvements. Conclude with a one-line overall evaluation.

Criteria:
- Originality
- Narrative Cohesion
- Emotional Resonance
- Rhyme & Rhythm
- Metaphor Quality
- Genre Alignment
- Singability

Lyrics:
[INSERT_LYRICS_HERE]`;

export const ENHANCEMENT_PROMPT = `Revise these lyrics using the following suggestions and your expertise. Preserve the original style and voice, but implement improvements to clarity, emotional depth, and rhythm. Format the revision with clear section headers (Verse, Chorus, etc.) and retain the original structure unless otherwise noted.

Original Lyrics:
[INSERT_LYRICS_HERE]

Suggestions:
- [IMPROVEMENT_1]
- [IMPROVEMENT_2]
- [IMPROVEMENT_3]`;
