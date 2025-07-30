
import { GENRE_PROMPTS } from '../data/genres';
import { SONG_STRUCTURES } from '../data/songStructures';
import { CRITIQUE_PROMPT, ENHANCEMENT_PROMPT } from '../data/critiquePrompts';

export interface PromptContext {
  selectedGenres: string[];
  selectedStructure?: string;
  userInput: string;
  previousStages: { [key: string]: string };
}

export const buildPromptWithGenreInjection = (
  basePrompt: string,
  context: PromptContext
): string => {
  let enhancedPrompt = basePrompt;

  // Add genre injections if genres are selected
  if (context.selectedGenres.length > 0) {
    const genreInjections = context.selectedGenres
      .map(genreId => {
        const genre = GENRE_PROMPTS.find(g => g.id === genreId);
        return genre ? genre.injection : '';
      })
      .filter(Boolean)
      .join(' ');

    if (genreInjections) {
      enhancedPrompt += `\n\nGenre Style Guidelines: ${genreInjections}`;
    }
  }

  // Add song structure guidance for the Flow stage
  if (context.selectedStructure) {
    const structure = SONG_STRUCTURES.find(s => s.id === context.selectedStructure);
    if (structure) {
      enhancedPrompt += `\n\nSong Structure: Use the following structure - ${structure.sections.join(', ')}`;
    }
  }

  return enhancedPrompt;
};

export const buildCritiquePrompt = (lyrics: string, selectedGenres: string[]): string => {
  let prompt = CRITIQUE_PROMPT.replace('[INSERT_LYRICS_HERE]', lyrics);
  
  if (selectedGenres.length > 0) {
    const genreNames = selectedGenres
      .map(genreId => GENRE_PROMPTS.find(g => g.id === genreId)?.name)
      .filter(Boolean)
      .join(', ');
    
    prompt += `\n\nConsider genre alignment with: ${genreNames}`;
  }
  
  return prompt;
};

export const buildEnhancementPrompt = (
  lyrics: string,
  improvements: string[]
): string => {
  let prompt = ENHANCEMENT_PROMPT
    .replace('[INSERT_LYRICS_HERE]', lyrics);
  
  improvements.forEach((improvement, index) => {
    prompt = prompt.replace(`[IMPROVEMENT_${index + 1}]`, improvement);
  });
  
  return prompt;
};
