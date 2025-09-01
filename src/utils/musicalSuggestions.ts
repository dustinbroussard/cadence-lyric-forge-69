
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
    
    // Clean up the response to extract JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    // Validate and provide defaults
    return {
      tempo: typeof suggestions.tempo === 'number' ? suggestions.tempo : 120,
      chordProgression: typeof suggestions.chordProgression === 'string' ? suggestions.chordProgression : 'C - G - Am - F',
      timeSignature: typeof suggestions.timeSignature === 'string' ? suggestions.timeSignature : '4/4',
      rhythmFeel: typeof suggestions.rhythmFeel === 'string' ? suggestions.rhythmFeel : 'Straight',
      reasoning: typeof suggestions.reasoning === 'string' ? suggestions.reasoning : 'Standard pop progression'
    };
  } catch (error) {
    console.error('Failed to analyze lyric for musical fit:', error);
    // Do not return defaults here to avoid biasing downstream stages
    throw error;
  }
};
