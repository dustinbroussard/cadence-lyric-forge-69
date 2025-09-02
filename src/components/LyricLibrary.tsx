
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Trash2, Edit, Music, Clock, Tags, Search, Filter } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface LyricEntry {
  id: string;
  title: string;
  lyrics: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  genre?: string;
  tempo?: string;
  key?: string;
  timeSignature?: string;
  notes?: string;
}

interface LyricLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadLyrics: (lyrics: string, title: string) => void;
  currentLyrics?: string;
  currentTitle?: string;
}

export function LyricLibrary({ isOpen, onClose, onLoadLyrics, currentLyrics, currentTitle }: LyricLibraryProps) {
  const [library, setLibrary] = useState<LyricEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LyricEntry | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'genre'>('date');
  const { toast } = useToast();

  useEffect(() => {
    loadLibrary();
  }, []);

  // Close save dialog on Escape
  useEffect(() => {
    if (!showSaveDialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSaveDialog(false);
        setEditingEntry(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSaveDialog]);

  const loadLibrary = () => {
    const saved = localStorage.getItem('lyric-library');
    if (saved) {
      try {
        setLibrary(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load lyric library:', error);
        setLibrary([]);
      }
    }
  };

  const saveLibrary = (updatedLibrary: LyricEntry[]) => {
    try {
      localStorage.setItem('lyric-library', JSON.stringify(updatedLibrary));
      setLibrary(updatedLibrary);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save to library",
        variant: "destructive"
      });
    }
  };

  const saveLyrics = (entryData: Partial<LyricEntry>) => {
    if (!currentLyrics?.trim() || !entryData.title?.trim()) {
      toast({
        title: "Invalid Data",
        description: "Title and lyrics are required",
        variant: "destructive"
      });
      return;
    }

    const now = new Date().toISOString();
    const entry: LyricEntry = {
      id: editingEntry?.id || `lyric-${Date.now()}`,
      title: entryData.title,
      lyrics: currentLyrics,
      createdAt: editingEntry?.createdAt || now,
      updatedAt: now,
      tags: entryData.tags || [],
      genre: entryData.genre || '',
      tempo: entryData.tempo || '',
      key: entryData.key || '',
      timeSignature: entryData.timeSignature || '4/4',
      notes: entryData.notes || ''
    };

    const updatedLibrary = editingEntry 
      ? library.map(item => item.id === editingEntry.id ? entry : item)
      : [...library, entry];

    saveLibrary(updatedLibrary);
    setShowSaveDialog(false);
    setEditingEntry(null);
    
    toast({
      title: editingEntry ? "Updated" : "Saved",
      description: `"${entry.title}" has been ${editingEntry ? 'updated' : 'saved'} to your library`
    });
  };

  const deleteLyrics = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      const updatedLibrary = library.filter(item => item.id !== id);
      saveLibrary(updatedLibrary);
      toast({
        title: "Deleted",
        description: "Entry has been removed from library"
      });
    }
  };

  const exportEntry = (entry: LyricEntry) => {
    const content = `# ${entry.title}

${entry.genre ? `**Genre:** ${entry.genre}\n` : ''}${entry.key ? `**Key:** ${entry.key}\n` : ''}${entry.tempo ? `**Tempo:** ${entry.tempo} BPM\n` : ''}${entry.timeSignature ? `**Time Signature:** ${entry.timeSignature}\n` : ''}${entry.tags?.length ? `**Tags:** ${entry.tags.join(', ')}\n` : ''}

---

${entry.lyrics}

${entry.notes ? `\n---\n**Notes:**\n${entry.notes}` : ''}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredAndSortedLibrary = library
    .filter(entry => {
      const matchesSearch = !searchTerm || 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.lyrics.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesGenre = !filterGenre || entry.genre === filterGenre;
      
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'genre':
          return (a.genre || '').localeCompare(b.genre || '');
        case 'date':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const genres = Array.from(new Set(library.map(entry => entry.genre).filter(Boolean)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="lyric-surface rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b lyric-border border-opacity-30">
          <h2 className="text-lg font-bold lyric-accent">Lyric Library</h2>
          <div className="flex items-center space-x-2">
            {currentLyrics && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Save Current
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

        {/* Filters and Search */}
        <div className="p-4 border-b lyric-border border-opacity-30 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 lyric-text opacity-50" size={16} />
                <input
                  type="text"
                  placeholder="Search lyrics, titles, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
              >
                <option value="">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'genre')}
                className="px-3 py-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="genre">Sort by Genre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Library List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[60vh]">
          {filteredAndSortedLibrary.length === 0 ? (
            <div className="text-center py-8 lyric-text opacity-70">
              {library.length === 0 ? (
                <div>
                  <Music size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Your lyric library is empty</p>
                  <p className="text-sm mt-2">Save your current lyrics to get started</p>
                </div>
              ) : (
                <p>No lyrics match your search criteria</p>
              )}
            </div>
          ) : (
            filteredAndSortedLibrary.map(entry => (
              <div key={entry.id} className="lyric-bg-secondary rounded-lg p-4 border lyric-border border-opacity-30">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold lyric-text truncate">{entry.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs lyric-text opacity-70">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </div>
                      {entry.genre && (
                        <div className="flex items-center gap-1">
                          <Music size={12} />
                          {entry.genre}
                        </div>
                      )}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tags size={12} />
                          {entry.tags.slice(0, 2).join(', ')}{entry.tags.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                    <p className="text-sm lyric-text opacity-80 mt-2 line-clamp-2">
                      {entry.lyrics.split('\n').find(line => line.trim() && !line.startsWith('[')) || entry.lyrics.substring(0, 100)}...
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-3">
                    <button
                      onClick={() => onLoadLyrics(entry.lyrics, entry.title)}
                      className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      title="Load lyrics"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => exportEntry(entry)}
                      className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
                      title="Export as file"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingEntry(entry);
                        setShowSaveDialog(true);
                      }}
                      className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors"
                      title="Edit metadata"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => deleteLyrics(entry.id)}
                      className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-colors text-red-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Save Dialog (portal to avoid clipping/stacking issues) */}
        {showSaveDialog && createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
            <div className="lyric-surface p-6 w-full max-w-md rounded-xl" role="dialog" aria-modal="true">
              <h3 className="font-bold text-lg mb-4">{editingEntry ? 'Edit Entry' : 'Save to Library'}</h3>
               <SaveForm
                 initialData={editingEntry}
                 defaultTitle={currentTitle || undefined}
                 onSave={saveLyrics}
                 onCancel={() => {
                  setShowSaveDialog(false);
                  setEditingEntry(null);
                }}
              />
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

function SaveForm({ initialData, defaultTitle, onSave, onCancel }: {
  initialData?: LyricEntry | null;
  defaultTitle?: string | undefined;
  onSave: (data: Partial<LyricEntry>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || defaultTitle || '',
    genre: initialData?.genre || '',
    key: initialData?.key || '',
    tempo: initialData?.tempo || '',
    timeSignature: initialData?.timeSignature || '4/4',
    tags: initialData?.tags?.join(', ') || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">Genre</label>
          <input
            type="text"
            value={formData.genre}
            onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
            className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
            placeholder="Rock, Pop, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Key</label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
            className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
            placeholder="C, Am, etc."
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">Tempo</label>
          <input
            type="text"
            value={formData.tempo}
            onChange={(e) => setFormData(prev => ({ ...prev, tempo: e.target.value }))}
            className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
            placeholder="120 BPM"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Time Signature</label>
          <select
            value={formData.timeSignature}
            onChange={(e) => setFormData(prev => ({ ...prev, timeSignature: e.target.value }))}
            className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="2/4">2/4</option>
            <option value="6/8">6/8</option>
            <option value="12/8">12/8</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight"
          placeholder="ballad, emotional, catchy (comma separated)"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full p-2 text-sm rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight resize-none"
          placeholder="Performance notes, inspiration, etc."
        />
      </div>
      
      <div className="flex space-x-2 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          {initialData ? 'Update' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
