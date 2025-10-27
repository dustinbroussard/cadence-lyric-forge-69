
import { extractJsonFromMarkdown } from '@/lib/openrouter/client';

export interface MusicalSuggestions {
  tempo: number;
  chordProgression: string;
  timeSignature: string;
  rhythmFeel: string;
  reasoning?: string;
}

export const analyzeLyricForMusicalFit = async (
  userInput: string,
  stageData: string,
  selectedGenres: string[],
  callOpenRouter: (prompt: string, context: string) => Promise<string>
): Promise<MusicalSuggestions> => {
  const genreContext = selectedGenres.length > 0 ? `Selected genres: ${selectedGenres.join(', ')}` : '';
  const prompt = `Based on the lyrics and context below, suggest fitting musical elements. Return ONLY a JSON object.

${genreContext}

User Input: ${userInput}
Developed Content: ${stageData}

Analyze the mood, energy, and style and return a JSON object with:
- tempo: number (BPM, typically 60-180)
- chordProgression: string (e.g., "Am - F - C - G")
- timeSignature: string (e.g., "4/4", "3/4", "6/8")
- rhythmFeel: string (e.g., "Straight", "Swing", "Shuffle", "Syncopated")
- reasoning: string (brief explanation of choices)

Return only valid JSON.`;

  try {
    const result = await callOpenRouter(prompt, '');

    // Use robust extractor to handle fenced code blocks and inline JSON
    const parsed = extractJsonFromMarkdown(result) as Partial<MusicalSuggestions> | undefined;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('No JSON found in response');
    }

    // Validate and provide sane defaults where missing
    return {
      tempo: typeof parsed.tempo === 'number' ? parsed.tempo : 120,
      chordProgression: typeof parsed.chordProgression === 'string' ? parsed.chordProgression : 'C - G - Am - F',
      timeSignature: typeof parsed.timeSignature === 'string' ? parsed.timeSignature : '4/4',
      rhythmFeel: typeof parsed.rhythmFeel === 'string' ? parsed.rhythmFeel : 'Straight',
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Standard pop progression'
    };
  } catch (error) {
    console.error('Failed to analyze lyric for musical fit:', error);
    // Do not return defaults here to avoid biasing downstream stages
    throw error;
  }
};
