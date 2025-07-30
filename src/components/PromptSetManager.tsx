
import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Plus, Check, FileText } from 'lucide-react';
import { getPromptSets, savePromptSet, deletePromptSet, PromptSet } from '../data/promptSets';
import { useToast } from '../hooks/use-toast';

interface PromptSetManagerProps {
  currentPrompts: { [key: string]: string };
  onLoadPromptSet: (prompts: { [key: string]: string }) => void;
  onClose: () => void;
}

export const PromptSetManager: React.FC<PromptSetManagerProps> = ({
  currentPrompts,
  onLoadPromptSet,
  onClose
}) => {
  const [promptSets, setPromptSets] = useState(getPromptSets());
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [showNewSetForm, setShowNewSetForm] = useState(false);
  const [savedStates, setSavedStates] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const handleSaveCurrentSet = () => {
    if (!newSetName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the prompt set",
        variant: "destructive"
      });
      return;
    }

    try {
      const newSet = savePromptSet({
        name: newSetName.trim(),
        description: newSetDescription.trim(),
        prompts: {
          perspective: currentPrompts.perspective || '',
          message: currentPrompts.message || '',
          tone: currentPrompts.tone || '',
          metaphor: currentPrompts.metaphor || '',
          themes: currentPrompts.themes || '',
          flow: currentPrompts.flow || ''
        },
        isCustom: true
      });

      setPromptSets(getPromptSets());
      setNewSetName('');
      setNewSetDescription('');
      setShowNewSetForm(false);

      // Show success feedback
      setSavedStates({ [newSet.id]: true });
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [newSet.id]: false }));
      }, 2000);

      toast({
        title: "Prompt Set Saved",
        description: `"${newSet.name}" has been saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save prompt set. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSet = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        deletePromptSet(id);
        setPromptSets(getPromptSets());
        toast({
          title: "Prompt Set Deleted",
          description: `"${name}" has been deleted`,
        });
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: "Failed to delete prompt set. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleLoadSet = (set: PromptSet) => {
    onLoadPromptSet(set.prompts);
    toast({
      title: "Prompt Set Loaded",
      description: `"${set.name}" has been loaded successfully`,
    });
    onClose();
  };

  const handleExportSet = (set: PromptSet) => {
    try {
      const blob = new Blob([JSON.stringify(set, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${set.name.replace(/\s+/g, '-').toLowerCase()}-prompts.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `"${set.name}" has been exported`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export prompt set. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleImportSet = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid File",
        description: "Please select a JSON file",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSet = JSON.parse(content) as PromptSet;

        // Validate the structure
        if (!importedSet.name || !importedSet.prompts || 
            !importedSet.prompts.perspective || !importedSet.prompts.message ||
            !importedSet.prompts.tone || !importedSet.prompts.metaphor ||
            !importedSet.prompts.themes || !importedSet.prompts.flow) {
          throw new Error("Invalid prompt set structure");
        }

        // Check if prompt set with same ID already exists
        const existing = getPromptSets().find(s => s.id === importedSet.id);
        if (existing) {
          if (!confirm(`A prompt set with ID "${importedSet.id}" already exists. Overwrite?`)) {
            return;
          }
          // Delete existing first
          if (existing.isCustom) {
            deletePromptSet(existing.id);
          }
        }

        // Save the imported set
        const newSet = savePromptSet({
          name: importedSet.name,
          description: importedSet.description || '',
          prompts: importedSet.prompts,
          isCustom: true
        });

        setPromptSets(getPromptSets());

        // Show success feedback
        setSavedStates({ [newSet.id]: true });
        setTimeout(() => {
          setSavedStates(prev => ({ ...prev, [newSet.id]: false }));
        }, 2000);

        toast({
          title: "Import Successful",
          description: `"${importedSet.name}" has been imported successfully`,
        });

      } catch (error) {
        console.error('Import failed:', error);
        toast({
          title: "Import Failed",
          description: "Invalid JSON file or incorrect prompt set format",
          variant: "destructive"
        });
      }
    };

    reader.readAsText(file);
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold lyric-accent">Prompt Set Manager</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300"
          >
            ✕
          </button>
        </div>

        {/* Save Current Prompts */}
        <div className="mb-8 p-4 lyric-bg-secondary rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Save Current Prompts</h3>
            <div className="flex space-x-2">
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center space-x-2 cursor-pointer">
                <Upload size={16} />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSet}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowNewSetForm(!showNewSetForm)}
                className="px-4 py-2 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>New Set</span>
              </button>
            </div>
          </div>

          {showNewSetForm && (
            <div className="space-y-3">
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                className="w-full p-3 rounded-lg lyric-surface border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                placeholder="Prompt set name"
              />
              <input
                type="text"
                value={newSetDescription}
                onChange={(e) => setNewSetDescription(e.target.value)}
                className="w-full p-3 rounded-lg lyric-surface border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                placeholder="Description (optional)"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveCurrentSet}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setShowNewSetForm(false)}
                  className="px-4 py-2 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Prompt Sets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Prompt Sets</h3>
          {promptSets.map((set) => (
            <div key={set.id} className="p-4 lyric-bg-secondary rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{set.name}</h4>
                  {set.description && (
                    <p className="text-sm opacity-70 mt-1">{set.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2 text-xs opacity-60">
                    <span>{set.isCustom ? 'Custom' : 'Built-in'}</span>
                    {set.createdAt && (
                      <span>• Created {new Date(set.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleLoadSet(set)}
                    className="px-3 py-2 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 text-sm"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleExportSet(set)}
                    className="p-2 lyric-surface hover:lyric-highlight-bg rounded-lg transition-all duration-300"
                    title="Export"
                  >
                    <Download size={16} />
                  </button>
                  {set.isCustom && (
                    <button
                      onClick={() => handleDeleteSet(set.id, set.name)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {savedStates[set.id] && (
                    <div className="flex items-center space-x-1 text-green-500">
                      <Check size={16} />
                      <span className="text-xs">Saved!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
