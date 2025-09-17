
import React, { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface Model {
  id: string;
  name: string;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
}

interface ModelDropdownProps {
  value?: string;
  onChange: (modelId: string) => void;
  className?: string;
}

export function ModelDropdown({ value = '', onChange, className = '' }: ModelDropdownProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const CACHE_KEY = 'openrouter_models_cache_v1';
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

    // Hydrate from cache immediately for faster UX/offline
    let hydratedFromCache = false;
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { ts: number; data: Model[] };
        if (Array.isArray(cached.data)) {
          setModels(cached.data);
          setLoading(false);
          hydratedFromCache = true;
        }
      }
    } catch {
      // ignore cache errors
    }

    async function fetchModels() {
      try {
        setLoading(!hydratedFromCache);
        const res = await fetch("https://openrouter.ai/api/v1/models");
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch models`);
        const json = await res.json();
        const list: Model[] = json.data || [];
        setModels(list);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
        } catch {
          // ignore storage errors
        }
      } catch (err) {
        // If cache exists, keep UI usable; otherwise surface the error
        if (!hydratedFromCache) {
          setError(err instanceof Error ? err.message : 'Failed to fetch models');
        }
      } finally {
        setLoading(false);
      }
    }
    // Only refetch if cache is stale or empty
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    let shouldFetch = true;
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { ts: number; data: Model[] };
        if (Date.now() - cached.ts < CACHE_TTL_MS && Array.isArray(cached.data) && cached.data.length) {
          shouldFetch = false;
        }
      } catch {
        // malformed cache, refetch
      }
    }
    if (shouldFetch) fetchModels();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleModelSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  const filteredModels = showOnlyFree
    ? models.filter(model => {
        const promptPrice = parseFloat(String(model.pricing?.prompt || 0));
        const completionPrice = parseFloat(String(model.pricing?.completion || 0));
        return promptPrice === 0 && completionPrice === 0;
      })
    : models;

  const selectedModel = models.find(model => model.id === value);

  if (loading) {
    return (
      <div className={`p-2 text-xs lyric-text opacity-70 ${className}`}>
        Loading models...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-2 text-xs text-red-400 ${className}`}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Free Models Only Checkbox */}
      <label className="flex items-center space-x-2 mb-2 cursor-pointer text-xs">
        <input
          type="checkbox"
          checked={showOnlyFree}
          onChange={(e) => setShowOnlyFree(e.target.checked)}
          className="w-3 h-3 lyric-accent-bg rounded"
        />
        <span className="lyric-text">Free Models Only</span>
      </label>

      {/* Custom Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300 text-left flex items-center justify-between"
        >
          <span className={selectedModel ? 'lyric-text' : 'lyric-text opacity-50'}>
            {selectedModel ? selectedModel.name : 'Select a model'}
          </span>
          <ChevronDown 
            size={12} 
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 lyric-surface border lyric-border border-opacity-30 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="p-2 text-xs lyric-text opacity-70 text-center">
                No models available
              </div>
            ) : (
              filteredModels.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleModelSelect(model.id)}
                  className="w-full p-2 text-xs text-left hover:lyric-highlight-bg transition-colors duration-200 flex items-center justify-between lyric-text"
                >
                  <span className="truncate">{model.name}</span>
                  {value === model.id && (
                    <Check size={12} className="lyric-accent flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
