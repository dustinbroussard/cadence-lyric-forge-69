
import React, { useState, useEffect } from 'react';
import { Plus, Edit3 } from 'lucide-react';
import { SONG_STRUCTURES } from '../data/songStructures';
import { getCustomSongStructures, CustomSongStructure } from '../data/customSongStructures';
import { CustomSongStructureEditor } from './CustomSongStructureEditor';

interface SongStructureSelectorProps {
  selectedStructure?: string | undefined;
  onStructureChange: (structureId: string) => void;
  className?: string;
}

export const SongStructureSelector: React.FC<SongStructureSelectorProps> = ({
  selectedStructure,
  onStructureChange,
  className = ''
}) => {
  const [customStructures, setCustomStructures] = useState<CustomSongStructure[]>([]);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    setCustomStructures(getCustomSongStructures());
  }, []);

  const allStructures = [...SONG_STRUCTURES, ...customStructures];
  const selectedStructureData = allStructures.find(s => s.id === selectedStructure);

  const handleCustomStructureSaved = (structure: CustomSongStructure) => {
    setCustomStructures(getCustomSongStructures());
    onStructureChange(structure.id);
    setShowEditor(false);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium">Song Structure</label>
        <button
          onClick={() => setShowEditor(true)}
          className="p-1 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 flex items-center space-x-1 text-xs"
          title="Create custom structure"
        >
          <Plus size={12} />
          <span>Custom</span>
        </button>
      </div>
      
      <select
        value={selectedStructure || ''}
        onChange={(e) => onStructureChange(e.target.value)}
        className="w-full p-2 text-xs rounded-xl lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
      >
        <option value="">No specific structure</option>
        <optgroup label="Built-in Structures">
          {SONG_STRUCTURES.map((structure) => (
            <option key={structure.id} value={structure.id}>
              {structure.name}
            </option>
          ))}
        </optgroup>
        {customStructures.length > 0 && (
          <optgroup label="Custom Structures">
            {customStructures.map((structure) => (
              <option key={structure.id} value={structure.id}>
                {structure.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      
      {selectedStructureData && (
        <div className="mt-1.5 text-xs opacity-70">
          {selectedStructureData.sections.join(' → ')}
          {selectedStructureData.description && (
            <div className="mt-0.5 text-xs opacity-60">{selectedStructureData.description}</div>
          )}
        </div>
      )}

      {showEditor && (
        <CustomSongStructureEditor
          onSave={handleCustomStructureSaved}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
};
