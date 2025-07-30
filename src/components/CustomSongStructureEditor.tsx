
import React, { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { saveCustomSongStructure, CustomSongStructure } from '../data/customSongStructures';

interface CustomSongStructureEditorProps {
  onSave: (structure: CustomSongStructure) => void;
  onCancel: () => void;
}

export const CustomSongStructureEditor: React.FC<CustomSongStructureEditorProps> = ({
  onSave,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState(['Verse 1', 'Chorus']);

  const addSection = () => {
    setSections([...sections, '']);
  };

  const updateSection = (index: number, value: string) => {
    const updated = [...sections];
    updated[index] = value;
    setSections(updated);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || sections.some(s => !s.trim())) {
      alert('Please fill in all fields');
      return;
    }

    const structure = saveCustomSongStructure({
      name: name.trim(),
      description: description.trim(),
      sections: sections.map(s => s.trim()),
      isCustom: true
    });

    onSave(structure);
  };

  return (
    <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-6 mb-4">
      <h3 className="text-lg font-bold mb-4 lyric-accent">Create Custom Song Structure</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Structure Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-xl lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
            placeholder="e.g., Epic Ballad Structure"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
            placeholder="Brief description of when to use this structure"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Sections</label>
            <button
              onClick={addSection}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 flex items-center space-x-1"
            >
              <Plus size={16} />
              <span>Add Section</span>
            </button>
          </div>
          
          <div className="space-y-2">
            {sections.map((section, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={section}
                  onChange={(e) => updateSection(index, e.target.value)}
                  className="flex-1 p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                  placeholder={`Section ${index + 1}`}
                />
                {sections.length > 1 && (
                  <button
                    onClick={() => removeSection(index)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleSave}
            className="px-6 py-3 lyric-accent-bg text-white rounded-xl hover:opacity-90 transition-all duration-300 flex items-center space-x-2"
          >
            <Save size={16} />
            <span>Save Structure</span>
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 lyric-surface border lyric-border border-opacity-30 rounded-xl hover:lyric-highlight-bg transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
