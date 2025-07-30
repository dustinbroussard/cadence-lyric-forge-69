
import React from 'react';
import { MusicalSuggestions } from '../utils/musicalSuggestions';

interface MusicalSuggestionsModalProps {
  suggestions: MusicalSuggestions;
  onAccept: (suggestions: MusicalSuggestions) => void;
  onDecline: () => void;
  onModify: () => void;
}

export const MusicalSuggestionsModal: React.FC<MusicalSuggestionsModalProps> = ({
  suggestions,
  onAccept,
  onDecline,
  onModify
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 lyric-accent">🎵 AI Musical Recommendations</h3>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 lyric-bg-secondary rounded-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium opacity-70">Tempo:</span>
                <div className="font-semibold">{suggestions.tempo} BPM</div>
              </div>
              <div>
                <span className="font-medium opacity-70">Time:</span>
                <div className="font-semibold">{suggestions.timeSignature}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium opacity-70">Chords:</span>
                <div className="font-semibold">{suggestions.chordProgression}</div>
              </div>
              <div className="col-span-2">
                <span className="font-medium opacity-70">Feel:</span>
                <div className="font-semibold">{suggestions.rhythmFeel}</div>
              </div>
            </div>
          </div>
          
          {suggestions.reasoning && (
            <div className="p-3 lyric-bg-secondary rounded-lg">
              <span className="text-sm opacity-70 font-medium">Why these settings:</span>
              <p className="text-sm mt-1">{suggestions.reasoning}</p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => onAccept(suggestions)}
            className="flex-1 px-4 py-3 lyric-accent-bg text-white rounded-xl hover:opacity-90 transition-all duration-300 font-medium"
          >
            Use These Settings
          </button>
          <button
            onClick={onModify}
            className="px-4 py-3 lyric-surface border lyric-border border-opacity-30 rounded-xl hover:lyric-highlight-bg transition-all duration-300"
          >
            Modify
          </button>
          <button
            onClick={onDecline}
            className="px-4 py-3 lyric-surface border lyric-border border-opacity-30 rounded-xl hover:lyric-highlight-bg transition-all duration-300"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};
