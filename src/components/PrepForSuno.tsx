
import React, { useState } from 'react';
import { Music, Copy, ExternalLink, Sparkles, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface PrepForSunoProps {
  lyrics: string;
  musicalContext: {
    selectedGenres: string[];
    tempo: string;
    chordProgression: string;
    timeSignature: string;
    rhythmFeel: string;
  };
  userInput: string;
  onClose: () => void;
}

export const PrepForSuno: React.FC<PrepForSunoProps> = ({
  lyrics,
  musicalContext,
  userInput,
  onClose
}) => {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateStylePrompt = () => {
    let stylePrompt = '';
    
    // Use existing musical context if available
    if (musicalContext.selectedGenres.length > 0 || musicalContext.tempo || musicalContext.rhythmFeel) {
      const genres = musicalContext.selectedGenres.join(', ') || 'Contemporary';
      const tempo = musicalContext.tempo ? `${musicalContext.tempo} BPM` : 'Medium tempo';
      const feel = musicalContext.rhythmFeel || 'Steady groove';
      
      stylePrompt = `${genres}, ${tempo}, ${feel}`;
      
      if (musicalContext.chordProgression) {
        stylePrompt += `, ${musicalContext.chordProgression}`;
      }
    } else {
      // Auto-generate based on lyrical content and user input
      const combinedContent = `${userInput}\n\n${lyrics}`.toLowerCase();
      
      let suggestedGenre = 'Alternative rock';
      let suggestedTempo = '120 BPM';
      let suggestedMood = 'introspective groove';
      let suggestedInstrumentation = 'electric guitar, bass, drums';
      
      // Simple keyword-based analysis
      if (combinedContent.includes('love') || combinedContent.includes('heart')) {
        suggestedGenre = 'Indie pop';
        suggestedMood = 'romantic, warm';
        suggestedInstrumentation = 'acoustic guitar, soft drums, piano';
      } else if (combinedContent.includes('fight') || combinedContent.includes('power') || combinedContent.includes('strong')) {
        suggestedGenre = 'Rock';
        suggestedTempo = '140 BPM';
        suggestedMood = 'powerful, driving';
        suggestedInstrumentation = 'electric guitar, heavy drums, bass';
      } else if (combinedContent.includes('dance') || combinedContent.includes('party') || combinedContent.includes('groove')) {
        suggestedGenre = 'Pop';
        suggestedTempo = '128 BPM';
        suggestedMood = 'energetic, fun';
        suggestedInstrumentation = 'synths, electronic beats, bass';
      } else if (combinedContent.includes('sad') || combinedContent.includes('lost') || combinedContent.includes('alone')) {
        suggestedGenre = 'Indie folk';
        suggestedTempo = '80 BPM';
        suggestedMood = 'melancholic, reflective';
        suggestedInstrumentation = 'acoustic guitar, strings';
      } else if (combinedContent.includes('blues') || combinedContent.includes('honky')) {
        suggestedGenre = 'Modern blues';
        suggestedTempo = '100 BPM';
        suggestedMood = 'shuffle groove';
        suggestedInstrumentation = 'blues guitar, harmonica';
      }
      
      stylePrompt = `${suggestedGenre}, ${suggestedTempo}, ${suggestedMood}, ${suggestedInstrumentation}`;
    }
    
    return stylePrompt;
  };

  const cleanLyrics = (rawLyrics: string) => {
    // Remove all markdown formatting, asterisks, commentary, and cleanup
    const cleaned = rawLyrics
      // Remove markdown formatting
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`{1,3}/g, '')
      // Remove parenthetical stage directions and commentary
      .replace(/\([^)]*\)/g, '')
      // Remove quotes around song titles at the start
      .replace(/^"[^"]*"\s*\n?/gm, '')
      // Remove subtitle lines in parentheses
      .replace(/^\([^)]*\)\s*$/gm, '')
      // Clean up section labels - remove duplicates and fix formatting
      .replace(/\[([^\]]+)\]\s*\n\s*\[([^\]]+)\]/g, '[$2]')
      // Remove standalone section words without brackets
      .replace(/^(Verse|Chorus|Bridge|Outro|Intro)\s*\d*\s*$/gm, '')
      // Fix section label formatting
      .replace(/^([A-Z][a-z]+)\s*(\d+)?\s*$/gm, (match, section, number) => {
        return `[${section}${number ? ' ' + number : ''}]`;
      })
      // Remove empty lines between section labels and content
      .replace(/(\[[^\]]+\])\s*\n\s*\n/g, '$1\n')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If no section labels exist, try to add basic structure
    if (!cleaned.includes('[Verse') && !cleaned.includes('[Chorus')) {
      const lines = cleaned.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        let structured = '';
        let currentSection = 'Verse 1';
        let lineCount = 0;
        let inSection = false;
        
        for (const line of lines) {
          if (!inSection && line.trim()) {
            structured += `[${currentSection}]\n`;
            inSection = true;
            lineCount = 0;
          }
          
          if (line.trim()) {
            structured += line + '\n';
            lineCount++;
            
            // Simple heuristic for structure
            if (lineCount >= 4 && currentSection === 'Verse 1') {
              structured += '\n[Chorus]\n';
              currentSection = 'Chorus';
              lineCount = 0;
            } else if (lineCount >= 4 && currentSection === 'Chorus') {
              structured += '\n[Verse 2]\n';
              currentSection = 'Verse 2';
              lineCount = 0;
            }
          } else {
            structured += '\n';
          }
        }
        
        return structured.trim();
      }
    }
    
    return cleaned;
  };

  const generateSunoExport = () => {
    const stylePrompt = generateStylePrompt();
    const cleanedLyrics = cleanLyrics(lyrics);
    
    // Generate clean, Suno-ready format
    const exportText = `${stylePrompt}

${cleanedLyrics}`;
    
    setGeneratedPrompt(exportText);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      toast({
        title: "Copied to Clipboard",
        description: "Suno-ready prompt copied successfully!",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const openSuno = () => {
    window.open('https://app.suno.ai', '_blank');
  };

  React.useEffect(() => {
    generateSunoExport();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="lyric-surface border lyric-border border-opacity-30 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg lyric-accent-bg text-white">
              <Music size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold lyric-accent">Prep for Suno</h2>
              <p className="text-sm opacity-70">Clean, formatted export ready for AI music generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Generated Export Preview */}
          <div className="p-4 lyric-bg-secondary rounded-xl border lyric-border border-opacity-30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold lyric-accent">Suno-Ready Export</h3>
              <button
                onClick={generateSunoExport}
                className="px-3 py-1.5 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-all duration-300 text-sm flex items-center space-x-2"
              >
                <Sparkles size={14} />
                <span>Regenerate</span>
              </button>
            </div>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap border border-gray-700 max-h-96 overflow-y-auto">
              {generatedPrompt}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 px-4 py-3 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-semibold flex items-center justify-center space-x-2"
            >
              <Copy size={18} />
              <span>Copy Suno Prompt</span>
            </button>
            
            <button
              onClick={openSuno}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-semibold flex items-center justify-center space-x-2"
            >
              <ExternalLink size={18} />
              <span>Open Suno AI</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">How to use with Suno AI:</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Copy the entire prompt above using the "Copy Suno Prompt" button</li>
              <li>Open Suno AI and start creating a new song</li>
              <li>Choose "Custom" mode in Suno</li>
              <li>Paste the first line (style description) in the "Style of Music" field</li>
              <li>Paste everything after the first line in the "Lyrics" field</li>
              <li>Generate your song and enjoy!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
