
import React, { useState, useRef, useEffect } from 'react';
import { normalizeSectionLabels } from '@/utils/lyrics';
import { 
  X, Edit3, Music, Download, Save, Undo, Redo, Type, Palette, 
  Play, Pause, RotateCcw, Settings, Plus, Trash2, Copy, 
  Zap, Sparkles, RefreshCw, MessageSquare, Guitar
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { chat } from '@/lib/openrouter/client';

interface LineItem { chords: string; lyric: string }
interface LyricSection {
  id: string;
  label: string;
  lines: LineItem[];
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
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showAiTools, setShowAiTools] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

  // Simple metadata panel state (local only for now)
  const [metaOpen, setMetaOpen] = useState(false);
  const [meta, setMeta] = useState({ key: '', tempo: 120, timeSignature: '4/4', tags: '' as string, notes: '' });

  useEffect(() => {
    if (initialLyrics) {
      parseLyrics(normalizeSectionLabels(initialLyrics));
    } else {
      setSections([
        { id: '1', label: '[Verse 1]', lines: [{ chords: '', lyric: '' }] },
        { id: '2', label: '[Chorus]', lines: [{ chords: '', lyric: '' }] }
      ]);
    }
  }, [initialLyrics]);

  const parseLyrics = (lyrics: string) => {
    const lines = lyrics.split('\n');
    const newSections: LyricSection[] = [];
    let current: LyricSection | null = null;
    let sectionCounter = 1;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? '';
      const trimmed = raw.trimEnd();
      if (/^\[.*\]$/.test(trimmed)) {
        if (current) newSections.push(current);
        current = { id: String(sectionCounter++), label: trimmed, lines: [] };
        continue;
      }
      if (!current) current = { id: String(sectionCounter++), label: '[Verse 1]', lines: [] };
      // Try to interpret alternating chords/lyrics
      if (isChordLine(trimmed)) {
        const next = (lines[i + 1] || '').trimEnd();
        if (next && !/^\[.*\]$/.test(next)) {
          current.lines.push({ chords: trimmed, lyric: next });
          i += 1;
        } else {
          current.lines.push({ chords: trimmed, lyric: '' });
        }
      } else {
        current.lines.push({ chords: '', lyric: trimmed });
      }
    }
    if (current) newSections.push(current);
    if (!newSections.length) {
      newSections.push({ id: '1', label: '[Verse 1]', lines: [{ chords: '', lyric: '' }] });
    }
    setSections(newSections);
  };

  const pushToUndoStack = () => {
    setUndoStack(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(sections))]);
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
      lines: [{ chords: '', lyric: '' }]
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

  const updateSectionLabel = (id: string, value: string) => {
    setSections(prev => prev.map(section => section.id === id ? { ...section, label: value } : section));
  };

  const updateLine = (sectionId: string, lineIndex: number, part: keyof LineItem, value: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      const lines = section.lines.map((ln, idx) => idx === lineIndex ? { ...ln, [part]: value } as LineItem : ln);
      return { ...section, lines };
    }));
  };

  const addLineAfter = (sectionId: string, lineIndex: number) => {
    pushToUndoStack();
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      const lines = [...section.lines];
      lines.splice(lineIndex + 1, 0, { chords: '', lyric: '' });
      return { ...section, lines };
    }));
  };

  const deleteLine = (sectionId: string, lineIndex: number) => {
    pushToUndoStack();
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      const lines = section.lines.filter((_, idx) => idx !== lineIndex);
      return { ...section, lines: lines.length ? lines : [{ chords: '', lyric: '' }] };
    }));
  };

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    pushToUndoStack();
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx === -1) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return copy;
    });
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
      const res = await chat({
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
        apiKey,
      });
      return res.choices?.[0]?.message?.content || '';
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
    return sections.map(section => {
      const body = section.lines.map(ln => ln.lyric).join('\n');
      return `${section.label}\n${body}`;
    }).join('\n\n');
  };

  // Clipboard/Export helpers
  const formatLyricsWithChordsFromSection = (section: LyricSection) => {
    const out: string[] = [];
    section.lines.forEach(ln => {
      if (ln.chords.trim()) out.push(ln.chords);
      out.push(ln.lyric);
    });
    return out.join('\n');
  };

  const buildSongMarkdown = () => {
    // Compose a markdown export similar to the HTML example
    const header = `# ${title || 'Untitled'}\n\n` +
      (meta.key ? `**Key:** ${meta.key}\n` : '') +
      (meta.tempo ? `**Tempo:** ${meta.tempo} BPM\n` : '') +
      (meta.timeSignature ? `**Time Signature:** ${meta.timeSignature}\n` : '') +
      (meta.tags ? `**Tags:** ${meta.tags}\n` : '') +
      '\n---\n\n';
    const body = sections.map(s => `${s.label}\n${formatLyricsWithChordsFromSection(s)}`).join('\n\n');
    const notes = meta.notes?.trim() ? `\n\n---\n**Notes:**\n${meta.notes}` : '';
    return header + body + notes;
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

  // ============ Rhyme & Measure ============
  const syllableCount = (word: string) => {
    let w = (word || '').toLowerCase();
    if (w.length <= 3) return w ? 1 : 0;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').replace(/^y/,'');
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 0;
  };

  const lastWord = (line: string) => (line.trim().split(/\s+/).pop() || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const rhymeKey = (word: string) => {
    const v = 'aeiou';
    for (let i = word.length - 1; i >= 0; i--) if (v.includes(word[i])) return word.slice(i);
    return word;
  };

  const computeRhymeClasses = (secs: LyricSection[]): Record<string, string> => {
    const words: { key: string; id: string }[] = [];
    secs.forEach((s, si) => s.lines.forEach((ln, li) => {
      const lw = lastWord(ln.lyric);
      if (!lw) return;
      const key = rhymeKey(lw);
      if (key.length < 2) return;
      words.push({ key, id: `${si}:${li}` });
    }));
    const colorMap: Record<string, string> = {};
    let idx = 1;
    const out: Record<string, string> = {};
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        if (words[i].key === words[j].key) {
          if (!colorMap[words[i].key]) colorMap[words[i].key] = `rhyme-${idx++}`;
          out[words[i].id] = colorMap[words[i].key];
          out[words[j].id] = colorMap[words[i].key];
        }
      }
    }
    return out;
  };

  const [measureMode, setMeasureMode] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const rhymeClasses = settings.rhymeHighlight ? computeRhymeClasses(sections) : {};

  // ============ AI parsing helpers ============
  const isSectionLabel = (line: string) => /^\s*\[[^\]]+\]\s*$/.test(line);

  const isChordToken = (tok: string) => /^(?:[A-G](?:#|b)?(?:(?:m(?!aj))|maj7|maj9|maj|m7|m9|m11|sus2|sus4|add9|dim7?|aug|\+|°)?(?:\/([A-G](?:#|b)?))?|N\/?A)$/i.test(tok);

  const isChordLine = (line: string) => {
    const l = (line || '').trim();
    if (!l) return false;
    if (/^[A-Za-z0-9 ,.'"-]+:$/.test(l)) return false;
    const tokens = l.split(/\s+/).filter(Boolean);
    if (!tokens.length) return false;
    let good = 0;
    for (const t of tokens) if (isChordToken(t)) good++;
    const conf = good / tokens.length;
    if (conf >= 0.6) return true;
    if (conf >= 0.4 && !/[a-z]{2,}/.test(l.replace(/maj|sus|dim|aug|add|maj7|maj9|m7|m9|m11/gi, ''))) return true;
    return false;
  };

  const computeLyricsAndChordsFromText = (text: string) => {
    const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
    type ParsedSection = { label: string; lyrics: string[]; chords: string[] };
    const result: ParsedSection[] = [];
    let current: ParsedSection | null = null;

    const pushCurrent = () => {
      if (!current) return;
      // Balance chords and lyrics lines (alternating format yields equal count)
      const max = Math.max(current.lyrics.length, current.chords.length);
      while (current.chords.length < max) current.chords.push('');
      while (current.lyrics.length < max) current.lyrics.push('');
      result.push(current);
      current = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? '';
      const line = raw.trimEnd();
      if (!line && !current) continue;
      if (isSectionLabel(line)) {
        pushCurrent();
        current = { label: line, lyrics: [], chords: [] };
        continue;
      }
      if (!current) current = { label: '[Verse 1]', lyrics: [], chords: [] };
      // Determine alternating by chord/lyric heuristic
      if (isChordLine(line)) {
        current.chords.push(line);
        const next = (lines[i + 1] || '').trimEnd();
        if (next && !isSectionLabel(next)) {
          current.lyrics.push(next);
          i += 1;
        } else {
          // chord with no lyric; leave lyric empty
          current.lyrics.push('');
        }
      } else {
        current.lyrics.push(line);
        // optional: leave chord empty to keep alignment
        current.chords.push('');
      }
    }
    pushCurrent();
    return result;
  };

  // AI tools launcher
  const openAiTools = () => setShowAiTools(true);
  const closeAiTools = () => setShowAiTools(false);

  const runAiTool = async (tool: string, extra?: string) => {
    let prompt = '';
    const allText = getAllLyrics();
    if (tool === 'firstDraft') {
      prompt = `Write a complete first draft of a song with common sections. Use alternating lines (chords above lyrics) and section labels in square brackets. ${extra ? `Style: ${extra}.` : ''}`;
    } else if (tool === 'polish') {
      prompt = `Polish the following lyrics for flow, rhyme, and clarity. Keep structure. Output alternating chords/lyrics with [Label] lines.\n\n${allText}`;
    } else if (tool === 'rewriteStyle') {
      prompt = `Rewrite these lyrics in the style of ${extra || 'a popular style'}. Preserve structure. Output alternating chords/lyrics with [Label] lines.\n\n${allText}`;
    } else if (tool === 'continue') {
      prompt = `Continue the song after this content. Output only the continuation with alternating chords/lyrics and [Label] lines. Do not repeat input.\n\n${allText}`;
    } else if (tool === 'suggestChords') {
      prompt = `Suggest chord progressions for the following lyrics. For each lyric line, output one line of chords above it. Keep [Label] lines as-is.\n\n${allText}`;
    }

    if (!prompt) return;
    setPendingAction(tool);
    const res = await callAI(prompt);
    if (!res) return;
    setReviewText(res.trim());
    setShowReview(true);
    setShowAiTools(false);
  };

  const acceptAI = () => {
    if (!pendingAction || !reviewText) { setShowReview(false); return; }
    const parsed = computeLyricsAndChordsFromText(reviewText);
    if (pendingAction === 'suggestChords') {
      // Align chords to current lyrics by section
      pushToUndoStack();
      const newSections = sections.map((sec) => {
        const match = parsed.find(p => p.label.trim().toLowerCase() === sec.label.trim().toLowerCase()) || parsed[0];
        if (!match) return sec;
        const lyricLines = (sec.lyrics || '').split('\n');
        const chordsOut: string[] = [];
        let idx = 0;
        for (const l of lyricLines) {
          if (isSectionLabel(l)) { chordsOut.push(''); continue; }
          chordsOut.push(match.chords[idx] || '');
          if (typeof match.chords[idx] !== 'undefined') idx++;
        }
        return { ...sec, chords: chordsOut.join('\n') };
      });
      setSections(newSections);
    } else if (pendingAction === 'continue') {
      // Append new sections/lines to the end
      pushToUndoStack();
      const appendSections = parsed.map(p => ({
        id: (Math.max(...sections.map(s => parseInt(s.id) || 0)) + Math.floor(Math.random()*100+1)).toString(),
        label: p.label,
        lyrics: p.lyrics.join('\n'),
        chords: p.chords.join('\n')
      }));
      setSections(prev => [...prev, ...appendSections]);
    } else {
      // Replace full content with parsed structure
      pushToUndoStack();
      const replaced = parsed.map((p, i) => ({
        id: (i + 1).toString(),
        label: p.label,
        lyrics: p.lyrics.join('\n'),
        chords: p.chords.join('\n')
      }));
      setSections(replaced.length ? replaced : sections);
    }
    setShowReview(false);
    setReviewText('');
    setPendingAction(null);
    toast({ title: 'AI update applied' });
  };

  const rejectAI = () => {
    setShowReview(false);
    setReviewText('');
    setPendingAction(null);
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
              onClick={openAiTools}
              className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
              title="AI Tools"
            >
              <Sparkles size={16} />
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
              onClick={() => setShowCopyModal(true)}
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
              <button
                onClick={() => setMetaOpen(true)}
                className="px-3 py-2 rounded-md lyric-surface hover:lyric-highlight-bg text-left text-sm"
                title="Song Metadata"
              >
                Song Metadata
              </button>
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
            {sections.map((section, si) => (
              <div key={section.id} className="lyric-bg-secondary rounded-lg p-4 border lyric-border border-opacity-30">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={section.label}
                    disabled={readOnly}
                    onChange={(e) => updateSectionLabel(section.id, e.target.value)}
                    className="font-semibold text-lg lyric-accent bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-opacity-50 lyric-highlight rounded px-2 py-1"
                  />
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded lyric-surface hover:lyric-highlight-bg" title="Move Up" onClick={() => moveSection(section.id, -1)}><ChevronDown className="rotate-180" size={14} /></button>
                    <button className="p-1 rounded lyric-surface hover:lyric-highlight-bg" title="Move Down" onClick={() => moveSection(section.id, 1)}><ChevronDown size={14} /></button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-1 rounded text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {section.lines.map((ln, li) => {
                    const id = `${si}:${li}`;
                    // Measure target (rough): top * 2 syllables
                    let target = 8;
                    const top = parseInt(String(meta.timeSignature || '4/4').split('/')[0] || '4', 10);
                    if (!isNaN(top) && top > 0) target = top * 2;
                    const syllables = ln.lyric.split(/\s+/).filter(Boolean).reduce((a, w) => a + syllableCount(w), 0);
                    const delta = Math.abs(syllables - target);
                    const badgeColor = delta <= 2 ? 'bg-green-600' : delta <= 4 ? 'bg-yellow-600' : 'bg-red-600';
                    return (
                      <div key={id} className="flex flex-col">
                        {settings.showChords && (
                          <input
                            disabled={readOnly}
                            value={ln.chords}
                            onChange={(e) => updateLine(section.id, li, 'chords', e.target.value)}
                            className="w-full p-2 text-sm rounded lyric-bg-primary border lyric-border border-opacity-30 font-mono"
                            placeholder="C   F   Am   G"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          {measureMode && (
                            <span className={`text-xs text-white px-2 py-1 rounded ${badgeColor}`}>{String(syllables).padStart(2,' ')}</span>
                          )}
                          <input
                            disabled={readOnly}
                            value={ln.lyric}
                            onChange={(e) => updateLine(section.id, li, 'lyric', e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLineAfter(section.id, li); } }}
                            className={`flex-1 p-3 rounded lyric-bg-primary border lyric-border border-opacity-30 ${settings.rhymeHighlight && rhymeClasses[id] ? rhymeClasses[id] : ''}`}
                            placeholder="Enter lyric..."
                          />
                          <button className="p-2 rounded lyric-surface hover:lyric-highlight-bg" title="Add line" onClick={() => addLineAfter(section.id, li)}><Plus size={14} /></button>
                          <button className="p-2 rounded lyric-surface hover:lyric-highlight-bg text-red-500" title="Delete line" onClick={() => deleteLine(section.id, li)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

        {/* Settings additions: Measure + Read-only toggles */}
        {showSettings && (
          <div className="p-4 border-t lyric-border border-opacity-30 lyric-bg-secondary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="measureMode" checked={measureMode} onChange={(e) => setMeasureMode(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="measureMode" className="text-sm">Measure Mode</label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="readOnly" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="readOnly" className="text-sm">Performance Mode</label>
              </div>
            </div>
          </div>
        )}

        {/* Copy Options Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowCopyModal(false)}>
            <div className="lyric-surface w-[320px] max-w-[94vw] p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-3">Copy Options</h3>
              <div className="grid gap-2">
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => { await navigator.clipboard.writeText(getAllLyrics()); setShowCopyModal(false); toast({ title: 'Copied raw lyrics' }); }}>Raw Lyrics</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => {
                  const text = sections.map(s => `${s.label}\n${formatLyricsWithChords(s.lyrics, s.chords)}`).join('\n\n');
                  await navigator.clipboard.writeText(text); setShowCopyModal(false); toast({ title: 'Copied lyrics + chords' });
                }}>Lyrics + Chords</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => { await navigator.clipboard.writeText(buildSongMarkdown()); setShowCopyModal(false); toast({ title: 'Copied full song' }); }}>Full Song (Markdown)</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={async () => {
                  const metaText = `${title || 'Untitled'}\nKey: ${meta.key || 'N/A'}\nTempo: ${meta.tempo} BPM\nTime: ${meta.timeSignature}\nTags: ${meta.tags || 'None'}`;
                  await navigator.clipboard.writeText(metaText); setShowCopyModal(false); toast({ title: 'Copied metadata' });
                }}>Metadata Only</button>
                <button className="modal-action-btn bg-gray-700 text-white px-3 py-2 rounded" onClick={() => setShowCopyModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Tools Modal */}
        {showAiTools && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={closeAiTools}>
            <div className="lyric-surface w-[360px] max-w-[95vw] p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-3">AI Tools</h3>
              <div className="grid gap-2">
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={() => runAiTool('firstDraft')}>Generate First Draft</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={() => runAiTool('polish')}>Polish Lyrics</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={() => { const style = prompt('Rewrite in which style?'); if (style) runAiTool('rewriteStyle', style); }}>Rewrite in Style</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={() => runAiTool('continue')}>Continue Song</button>
                <button className="modal-action-btn bg-blue-600 text-white px-3 py-2 rounded" onClick={() => runAiTool('suggestChords')}>Suggest Chords</button>
                <button className="modal-action-btn bg-gray-700 text-white px-3 py-2 rounded" onClick={closeAiTools}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Review Modal */}
        {showReview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={rejectAI}>
            <div className="lyric-surface w-[520px] max-w-[95vw] p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-3">AI Suggestion</h3>
              <pre className="bg-black/30 border border-white/10 rounded p-3 max-h-[45vh] overflow-auto whitespace-pre-wrap text-sm">{reviewText}</pre>
              <div className="flex gap-2 justify-end mt-3">
                <button className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white" onClick={acceptAI}>Accept</button>
                <button className="px-3 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white" onClick={rejectAI}>Reject</button>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Panel */}
        {metaOpen && (
          <div className="fixed inset-0 z-[65]" onClick={() => setMetaOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute right-0 top-0 h-full w-[360px] max-w-[95vw] lyric-surface p-4 border-l lyric-border" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Song Information</h3>
                <button className="p-2 rounded lyric-surface hover:lyric-highlight-bg" onClick={() => setMetaOpen(false)} title="Close"><X size={16} /></button>
              </div>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <label className="block mb-1">Title</label>
                  <input className="w-full p-2 rounded lyric-bg-primary border lyric-border" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1">Key</label>
                  <input className="w-full p-2 rounded lyric-bg-primary border lyric-border" value={meta.key} onChange={(e) => setMeta(m => ({ ...m, key: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1">Tempo (BPM)</label>
                  <input type="number" className="w-full p-2 rounded lyric-bg-primary border lyric-border" value={meta.tempo} onChange={(e) => setMeta(m => ({ ...m, tempo: parseInt(e.target.value || '120', 10) }))} />
                </div>
                <div>
                  <label className="block mb-1">Time Signature</label>
                  <input className="w-full p-2 rounded lyric-bg-primary border lyric-border" value={meta.timeSignature} onChange={(e) => setMeta(m => ({ ...m, timeSignature: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1">Tags (comma-separated)</label>
                  <input className="w-full p-2 rounded lyric-bg-primary border lyric-border" value={meta.tags} onChange={(e) => setMeta(m => ({ ...m, tags: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1">Performance Notes</label>
                  <textarea rows={4} className="w-full p-2 rounded lyric-bg-primary border lyric-border" value={meta.notes} onChange={(e) => setMeta(m => ({ ...m, notes: e.target.value }))} />
                </div>
                <button className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setMetaOpen(false); toast({ title: 'Metadata saved' }); }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
