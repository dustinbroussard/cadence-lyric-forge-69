
import React, { useState, useRef, useEffect } from 'react';
import { normalizeSectionLabels, lineSyllableCount } from '@/utils/lyrics';
import { cn } from '@/lib/utils';
import {
  X,
  Edit3,
  Music,
  Download,
  Save,
  Undo,
  Redo,
  Type,
  Palette,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Plus,
  Trash2,
  Copy,
  Zap,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Guitar,
  ChevronDown,
  Menu,
  Minus,
  Upload,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { chat } from '@/lib/openrouter/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple metadata panel state (local only for now)
  const [metaOpen, setMetaOpen] = useState(false);
  const [meta, setMeta] = useState({ key: '', tempo: 120, timeSignature: '4/4', tags: '' as string, notes: '' });
  
  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hideChords, setHideChords] = useState(false);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      parseLyrics(normalizeSectionLabels(text));
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast({
        title: 'Song Loaded',
        description: `"${file.name}" loaded for editing`,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
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

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const listener = () => handleTextSelection();
    el.addEventListener('mouseup', listener);
    el.addEventListener('keyup', listener);
    return () => {
      el.removeEventListener('mouseup', listener);
      el.removeEventListener('keyup', listener);
    };
  }, [sections]);

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
        const allLyrics = section.lines.map(ln => ln.lyric).join('\n');
        const newLyrics = allLyrics.replace(selectedText, result.trim());
        const newLines = newLyrics.split('\n').map((lyric, i) => ({
          chords: section.lines[i]?.chords || '',
          lyric
        }));
        setSections(prev => prev.map(s => 
          s.id === currentSectionId ? { ...s, lines: newLines } : s
        ));
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

  const [measureMode, setMeasureMode] = useState(true);
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
        const currentLyrics = sec.lines.map(ln => ln.lyric);
        const newLines = currentLyrics.map((lyric, i) => ({
          lyric,
          chords: match.chords[i] || ''
        }));
        return { ...sec, lines: newLines };
      });
      setSections(newSections);
    } else if (pendingAction === 'continue') {
      // Append new sections/lines to the end
      pushToUndoStack();
      const appendSections = parsed.map(p => ({
        id: (Math.max(...sections.map(s => parseInt(s.id) || 0)) + Math.floor(Math.random()*100+1)).toString(),
        label: p.label,
        lines: p.lyrics.map((lyric, i) => ({ lyric, chords: p.chords[i] || '' }))
      }));
      setSections(prev => [...prev, ...appendSections]);
    } else {
      // Replace full content with parsed structure
      pushToUndoStack();
      const replaced = parsed.map((p, i) => ({
        id: (i + 1).toString(),
        label: p.label,
        lines: p.lyrics.map((lyric, j) => ({ lyric, chords: p.chords[j] || '' }))
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
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md"
        className="hidden"
      />
      {/* Mobile-Style Header */}
      <div className="flex items-center justify-between p-4 bg-muted border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{title || 'Untitled Song'}</h1>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={undo}
            title="Undo"
            disabled={!undoStack.length}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={redo}
            title="Redo"
            disabled={!redoStack.length}
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={copyToClipboard}
            title="Copy Lyrics"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={exportLyrics}
            title="Export"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={() => onSave?.(title, getAllLyrics())}
            title="Save"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={addSection}
            title="Add Section"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Song"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={openAiTools}
            title="AI Tools"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={() => setMetaOpen(true)}
            title="Song Info"
          >
            <Music className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-muted border-b">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideChords(!hideChords)}
            >
              <Guitar className="w-4 h-4 mr-1" />
              {hideChords ? 'Show' : 'Hide'} Chords
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReadOnly(!readOnly)}
            >
              {readOnly ? <Edit3 className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {readOnly ? 'Edit' : 'Performance'} Mode
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings(prev => ({ ...prev, rhymeHighlight: !prev.rhymeHighlight }))}
            >
              <Palette className="w-4 h-4 mr-1" />
              Rhyme Colors
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMeasureMode(!measureMode)}
            >
              <Type className="w-4 h-4 mr-1" />
              {measureMode ? 'Hide' : 'Show'} Syllables
            </Button>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 overflow-y-auto" ref={editorRef}>
        <div className="space-y-1">
          {sections.map((section, sectionIndex) => {
            return (
              <div key={section.id} className="border-b border-border">
                <div
                  className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => {
                    const newCollapsed = { ...collapsedSections };
                    newCollapsed[section.id] = !newCollapsed[section.id];
                    setCollapsedSections(newCollapsed);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                    <Input
                      value={section.label}
                      onChange={(e) => updateSectionLabel(section.id, e.target.value)}
                      className="font-medium text-foreground bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                      disabled={readOnly}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSection(section.id, -1);
                      }}
                      disabled={sectionIndex === 0}
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSection(section.id, 1);
                      }}
                      disabled={sectionIndex === sections.length - 1}
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSection(section.id);
                      }}
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          collapsedSections[section.id] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </Button>
                  </div>
                </div>

                {!collapsedSections[section.id] && (
                  <div className="px-3 pb-3 space-y-2">
                    {section.lines.map((line, lineIndex) => (
                      <div key={lineIndex} className="flex gap-3 items-start">
                        {measureMode && (
                          <div className="w-10 text-xs text-muted-foreground pt-2 text-right shrink-0">
                            {lineSyllableCount(line.lyric)}
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          {!hideChords && settings.showChords && (
                            <div className="text-sm font-mono text-primary">
                              <Input
                                value={line.chords}
                                onChange={(e) => updateLine(section.id, lineIndex, 'chords', e.target.value)}
                                placeholder=""
                                disabled={readOnly}
                                className="border-none bg-transparent p-0 h-auto font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                onFocus={() => setCurrentSectionId(section.id)}
                              />
                            </div>
                          )}
                          <div className="text-base">
                            <Input
                              value={line.lyric}
                              onChange={(e) => updateLine(section.id, lineIndex, 'lyric', e.target.value)}
                              placeholder="Enter lyrics..."
                              disabled={readOnly}
                              className={cn('border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0', rhymeClasses[`${sectionIndex}:${lineIndex}`])}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addLineAfter(section.id, lineIndex);
                                }
                              }}
                              onFocus={() => setCurrentSectionId(section.id)}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => deleteLine(section.id, lineIndex)}
                          disabled={readOnly}
                          title="Delete Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addLineAfter(section.id, section.lines.length - 1)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        disabled={readOnly}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Line
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Font Size Controls - Mobile Style */}
      <div className="flex items-center justify-center p-4 bg-muted border-t">
        <div className="flex items-center gap-4 bg-primary/10 rounded-full px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full w-8 h-8 p-0"
            onClick={() => setSettings(prev => ({ 
              ...prev, 
              fontSize: Math.max(12, prev.fontSize - 1) 
            }))}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[3rem] text-center">
            {Math.round((settings.fontSize / 16) * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full w-8 h-8 p-0"
            onClick={() => setSettings(prev => ({ 
              ...prev, 
              fontSize: Math.min(24, prev.fontSize + 1) 
            }))}
          >
            <Plus className="w-4 h-4" />
          </Button>
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

         {/* AI Tools Modal */}
         {showAiTools && (
           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={closeAiTools}>
             <div className="bg-background w-[360px] max-w-[95vw] p-4 rounded-lg" onClick={(e) => e.stopPropagation()}>
               <h3 className="font-semibold mb-3">AI Tools</h3>
               <div className="grid gap-2">
                 <Button className="w-full" onClick={() => runAiTool('firstDraft')}>Generate First Draft</Button>
                 <Button className="w-full" onClick={() => runAiTool('polish')}>Polish Lyrics</Button>
                 <Button className="w-full" onClick={() => runAiTool('continue')}>Continue Song</Button>
                 <Button className="w-full" onClick={() => runAiTool('suggestChords')}>Suggest Chords</Button>
               </div>
               <Button variant="outline" className="w-full mt-2" onClick={closeAiTools}>Cancel</Button>
             </div>
           </div>
         )}

         {/* AI Review Modal */}
         {showReview && (
           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
             <div className="bg-background w-[520px] max-w-[95vw] p-4 rounded-lg">
               <h3 className="font-semibold mb-3">AI Suggestion</h3>
               <Textarea
                 value={reviewText}
                 onChange={(e) => setReviewText(e.target.value)}
                 rows={10}
                 className="w-full mb-3 font-mono text-sm"
               />
               <div className="flex gap-2 justify-end">
                 <Button onClick={acceptAI}>Accept</Button>
                 <Button variant="outline" onClick={rejectAI}>Reject</Button>
               </div>
             </div>
           </div>
         )}

         {/* Metadata Panel */}
         {metaOpen && (
           <div className="fixed inset-0 z-[65]" onClick={() => setMetaOpen(false)}>
             <div className="absolute inset-0 bg-black/50" />
             <div className="absolute right-0 top-0 h-full w-[360px] max-w-[95vw] bg-background p-4 border-l border-border" onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-semibold">Song Information</h3>
                 <Button variant="ghost" size="sm" onClick={() => setMetaOpen(false)}>
                   <X className="w-4 h-4" />
                 </Button>
               </div>
               <div className="space-y-3">
                 <div>
                   <label className="block text-sm font-medium mb-1">Title</label>
                   <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Key</label>
                   <Input value={meta.key} onChange={(e) => setMeta(m => ({ ...m, key: e.target.value }))} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Tempo (BPM)</label>
                   <Input type="number" value={meta.tempo} onChange={(e) => setMeta(m => ({ ...m, tempo: parseInt(e.target.value || '120', 10) }))} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Time Signature</label>
                   <Input value={meta.timeSignature} onChange={(e) => setMeta(m => ({ ...m, timeSignature: e.target.value }))} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Tags</label>
                   <Input value={meta.tags} onChange={(e) => setMeta(m => ({ ...m, tags: e.target.value }))} placeholder="rock, ballad, easy" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Performance Notes</label>
                   <Textarea rows={4} value={meta.notes} onChange={(e) => setMeta(m => ({ ...m, notes: e.target.value }))} />
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Processing Overlay */}
         {isProcessing && (
           <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
             <div className="bg-background rounded-lg p-6 text-center">
               <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
               <p>AI is processing...</p>
             </div>
           </div>
         )}
       </div>
     );
   }
