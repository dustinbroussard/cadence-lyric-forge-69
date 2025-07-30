
export interface GenrePrompt {
  id: string;
  name: string;
  injection: string;
}

export const GENRE_PROMPTS: GenrePrompt[] = [
  {
    id: 'blues',
    name: 'Blues',
    injection: 'Use personal, first-person narratives with themes of loss, endurance, and raw emotional honesty. Employ metaphor rooted in hardship and natural elements. Favor simple AAB rhyme patterns.'
  },
  {
    id: 'funk',
    name: 'Funk',
    injection: 'Prioritize groove, swagger, and attitude. Use rhythmic, punchy phrasing with double meanings and playful, clever turns of phrase. Emphasize repetition and internal rhyme.'
  },
  {
    id: 'soul',
    name: 'Soul',
    injection: 'Emphasize vulnerability, love, and redemption. Use heartfelt, melodic lines with rich emotional arcs. Favor call-and-response patterns and gospel undertones.'
  },
  {
    id: 'rock',
    name: 'Rock',
    injection: 'Lean into bold declarations, defiance, and visceral imagery. Favor powerful, driving rhythm in line structure. Use metaphor that evokes movement and rebellion.'
  },
  {
    id: 'folk',
    name: 'Folk',
    injection: 'Use storytelling, grounded settings, and character-based narratives. Favor acoustic-friendly cadence, with natural speech rhythms and environmental metaphors.'
  },
  {
    id: 'alt-rock',
    name: 'Alt Rock',
    injection: 'Blend emotional rawness with abstract or surreal imagery. Favor anthemic phrasing and shifting tones within the song. Rhyme scheme can be inconsistent but intentional.'
  },
  {
    id: 'punk',
    name: 'Punk',
    injection: 'Use direct, aggressive language and themes of resistance, identity, and anti-establishment sentiment. Prioritize brevity, repetition, and raw delivery.'
  },
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    injection: 'Focus on rhythm, rhyme complexity, and wordplay. Use vivid storytelling, social commentary, and strong internal rhymes. Phrasing should land on beat with momentum.'
  },
  {
    id: 'pop',
    name: 'Pop',
    injection: 'Write in a catchy, concise, and emotionally accessible style. Use repetitive hooks, clear emotional stakes, and a well-balanced structure. Favor clarity over complexity.'
  },
  {
    id: 'country',
    name: 'Country',
    injection: 'Use plainspoken language, strong characters, and emotional directness. Favor strong storytelling and use of rural or nostalgic imagery. Rhymes should be tight and traditional.'
  },
  {
    id: 'jazz',
    name: 'Jazz',
    injection: 'Use improvisational structure and evocative, moody language. Favor sensual or philosophical themes. Allow for loose structure and unconventional rhythms.'
  },
  {
    id: 'rnb',
    name: 'R&B',
    injection: 'Focus on intimacy, sensuality, and layered emotion. Use smooth, melodic phrasing with call-and-response dynamics and lyrical tension/release.'
  },
  {
    id: 'lofi',
    name: 'Lo-fi / Bedroom Pop',
    injection: 'Use confessional, quiet imagery with an introspective tone. Favor simplicity, dreamy metaphors, and a conversational lyric voice.'
  },
  {
    id: 'metal',
    name: 'Metal',
    injection: 'Use intense imagery, mythic scale, and aggressive themes. Favor structured chaos, sharp consonants, and ominous metaphors.'
  },
  {
    id: 'edm',
    name: 'EDM',
    injection: 'Focus on repetition, euphoric imagery, and build-and-release structures. Lyrics should be rhythm-forward and minimalistic, made to fit drops and transitions.'
  }
];
