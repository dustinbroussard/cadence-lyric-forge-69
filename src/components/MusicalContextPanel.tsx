
import React from 'react';
import { ChevronDown, ChevronRight, Music } from 'lucide-react';
import { GenreSelector } from './GenreSelector';
import { SongStructureSelector } from './SongStructureSelector';

interface MusicalSettings {
  tempo: string;
  chordProgression: string;
  timeSignature: string;
  rhythmFeel: string;
}

interface MusicalContextPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedGenres: string[];
  onGenreToggle: (genreId: string) => void;
  selectedStructure?: string;
  onStructureChange: (structureId: string) => void;
  musicalSettings: MusicalSettings;
  onMusicalSettingsChange: (settings: Partial<MusicalSettings>) => void;
}

export const MusicalContextPanel: React.FC<MusicalContextPanelProps> = ({
  isExpanded,
  onToggle,
  selectedGenres,
  onGenreToggle,
  selectedStructure,
  onStructureChange,
  musicalSettings,
  onMusicalSettingsChange
}) => {
  return (
    <div className="lyric-surface border lyric-border border-opacity-30 rounded-xl mb-2.5 shadow-xl">
      <div 
        className="p-2.5 cursor-pointer flex items-center justify-between hover:lyric-highlight-bg transition-all duration-300 rounded-t-xl"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
          <Music className="w-4 h-4 lyric-accent" />
          <div>
            <h3 className="font-bold text-sm">Musical Context</h3>
            <p className="text-xs opacity-70">Add genre and structure guidance (Optional)</p>
          </div>
        </div>
        <div className="transition-transform duration-300">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-2.5 border-t lyric-border border-opacity-20 space-y-3">
          <GenreSelector
            selectedGenres={selectedGenres}
            onGenreToggle={onGenreToggle}
          />
          
          <SongStructureSelector
            selectedStructure={selectedStructure}
            onStructureChange={onStructureChange}
          />

          {/* Musical Settings */}
          <div className="space-y-2.5">
            <h4 className="font-medium text-xs lyric-accent">Musical Settings</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-0.5">Tempo (BPM)</label>
                <input
                  type="text"
                  value={musicalSettings.tempo}
                  onChange={(e) => onMusicalSettingsChange({ tempo: e.target.value })}
                  className="w-full p-1.5 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30"
                  placeholder="e.g., 120"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-0.5">Time Signature</label>
                <input
                  type="text"
                  value={musicalSettings.timeSignature}
                  onChange={(e) => onMusicalSettingsChange({ timeSignature: e.target.value })}
                  className="w-full p-1.5 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30"
                  placeholder="e.g., 4/4"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-0.5">Chord Progression</label>
                <input
                  type="text"
                  value={musicalSettings.chordProgression}
                  onChange={(e) => onMusicalSettingsChange({ chordProgression: e.target.value })}
                  className="w-full p-1.5 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30"
                  placeholder="e.g., C - G - Am - F"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-0.5">Rhythm Feel</label>
                <input
                  type="text"
                  value={musicalSettings.rhythmFeel}
                  onChange={(e) => onMusicalSettingsChange({ rhythmFeel: e.target.value })}
                  className="w-full p-1.5 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30"
                  placeholder="e.g., Straight, Swing, Shuffle"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
