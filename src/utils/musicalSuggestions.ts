
export interface MusicalSuggestions {
  tempo: number;
  chordProgression: string;
  timeSignature: string;
  rhythmFeel: string;
  reasoning?: string;
}

export const generateMusicalSuggestions = async (
  lyrics: string,
  context: string,
  apiKey: string,
  model: string
): Promise<MusicalSuggestions> => {
  const prompt = `Based on the following lyrics and context, suggest fitting musical elements. Return ONLY a JSON object with no additional text.

Context: ${context}

Lyrics: ${lyrics}

Analyze the mood, energy, and style of these lyrics and return a JSON object with:
- tempo: number (BPM, typically 60-180)
- chordProgression: string (e.g., "Am - F - C - G")
- timeSignature: string (e.g., "4/4", "3/4", "6/8")
- rhythmFeel: string (e.g., "Straight", "Swing", "Shuffle", "Syncopated")
- reasoning: string (brief explanation of choices)

Return only valid JSON.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.href,
      'X-Title': 'Lyric Forge'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate musical suggestions');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';
  
  try {
    // Clean up the response to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    console.error('Failed to parse musical suggestions:', error);
    // Return sensible defaults
    return {
      tempo: 120,
      chordProgression: 'C - G - Am - F',
      timeSignature: '4/4',
      rhythmFeel: 'Straight',
      reasoning: 'Using default values due to parsing error'
    };
  }
};

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
    // Return sensible defaults
    return {
      tempo: 120,
      chordProgression: 'C - G - Am - F',
      timeSignature: '4/4',
      rhythmFeel: 'Straight',
      reasoning: 'Using default values due to analysis error'
    };
  }
};
