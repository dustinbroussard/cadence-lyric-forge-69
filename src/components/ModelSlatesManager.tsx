import React, { useState } from 'react';
import { Save, Download, Upload, Trash2, Plus, Users, Edit3, Check, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { ModelDropdown } from './ModelDropdown';

interface ModelSlate {
  id: string;
  name: string;
  models: { [stageId: string]: string };
  createdAt: string;
}

interface ModelSlatesManagerProps {
  currentStageModels: { [stageId: string]: string };
  defaultModel: string;
  onLoadSlate: (models: { [stageId: string]: string }) => void;
  onClose: () => void;
}

const STAGE_NAMES = {
  perspective: 'Establish Perspective',
  message: 'Define the Message',
  tone: 'Set the Tone',
  metaphor: 'Develop Rich Metaphor',
  themes: 'Craft Themes & Imagery',
  musicalSuggestions: 'Musical Elements',
  flow: 'Focus on Flow',
  critique: 'Review & Critique'
};

export const ModelSlatesManager: React.FC<ModelSlatesManagerProps> = ({
  currentStageModels,
  defaultModel,
  onLoadSlate,
  onClose
}) => {
  const [slates, setSlates] = useState<ModelSlate[]>(() => {
    try {
      const saved = localStorage.getItem('model-slates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [newSlateName, setNewSlateName] = useState('');
  const [showNewSlateForm, setShowNewSlateForm] = useState(false);
  const [editingSlate, setEditingSlate] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { toast } = useToast();

  const saveSlates = (updatedSlates: ModelSlate[]) => {
    try {
      localStorage.setItem('model-slates', JSON.stringify(updatedSlates));
      setSlates(updatedSlates);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save model slates",
        variant: "destructive"
      });
    }
  };

  const handleSaveCurrentSlate = () => {
    if (!newSlateName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the writing team",
        variant: "destructive"
      });
      return;
    }

    const newSlate: ModelSlate = {
      id: `slate-${Date.now()}`,
      name: newSlateName.trim(),
      models: { ...currentStageModels },
      createdAt: new Date().toISOString()
    };

    const updatedSlates = [...slates, newSlate];
    saveSlates(updatedSlates);
    setNewSlateName('');
    setShowNewSlateForm(false);

    toast({
      title: "Writing Team Saved",
      description: `"${newSlate.name}" has been saved successfully`,
    });
  };

  const handleLoadSlate = (slate: ModelSlate) => {
    onLoadSlate(slate.models);
    toast({
      title: "Writing Team Loaded",
      description: `"${slate.name}" models have been applied to all stages`,
    });
    onClose();
  };

  const handleDeleteSlate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      const updatedSlates = slates.filter(s => s.id !== id);
      saveSlates(updatedSlates);
      toast({
        title: "Writing Team Deleted",
        description: `"${name}" has been deleted`,
      });
    }
  };

  const handleStartEdit = (slate: ModelSlate) => {
    setEditingSlate(slate.id);
    setEditingName(slate.name);
  };

  const handleSaveEdit = (slate: ModelSlate) => {
    if (!editingName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a valid name",
        variant: "destructive"
      });
      return;
    }

    const updatedSlates = slates.map(s => 
      s.id === slate.id ? { ...s, name: editingName.trim() } : s
    );
    saveSlates(updatedSlates);
    setEditingSlate(null);
    setEditingName('');

    toast({
      title: "Name Updated",
      description: `Writing team renamed to "${editingName.trim()}"`,
    });
  };

  const handleCancelEdit = () => {
    setEditingSlate(null);
    setEditingName('');
  };

  const exportSlate = (slate: ModelSlate) => {
    try {
      const blob = new Blob([JSON.stringify(slate, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slate.name.replace(/\s+/g, '-').toLowerCase()}-writing-team.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `"${slate.name}" has been exported`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export writing team",
        variant: "destructive"
      });
    }
  };

  const handleImportSlate = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        const importedSlate = JSON.parse(content) as ModelSlate;

        if (!importedSlate.name || !importedSlate.models) {
          throw new Error("Invalid slate structure");
        }

        const newSlate: ModelSlate = {
          id: `slate-${Date.now()}`,
          name: importedSlate.name,
          models: importedSlate.models,
          createdAt: new Date().toISOString()
        };

        const updatedSlates = [...slates, newSlate];
        saveSlates(updatedSlates);

        toast({
          title: "Import Successful",
          description: `"${importedSlate.name}" has been imported`,
        });

      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid JSON file or incorrect format",
          variant: "destructive"
        });
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold lyric-accent flex items-center space-x-2">
            <Users size={24} />
            <span>Writing Teams Manager</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300"
          >
            ✕
          </button>
        </div>

        {/* Save Current Team */}
        <div className="mb-8 p-4 lyric-bg-secondary rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Save Current Writing Team</h3>
            <div className="flex space-x-2">
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center space-x-2 cursor-pointer">
                <Upload size={16} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSlate}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowNewSlateForm(!showNewSlateForm)}
                className="px-4 py-2 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>New Team</span>
              </button>
            </div>
          </div>

          {showNewSlateForm && (
            <div className="space-y-3">
              <input
                type="text"
                value={newSlateName}
                onChange={(e) => setNewSlateName(e.target.value)}
                className="w-full p-3 rounded-lg lyric-surface border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                placeholder="Writing team name (e.g., 'Creative Mix A')"
              />
              <div className="text-sm opacity-70">
                Current models: {Object.keys(currentStageModels).length} stages configured
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveCurrentSlate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>Save Team</span>
                </button>
                <button
                  onClick={() => setShowNewSlateForm(false)}
                  className="px-4 py-2 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Teams */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Saved Writing Teams</h3>
          {slates.length === 0 ? (
            <div className="text-center py-8 opacity-60">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No writing teams saved yet.</p>
              <p className="text-sm">Save your current model lineup to get started!</p>
            </div>
          ) : (
            slates.map((slate) => (
              <div key={slate.id} className="p-4 lyric-bg-secondary rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {editingSlate === slate.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 p-2 rounded-lg lyric-surface border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                        />
                        <button
                          onClick={() => handleSaveEdit(slate)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-lg">{slate.name}</h4>
                        <button
                          onClick={() => handleStartEdit(slate)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    )}
                    <div className="text-sm opacity-60 mt-1">
                      Created {new Date(slate.createdAt).toLocaleDateString()} • 
                      {Object.keys(slate.models).length} stages configured
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleLoadSlate(slate)}
                      className="px-3 py-2 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 text-sm"
                    >
                      Load Team
                    </button>
                    <button
                      onClick={() => exportSlate(slate)}
                      className="p-2 lyric-surface hover:lyric-highlight-bg rounded-lg transition-all duration-300"
                      title="Export"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSlate(slate.id, slate.name)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Model Preview */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(slate.models).map(([stageId, modelId]) => (
                    <div key={stageId} className="p-2 rounded lyric-surface border lyric-border border-opacity-20">
                      <div className="font-medium opacity-70">{STAGE_NAMES[stageId] || stageId}</div>
                      <div className="truncate">{modelId || defaultModel}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
