
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Edit3, Music, Download, Save, Undo, Redo, Type, Palette, 
  Play, Pause, RotateCcw, Settings, Plus, Trash2, Copy, 
  Zap, Sparkles, RefreshCw, MessageSquare, Guitar
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface LyricSection {
  id: string;
  label: string;
  lyrics: string;
  chords?: string;
}

interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showChords: boolean;
  showLineNumbers: boolean;
  rhymeHighlight: boolean;
  darkMode: boolean;
  autoSave: boolean;
}

interface AdvancedLyricEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialLyrics?: string;
  initialTitle?: string;
  onSave?: (title: string, lyrics: string) => void;
  apiKey?: string;
  selectedModel?: string;
}

export function AdvancedLyricEditor({ 
  isOpen, 
  onClose, 
  initialLyrics = '', 
  initialTitle = '', 
  onSave,
  apiKey,
  selectedModel 
}: AdvancedLyricEditorProps) {
  const [sections, setSections] = useState<LyricSection[]>([]);
  const [title, setTitle] = useState(initialTitle);
  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 16,
    fontFamily: 'monospace',
    lineHeight: 1.6,
    showChords: true,
    showLineNumbers: false,
    rhymeHighlight: false,
    darkMode: true,
    autoSave: true
  });
  const [undoStack, setUndoStack] = useState<LyricSection[][]>([]);
  const [redoStack, setRedoStack] = useState<LyricSection[][]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPosition, setAIMenuPosition] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLyrics) {
      parseLyrics(initialLyrics);
    } else {
      // Start with empty sections
      setSections([
        { id: '1', label: '[Verse 1]', lyrics: '' },
        { id: '2', label: '[Chorus]', lyrics: '' }
      ]);
    }
  }, [initialLyrics]);

  const parseLyrics = (lyrics: string) => {
    const lines = lyrics.split('\n');
    const newSections: LyricSection[] = [];
    let currentSection: LyricSection | null = null;
    let sectionCounter = 1;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Check if line is a section label
      if (trimmed.match(/^\[.*\]$/)) {
        // Save previous section if exists
        if (currentSection) {
          newSections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: sectionCounter.toString(),
          label: trimmed,
          lyrics: ''
        };
        sectionCounter++;
      } else if (currentSection) {
        // Add line to current section
        currentSection.lyrics += (currentSection.lyrics ? '\n' : '') + line;
      } else {
        // No section yet, create a default one
        currentSection = {
          id: sectionCounter.toString(),
          label: '[Verse 1]',
          lyrics: line
        };
        sectionCounter++;
      }
    });

    // Add final section
    if (currentSection) {
      newSections.push(currentSection);
    }

    setSections(newSections.length > 0 ? newSections : [
      { id: '1', label: '[Verse 1]', lyrics: '' }
    ]);
  };

  const pushToUndoStack = () => {
    setUndoStack(prev => [...prev.slice(-19), [...sections]]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [sections, ...prev.slice(0, 19)]);
    setUndoStack(prev => prev.slice(0, -1));
    setSections(previousState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[0];
    setUndoStack(prev => [...prev, sections]);
    setRedoStack(prev => prev.slice(1));
    setSections(nextState);
  };

  const addSection = () => {
    pushToUndoStack();
    const newId = (Math.max(...sections.map(s => parseInt(s.id) || 0)) + 1).toString();
    setSections(prev => [...prev, {
      id: newId,
      label: '[New Section]',
      lyrics: ''
    }]);
  };

  const deleteSection = (id: string) => {
    if (sections.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Must have at least one section",
        variant: "destructive"
      });
      return;
    }
    
    pushToUndoStack();
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: keyof LyricSection, value: string) => {
    setSections(prev => prev.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text) {
        setSelectedText(text);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setAIMenuPosition({
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY + 8
        });
        setShowAIMenu(true);
      }
    } else {
      setShowAIMenu(false);
    }
  };

  const callAI = async (prompt: string, context: string = '') => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your API key in settings",
        variant: "destructive"
      });
      return '';
    }

    setIsProcessing(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel || 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful songwriting assistant. Return only the requested content without explanations or formatting.'
            },
            {
              role: 'user',
              content: `${context ? `Context: ${context}\n\n` : ''}${prompt}`
            }
          ],
          max_tokens: 500,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      toast({
        title: "AI Request Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      return '';
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIAction = async (action: string) => {
    if (!selectedText) return;
    
    pushToUndoStack();
    let prompt = '';
    
    switch (action) {
      case 'rhyme':
        prompt = `Suggest 5 words that rhyme with "${selectedText}". Return only the words, comma separated.`;
        break;
      case 'reword':
        prompt = `Rewrite this lyric line with the same meaning but different words: "${selectedText}"`;
        break;
      case 'continue':
        prompt = `Continue this lyric after: "${selectedText}". Write 2-3 more lines that flow naturally.`;
        break;
      case 'polish':
        prompt = `Polish and improve this lyric while keeping the same meaning: "${selectedText}"`;
        break;
    }

    const result = await callAI(prompt, getAllLyrics());
    
    if (result && currentSectionId) {
      // Replace selected text with AI result
      const section = sections.find(s => s.id === currentSectionId);
      if (section) {
        const newLyrics = section.lyrics.replace(selectedText, result.trim());
        updateSection(currentSectionId, 'lyrics', newLyrics);
      }
    }
    
    setShowAIMenu(false);
    setSelectedText('');
  };

  const getAllLyrics = () => {
    return sections.map(section => `${section.label}\n${section.lyrics}`).join('\n\n');
  };

  const exportLyrics = () => {
    const content = `# ${title || 'Untitled Song'}\n\n${getAllLyrics()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'untitled').replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getAllLyrics());
      toast({
        title: "Copied",
        description: "Lyrics copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="flex-1 flex flex-col lyric-surface m-4 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b lyric-border border-opacity-30">
          <div className="flex items-center space-x-4 flex-1">
            <h2 className="text-lg font-bold lyric-accent">Advanced Lyric Editor</h2>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 max-w-md p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
              placeholder="Song title..."
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors disabled:opacity-50"
              title="Undo"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors disabled:opacity-50"
              title="Redo"
            >
              <Redo size={16} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={addSection}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              title="Add Section"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
              title="Copy All"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={exportLyrics}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
              title="Export"
            >
              <Download size={16} />
            </button>
            {onSave && (
              <button
                onClick={() => onSave(title, getAllLyrics())}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Save
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b lyric-border border-opacity-30 lyric-bg-secondary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Font Size</label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs">{settings.fontSize}px</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Line Height</label>
                <input
                  type="range"
                  min="1.2"
                  max="2.0"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => setSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs">{settings.lineHeight}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showChords"
                  checked={settings.showChords}
                  onChange={(e) => setSettings(prev => ({ ...prev, showChords: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="showChords" className="text-sm">Show Chords</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rhymeHighlight"
                  checked={settings.rhymeHighlight}
                  onChange={(e) => setSettings(prev => ({ ...prev, rhymeHighlight: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="rhymeHighlight" className="text-sm">Rhyme Colors</label>
              </div>
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div 
          className="flex-1 p-4 overflow-y-auto"
          style={{ 
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            fontFamily: settings.fontFamily === 'monospace' ? 'Monaco, Consolas, monospace' : 'inherit'
          }}
          ref={editorRef}
          onMouseUp={handleTextSelection}
          onKeyUp={handleTextSelection}
        >
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={section.id} className="lyric-bg-secondary rounded-lg p-4 border lyric-border border-opacity-30">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={section.label}
                    onChange={(e) => updateSection(section.id, 'label', e.target.value)}
                    className="font-semibold text-lg lyric-accent bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-opacity-50 lyric-highlight rounded px-2 py-1"
                  />
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    title="Delete Section"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                {settings.showChords && (
                  <div className="mb-2">
                    <label className="block text-sm font-medium mb-1 opacity-70">Chords</label>
                    <textarea
                      value={section.chords || ''}
                      onChange={(e) => updateSection(section.id, 'chords', e.target.value)}
                      className="w-full p-2 text-sm rounded-lg lyric-bg-primary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight resize-none font-mono"
                      rows={2}
                      placeholder="C - F - Am - G"
                    />
                  </div>
                )}
                
                <textarea
                  value={section.lyrics}
                  onChange={(e) => updateSection(section.id, 'lyrics', e.target.value)}
                  onFocus={() => setCurrentSectionId(section.id)}
                  className="w-full p-3 rounded-lg lyric-bg-primary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight resize-none"
                  rows={Math.max(4, section.lyrics.split('\n').length + 1)}
                  placeholder="Enter lyrics here..."
                  style={{
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* AI Context Menu */}
        {showAIMenu && selectedText && (
          <div
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 flex items-center space-x-1 p-2"
            style={{
              left: aiMenuPosition.x,
              top: aiMenuPosition.y
            }}
          >
            <button
              onClick={() => handleAIAction('rhyme')}
              disabled={isProcessing}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-blue-400"
              title="Find Rhymes"
            >
              <Zap size={14} />
            </button>
            <button
              onClick={() => handleAIAction('reword')}
              disabled={isProcessing}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-green-400"
              title="Reword"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => handleAIAction('continue')}
              disabled={isProcessing}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-purple-400"
              title="Continue"
            >
              <Sparkles size={14} />
            </button>
            <button
              onClick={() => handleAIAction('polish')}
              disabled={isProcessing}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-yellow-400"
              title="Polish"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setShowAIMenu(false)}
              className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-400"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="lyric-surface rounded-lg p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p>AI is processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
