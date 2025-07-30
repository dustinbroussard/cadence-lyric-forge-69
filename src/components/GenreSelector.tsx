
import React from 'react';
import { GENRE_PROMPTS } from '../data/genres';

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenreToggle: (genreId: string) => void;
  className?: string;
}

export const GenreSelector: React.FC<GenreSelectorProps> = ({
  selectedGenres,
  onGenreToggle,
  className = ''
}) => {
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-2">Genre Influences</label>
      <div className="flex flex-wrap gap-1.5">
        {GENRE_PROMPTS.map((genre) => (
          <button
            key={genre.id}
            onClick={() => onGenreToggle(genre.id)}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 border ${
              selectedGenres.includes(genre.id)
                ? 'lyric-accent-bg text-white border-transparent'
                : 'lyric-surface border-opacity-30 lyric-border hover:lyric-highlight-bg'
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>
    </div>
  );
};
