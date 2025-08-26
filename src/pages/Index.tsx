// @ts-nocheck
import React, { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Square, Download, Settings, Sun, Moon, Edit3, RotateCcw, Save, ChevronDown, ChevronRight, Menu, X, Copy, Music, Trash2, Users, StopCircle, ArrowRight } from 'lucide-react';
import { playTypewriterSound, triggerHaptic } from '../utils/audioUtils';
import { useToast } from '../hooks/use-toast';

// Add new imports for comprehensive features
import { MusicalContextPanel } from '../components/MusicalContextPanel';
import { MusicalSuggestionsModal } from '../components/MusicalSuggestionsModal';
import { EnhancedPromptSetManager } from '../components/EnhancedPromptSetManager';
import { PrepForSuno } from '../components/PrepForSuno';
import { InstallPrompt } from '../components/InstallPrompt';
import { LyricLibrary } from '../components/LyricLibrary';
import { AdvancedLyricEditor } from '../components/AdvancedLyricEditor';

// Add new imports for Clear Output and Model Slates
import { ClearOutputDialog } from '../components/ClearOutputDialog';
import { ModelSlatesManager } from '../components/ModelSlatesManager';

import { ModelDropdown } from '../components/ModelDropdown';
import { buildPromptWithGenreInjection, buildCritiquePrompt, PromptContext } from '../utils/promptManager';
import { analyzeLyricForMusicalFit, MusicalSuggestions } from '../utils/musicalSuggestions';
import { CRITIQUE_PROMPT } from '../data/critiquePrompts';

// Default prompts for each stage - Updated stage 3 to include first draft generation
const DEFAULT_PROMPTS = {
  perspective: "Based on the user's input, establish a clear narrative perspective (1st person, 3rd person, or observer). Add emotional grounding that aligns with their voice and style. Keep it concise but impactful.",
  message: "Identify the core message or theme from the established perspective. What is this really about on both literal and allegorical levels? What deeper truth is being explored?",
  tone: "Choose an emotional tone that fits the message and perspective. Consider the full spectrum: melancholic, defiant, hopeful, raw, contemplative, etc. Make it specific and vivid. Then create a FIRST DRAFT of the song with basic verses and chorus that captures this tone and the established perspective and message. This should be a complete, singable lyric even if rough.",
  metaphor: "Create a strong, original metaphor or allegory that unifies the entire song. This should be the golden thread that ties everything together with vivid, memorable imagery.",
  themes: "Build consistent motifs and imagery that support the central metaphor. Include sensory details, recurring symbols, and thematic elements that enhance the overall narrative.",
  musicalSuggestions: "Based on the lyrical content, mood, and selected genres, suggest appropriate musical elements including tempo, chord progression, time signature, and rhythmic feel that would complement the song.",
  flow: "Assemble all elements into a structured, singable lyric with clear verses, choruses, and a bridge. Focus on natural rhythm, compelling rhyme schemes, and musical flow."
};

// Stage definitions
const STAGES = [
  { id: 'perspective', name: 'Establish Perspective', description: 'Set the narrative voice and emotional foundation' },
  { id: 'message', name: 'Define the Message', description: 'Identify core themes and deeper meaning' },
  { id: 'tone', name: 'Set the Tone', description: 'Choose the emotional atmosphere' },
  { id: 'metaphor', name: 'Develop Rich Metaphor', description: 'Create unifying imagery and allegory' },
  { id: 'themes', name: 'Craft Themes & Imagery', description: 'Build motifs and sensory details' },
  { id: 'musicalSuggestions', name: 'Musical Elements', description: 'AI suggests tempo, chords, and rhythm' },
  { id: 'flow', name: 'Focus on Flow', description: 'Structure into verses, chorus, and bridge' }
];

// Add a new critique stage
const CRITIQUE_STAGE = {
  id: 'critique',
  name: 'Review & Critique',
  description: 'Get professional feedback on your lyrics'
};

const initialState = {
  userInput: '',
  currentStage: 0,
  stageData: {},
  customPrompts: {},
  stageModels: {}, // New: track model selection per stage
  musicalContext: {
    selectedGenres: [],
    selectedStructure: '',
    isExpanded: false,
    tempo: '',
    chordProgression: '',
    timeSignature: '',
    rhythmFeel: ''
  },
  settings: {
    theme: 'dark',
    apiKey: '',
    selectedModel: 'anthropic/claude-3-haiku',
    soundEnabled: true,
    hapticEnabled: true,
    autoSuggestMusic: true
  },
  isLoading: false,
  expandedStages: new Set(),
  animationState: { isPlaying: false, currentChar: 0, targetText: '', targetStage: '' },
  showMobileMenu: false,
  showPromptSetManager: false,
  showPrepForSuno: false,
  musicalSuggestions: null,
  showMusicalSuggestions: false,
  // Add new state for enhanced features
  showClearOutputDialog: false,
  showModelSlatesManager: false,
  interruptRequested: false,
  showLyricLibrary: false,
  showAdvancedEditor: false
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER_INPUT':
      return { ...state, userInput: action.payload };
    case 'SET_CURRENT_STAGE':
      return { ...state, currentStage: action.payload };
    case 'SET_STAGE_DATA':
      return { 
        ...state, 
        stageData: { ...state.stageData, [action.stage]: action.payload }
      };
    case 'SET_CUSTOM_PROMPT':
      return {
        ...state,
        customPrompts: { ...state.customPrompts, [action.stage]: action.payload }
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'TOGGLE_STAGE_EXPANSION':
      const newExpanded = new Set(state.expandedStages);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedStages: newExpanded };
    case 'SET_ANIMATION_STATE':
      return {
        ...state,
        animationState: { ...state.animationState, ...action.payload }
      };
    case 'TOGGLE_MOBILE_MENU':
      return { ...state, showMobileMenu: !state.showMobileMenu };
    case 'UPDATE_MUSICAL_CONTEXT':
      return {
        ...state,
        musicalContext: { ...state.musicalContext, ...action.payload }
      };
    case 'SET_MUSICAL_SUGGESTIONS':
      return {
        ...state,
        musicalSuggestions: action.payload,
        showMusicalSuggestions: !!action.payload
      };
    case 'TOGGLE_PROMPT_SET_MANAGER':
      return { ...state, showPromptSetManager: !state.showPromptSetManager };
    case 'RESET_ALL':
      return { ...initialState, settings: state.settings };
    case 'SET_STAGE_MODEL':
      return {
        ...state,
        stageModels: { ...state.stageModels, [action.stage]: action.payload }
      };
    case 'TOGGLE_PREP_FOR_SUNO':
      return { ...state, showPrepForSuno: !state.showPrepForSuno };
    case 'TOGGLE_CLEAR_OUTPUT_DIALOG':
      return { ...state, showClearOutputDialog: !state.showClearOutputDialog };
    case 'CLEAR_ALL_OUTPUT':
      return { 
        ...state, 
        stageData: {}, 
        animationState: { isPlaying: false, currentChar: 0, targetText: '', targetStage: '' },
        musicalSuggestions: null,
        showMusicalSuggestions: false 
      };
    case 'TOGGLE_MODEL_SLATES_MANAGER':
      return { ...state, showModelSlatesManager: !state.showModelSlatesManager };
    case 'LOAD_MODEL_SLATE':
      return { ...state, stageModels: { ...action.payload } };
    case 'SET_INTERRUPT_REQUESTED':
      return { ...state, interruptRequested: action.payload };
    case 'AUTO_EXPAND_STAGE':
      const expandedSet = new Set(state.expandedStages);
      expandedSet.add(action.payload);
      return { ...state, expandedStages: expandedSet };
    case 'TOGGLE_LYRIC_LIBRARY':
      return { ...state, showLyricLibrary: !state.showLyricLibrary };
    case 'TOGGLE_ADVANCED_EDITOR':
      return { ...state, showAdvancedEditor: !state.showAdvancedEditor };
    case 'UPDATE_STAGE_OUTPUT':
      return {
        ...state,
        stageData: { ...state.stageData, [action.stage]: action.payload }
      };
    default:
      return state;
  }
}

export default function CadenceCodex() {
  const [state, dispatch] = useReducer(appReducer, { ...initialState, interruptRequested: false });
  const [showSettings, setShowSettings] = useState(false);
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const animationRef = useRef(null);
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cadence-codex-state');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        dispatch({ type: 'UPDATE_SETTINGS', payload: parsedState.settings || {} });
        dispatch({ type: 'SET_USER_INPUT', payload: parsedState.userInput || '' });
        dispatch({ type: 'UPDATE_MUSICAL_CONTEXT', payload: parsedState.musicalContext || {} });
        Object.entries(parsedState.stageData || {}).forEach(([stage, data]) => {
          dispatch({ type: 'SET_STAGE_DATA', stage, payload: data });
        });
        Object.entries(parsedState.customPrompts || {}).forEach(([stage, prompt]) => {
          dispatch({ type: 'SET_CUSTOM_PROMPT', stage, payload: prompt });
        });
        if (parsedState.stageModels) {
          Object.entries(parsedState.stageModels).forEach(([stage, modelId]) => {
            dispatch({ type: 'SET_STAGE_MODEL', stage, payload: modelId });
          });
        }
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    const stateToSave = {
      userInput: state.userInput,
      stageData: state.stageData,
      customPrompts: state.customPrompts,
      stageModels: state.stageModels,
      musicalContext: state.musicalContext,
      settings: state.settings
    };
    localStorage.setItem('cadence-codex-state', JSON.stringify(stateToSave));
  }, [state.userInput, state.stageData, state.customPrompts, state.stageModels, state.musicalContext, state.settings]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  const callOpenRouter = async (prompt, context, modelOverride = null) => {
    if (!state.settings.apiKey) {
      throw new Error('Please configure your API key in settings');
    }

    const modelToUse = modelOverride || state.settings.selectedModel;
    if (!modelToUse) {
      throw new Error('Please select a model');
    }

    const fullPrompt = `${context}\n\nStage Prompt: ${prompt}`;
    
    console.log('🔄 Making API request to OpenRouter...');
    console.log('📝 Model:', modelToUse);
    console.log('🔑 API Key exists:', !!state.settings.apiKey);
    console.log('🌐 Request URL:', 'https://openrouter.ai/api/v1/chat/completions');
    
    // Create an AbortController for request timeout and interruption
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Request timeout triggered');
      controller.abort();
    }, 60000); // 60 second timeout
    
    // Check for interrupt request
    if (state.interruptRequested) {
      controller.abort();
      throw new Error('Request interrupted by user');
    }
    
    try {
      console.log('🚀 Sending fetch request...');
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.settings.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'Cadence Codex',
          'User-Agent': 'Cadence-Codex/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.8
        })
      });

      clearTimeout(timeoutId);
      
      console.log('📡 Response received:', response.status, response.statusText);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.log('❌ Error response data:', errorData);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API response successful');
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ Invalid response format:', data);
        throw new Error('Invalid response format from API');
      }
      
      return data.choices[0].message.content || 'No response generated';
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error('🔴 API call failed:', error);
      console.error('🔴 Error type:', error.constructor.name);
      console.error('🔴 Error message:', error.message);
      
      if (error.name === 'AbortError') {
        if (state.interruptRequested) {
          throw new Error('Request interrupted by user');
        }
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to OpenRouter API. Please check your internet connection.');
      }

      // Check for specific network errors
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and firewall settings.');
      }

      if (error.message.includes('ERR_NETWORK')) {
        throw new Error('Network error detected. Please check if OpenRouter.ai is accessible from your location.');
      }
      
      // Re-throw the original error if it's already a meaningful error
      throw error;
    }
  };

  // Enhanced processStage function with better output handling
  const processStage = async (stageIndex) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_INTERRUPT_REQUESTED', payload: false });
    
    try {
      const stage = STAGES[stageIndex];
      
      // Handle Musical Suggestions stage specifically
      if (stage.id === 'musicalSuggestions') {
        const needsSuggestions = !state.musicalContext.tempo && 
                               !state.musicalContext.chordProgression && 
                               !state.musicalContext.timeSignature && 
                               !state.musicalContext.rhythmFeel;
        
        if (needsSuggestions) {
          try {
            const suggestions = await analyzeLyricForMusicalFit(
              state.userInput,
              Object.values(state.stageData).join('\n\n'),
              state.musicalContext.selectedGenres,
              callOpenRouter
            );
            
            // Format the suggestions as a readable response
            const formattedResponse = `🎵 **Musical Recommendations**

**Tempo:** ${suggestions.tempo} BPM
**Chord Progression:** ${suggestions.chordProgression}
**Time Signature:** ${suggestions.timeSignature}
**Rhythmic Feel:** ${suggestions.rhythmFeel}

**Reasoning:** ${suggestions.reasoning}

These musical elements have been suggested based on your lyrical content and selected genres. You can accept these suggestions or modify them in the Musical Context panel above.`;

            dispatch({ type: 'SET_STAGE_DATA', stage: stage.id, payload: formattedResponse });
            dispatch({ type: 'SET_MUSICAL_SUGGESTIONS', payload: suggestions });
            dispatch({ type: 'AUTO_EXPAND_STAGE', payload: stage.id });
            return;
          } catch (error) {
            console.log('Musical suggestions failed:', error);
            dispatch({ 
              type: 'SET_STAGE_DATA', 
              stage: stage.id, 
              payload: `Musical suggestions could not be generated automatically. Please set your musical preferences manually in the Musical Context panel above, or skip this step.`
            });
            dispatch({ type: 'AUTO_EXPAND_STAGE', payload: stage.id });
            return;
          }
        } else {
          // Musical context already provided
          const contextSummary = `🎵 **Current Musical Settings**

**Tempo:** ${state.musicalContext.tempo || 'Not set'} ${state.musicalContext.tempo ? 'BPM' : ''}
**Chord Progression:** ${state.musicalContext.chordProgression || 'Not set'}
**Time Signature:** ${state.musicalContext.timeSignature || 'Not set'}
**Rhythmic Feel:** ${state.musicalContext.rhythmFeel || 'Not set'}

Your musical context is ready! These settings will influence the Flow stage to create lyrics that align with your musical vision.`;

          dispatch({ type: 'SET_STAGE_DATA', stage: stage.id, payload: contextSummary });
          dispatch({ type: 'AUTO_EXPAND_STAGE', payload: stage.id });
          return;
        }
      }

      const basePrompt = state.customPrompts[stage.id] || DEFAULT_PROMPTS[stage.id];
      
      // Build context from user input and ALL previous stages
      let context = `User Input: ${state.userInput}\n\n`;
      if (state.musicalContext.selectedGenres.length > 0) {
        context += `Selected Genres: ${state.musicalContext.selectedGenres.join(', ')}\n\n`;
      }
      if (state.musicalContext.tempo) {
        context += `Musical Context - Tempo: ${state.musicalContext.tempo} BPM, Chords: ${state.musicalContext.chordProgression}, Time: ${state.musicalContext.timeSignature}, Feel: ${state.musicalContext.rhythmFeel}\n\n`;
      }
      
      // Include ALL previous stage outputs (not just up to current stage)
      for (let i = 0; i < STAGES.length; i++) {
        const prevStage = STAGES[i];
        if (i < stageIndex && state.stageData[prevStage.id]) {
          context += `${prevStage.name}: ${state.stageData[prevStage.id]}\n\n`;
        }
      }
      context += `Current Stage: ${stage.name}`;

      // Build prompt with genre injections and context
      const promptContext: PromptContext = {
        selectedGenres: state.musicalContext.selectedGenres,
        selectedStructure: stage.id === 'flow' ? state.musicalContext.selectedStructure : undefined,
        userInput: state.userInput,
        previousStages: state.stageData
      };

      const enhancedPrompt = buildPromptWithGenreInjection(basePrompt, promptContext);
      
      // Use stage-specific model if selected, otherwise fall back to global setting
      const stageModel = state.stageModels[stage.id] || state.settings.selectedModel;
      const result = await callOpenRouter(enhancedPrompt, context, stageModel);
      
      dispatch({ type: 'SET_STAGE_DATA', stage: stage.id, payload: result });
      dispatch({ type: 'AUTO_EXPAND_STAGE', payload: stage.id });
      
      // Start typewriter animation for all stages, not just flow
      if (result && result.length > 50) {
        startTypewriterAnimation(result, stage.id);
      }
      
    } catch (error) {
      console.error('Stage processing failed:', error);
      dispatch({ 
        type: 'SET_STAGE_DATA', 
        stage: STAGES[stageIndex].id, 
        payload: `Error: ${error.message}`
      });
      dispatch({ type: 'AUTO_EXPAND_STAGE', payload: STAGES[stageIndex].id });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INTERRUPT_REQUESTED', payload: false });
    }
  };

  const processCritique = async () => {
    const flowStageData = state.stageData['flow'];
    if (!flowStageData) {
      alert('Please complete the Flow stage first to get critique');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const critiquePrompt = buildCritiquePrompt(flowStageData, state.musicalContext.selectedGenres);
      const stageModel = state.stageModels['critique'] || state.settings.selectedModel;
      const result = await callOpenRouter(critiquePrompt, '', stageModel);
      
      dispatch({ type: 'SET_STAGE_DATA', stage: 'critique', payload: result });
      dispatch({ type: 'AUTO_EXPAND_STAGE', payload: 'critique' });
      
    } catch (error) {
      console.error('Critique processing failed:', error);
      dispatch({ 
        type: 'SET_STAGE_DATA', 
        stage: 'critique', 
        payload: `Error: ${error.message}`
      });
      dispatch({ type: 'AUTO_EXPAND_STAGE', payload: 'critique' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Enhanced typewriter animation with interrupt handling
  const startTypewriterAnimation = useCallback((text, stageId) => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    let currentChar = 0;
    dispatch({ 
      type: 'SET_ANIMATION_STATE', 
      payload: { 
        isPlaying: true, 
        currentChar: 0, 
        targetText: text,
        targetStage: stageId 
      }
    });

    animationRef.current = setInterval(() => {
      // Check for interrupt
      if (state.interruptRequested) {
        clearInterval(animationRef.current);
        dispatch({ 
          type: 'SET_ANIMATION_STATE', 
          payload: { isPlaying: false, currentChar: text.length }
        });
        return;
      }

      if (currentChar < text.length) {
        currentChar++;
        dispatch({ 
          type: 'SET_ANIMATION_STATE', 
          payload: { currentChar }
        });
        
        if (state.settings.soundEnabled) {
          playTypewriterSound();
        }
        if (state.settings.hapticEnabled) {
          triggerHaptic();
        }
      } else {
        clearInterval(animationRef.current);
        dispatch({ 
          type: 'SET_ANIMATION_STATE', 
          payload: { isPlaying: false }
        });
      }
    }, Math.random() * 50 + 25); // Faster animation
  }, [state.settings.soundEnabled, state.settings.hapticEnabled, state.interruptRequested]);

  const pauseAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    dispatch({ 
      type: 'SET_ANIMATION_STATE', 
      payload: { isPlaying: false }
    });
  };

  const resumeAnimation = () => {
    if (state.animationState.currentChar < state.animationState.targetText.length) {
      startTypewriterAnimation(
        state.animationState.targetText.slice(state.animationState.currentChar),
        state.animationState.targetStage
      );
    }
  };

  const skipAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    dispatch({ 
      type: 'SET_ANIMATION_STATE', 
      payload: { 
        isPlaying: false, 
        currentChar: state.animationState.targetText.length 
      }
    });
  };

  const exportLyrics = () => {
    const finalLyrics = state.stageData[STAGES[STAGES.length - 1].id] || 'No lyrics generated yet';
    const blob = new Blob([finalLyrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyrics.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "Content has been copied successfully",
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const resetToDefaults = () => {
    if (confirm('This will reset all data and settings. Are you sure?')) {
      dispatch({ type: 'RESET_ALL' });
      localStorage.removeItem('cadence-codex-state');
      toast({
        title: "Reset Complete",
        description: "All data and settings have been reset",
      });
    }
  };

  const proceedToNextStage = (currentStageIndex) => {
    const nextStageIndex = currentStageIndex + 1;
    if (nextStageIndex < STAGES.length) {
      processStage(nextStageIndex);
    }
  };

  const acceptMusicalSuggestions = (suggestions: MusicalSuggestions) => {
    dispatch({ 
      type: 'UPDATE_MUSICAL_CONTEXT', 
      payload: {
        tempo: `${suggestions.tempo}`,
        chordProgression: suggestions.chordProgression,
        timeSignature: suggestions.timeSignature,
        rhythmFeel: suggestions.rhythmFeel
      }
    });
    dispatch({ type: 'SET_MUSICAL_SUGGESTIONS', payload: null });
  };

  const enhancePrompt = async () => {
    if (!state.userInput.trim()) {
      toast({
        title: "No Input",
        description: "Please enter your inspiration first",
        variant: "destructive"
      });
      return;
    }

    if (!state.settings.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your API key in settings",
        variant: "destructive"
      });
      return;
    }

    setEnhancingPrompt(true);
    
    try {
      const enhancementPrompt = `Enhance this creative prompt to make it more vivid, specific, and inspiring for lyric writing. Keep the core idea but add emotional depth, concrete imagery, and creative direction that will help generate better lyrics:

"${state.userInput}"

Return only the enhanced version, no explanations.`;

      const result = await callOpenRouter(enhancementPrompt, '', state.settings.selectedModel);
      
      dispatch({ type: 'SET_USER_INPUT', payload: result });
      
      toast({
        title: "Prompt Enhanced",
        description: "Your inspiration has been enhanced with more creative detail",
      });
      
    } catch (error) {
      console.error('Prompt enhancement failed:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEnhancingPrompt(false);
    }
  };

  const handlePromptSave = (stage: string) => {
    toast({
      title: "Prompt Saved",
      description: `Custom prompt for ${stage} has been saved`,
    });
  };

  const handlePromptReset = (stage: string) => {
    toast({
      title: "Prompt Reset",
      description: `${stage} prompt has been reset to default`,
    });
  };

  // Add new handler for clearing output
  const handleClearOutput = () => {
    dispatch({ type: 'CLEAR_ALL_OUTPUT' });
    dispatch({ type: 'TOGGLE_CLEAR_OUTPUT_DIALOG' });
    toast({
      title: "Output Cleared",
      description: "All AI-generated content has been cleared",
    });
  };

  // Add handler for loading model slates
  const handleLoadModelSlate = (models: { [stageId: string]: string }) => {
    dispatch({ type: 'LOAD_MODEL_SLATE', payload: models });
    Object.entries(models).forEach(([stageId, modelId]) => {
      dispatch({ type: 'SET_STAGE_MODEL', stage: stageId, payload: modelId });
    });
  };

  // New handlers for library and advanced editor
  const handleLoadFromLibrary = (lyrics: string, title: string) => {
    dispatch({ type: 'SET_USER_INPUT', payload: `Title: ${title}\n\n${lyrics}` });
    dispatch({ type: 'TOGGLE_LYRIC_LIBRARY' });
    toast({
      title: "Loaded from Library",
      description: `"${title}" has been loaded as your inspiration`,
    });
  };

  const handleAdvancedEditorSave = (title: string, lyrics: string) => {
    // Update the flow stage with the edited lyrics
    dispatch({ type: 'SET_STAGE_DATA', stage: 'flow', payload: lyrics });
    dispatch({ type: 'TOGGLE_ADVANCED_EDITOR' });
    toast({
      title: "Lyrics Updated",
      description: "Your edited lyrics have been saved to the Flow stage",
    });
  };

  const handleStageEdit = (stageId: string, newContent: string) => {
    dispatch({ type: 'UPDATE_STAGE_OUTPUT', stage: stageId, payload: newContent });
    toast({
      title: "Stage Updated",
      description: "Content has been edited successfully",
    });
  };

  const interruptProcess = () => {
    dispatch({ type: 'SET_INTERRUPT_REQUESTED', payload: true });
    dispatch({ type: 'SET_LOADING', payload: false });
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    dispatch({ 
      type: 'SET_ANIMATION_STATE', 
      payload: { isPlaying: false }
    });
    toast({
      title: "Process Interrupted",
      description: "AI generation has been stopped",
    });
  };

  const isDark = state.settings.theme === 'dark';

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDark ? 'dark' : ''} lyric-bg-primary lyric-text`}>
      <InstallPrompt />
      
      {/* Enhanced Compact Mobile Header */}
      <header className="lyric-surface border-b lyric-border border-opacity-30 px-2 py-1.5 shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-wide">
            <span className="lyric-accent">Cadence</span> Codex
          </h1>
          <div className="flex items-center space-x-1">
            {/* Add Library Button */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_LYRIC_LIBRARY' })}
              className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-purple-500 hover:text-purple-600"
              title="Lyric Library"
            >
              <Music size={14} />
            </button>
            
            {/* Add Advanced Editor Button */}
            {state.stageData['flow'] && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_ADVANCED_EDITOR' })}
                className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-green-500 hover:text-green-600"
                title="Advanced Editor"
              >
                <Edit3 size={14} />
              </button>
            )}

            {/* Add Interrupt Button */}
            {state.isLoading && (
              <button
                onClick={interruptProcess}
                className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-orange-500 hover:text-orange-600"
                title="Interrupt AI processing"
              >
                <StopCircle size={14} />
              </button>
            )}
            
            {/* Add Clear Output Button */}
            {Object.keys(state.stageData).length > 0 && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_CLEAR_OUTPUT_DIALOG' })}
                className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-red-500 hover:text-red-600"
                title="Clear all AI output"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => dispatch({ 
                type: 'UPDATE_SETTINGS', 
                payload: { theme: isDark ? 'light' : 'dark' }
              })}
              className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 hidden sm:inline-block"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
              className="p-1.5 rounded-lg lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 sm:hidden"
            >
              {state.showMobileMenu ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Compact Mobile Menu Overlay */}
      {state.showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:hidden" onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}>
          <div className="fixed top-0 right-0 h-full w-64 lyric-surface p-2 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Menu</h2>
              <button onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}>
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-1.5">
              {/* Add Library button to mobile menu */}
              <button
                onClick={() => {
                  dispatch({ type: 'TOGGLE_LYRIC_LIBRARY' });
                  dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                }}
                className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs text-purple-500"
              >
                <Music size={14} />
                <span>Lyric Library</span>
              </button>

              {/* Add Advanced Editor button to mobile menu */}
              {state.stageData['flow'] && (
                <button
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_ADVANCED_EDITOR' });
                    dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                  }}
                  className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs text-green-500"
                >
                  <Edit3 size={14} />
                  <span>Advanced Editor</span>
                </button>
              )}

              {/* Add Interrupt button to mobile menu */}
              {state.isLoading && (
                <button
                  onClick={() => {
                    interruptProcess();
                    dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                  }}
                  className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs text-orange-500"
                >
                  <StopCircle size={14} />
                  <span>Interrupt Process</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                }}
                className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
              
              <button
                onClick={() => {
                  dispatch({ type: 'TOGGLE_PROMPT_SET_MANAGER' });
                  dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                }}
                className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs"
              >
                <Edit3 size={14} />
                <span>Prompt Sets</span>
              </button>

              {/* Add Model Slates button to mobile menu */}
              <button
                onClick={() => {
                  dispatch({ type: 'TOGGLE_MODEL_SLATES_MANAGER' });
                  dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                }}
                className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs"
              >
                <Users size={14} />
                <span>Writing Teams</span>
              </button>

              {/* Add Clear Output button to mobile menu */}
              {Object.keys(state.stageData).length > 0 && (
                <button
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_CLEAR_OUTPUT_DIALOG' });
                    dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                  }}
                  className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs text-red-500"
                >
                  <Trash2 size={14} />
                  <span>Clear Output</span>
                </button>
              )}
              
              {Object.keys(state.stageData).length > 0 && (
                <button
                  onClick={() => {
                    exportLyrics();
                    dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                  }}
                  className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 flex items-center space-x-2 hover:lyric-highlight-bg transition-colors text-xs"
                >
                  <Download size={14} />
                  <span>Export Lyrics</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-2 py-1.5">
        {/* Enhanced Compact Settings Panel */}
        {showSettings && (
          <div className="lyric-surface border lyric-border border-opacity-30 rounded-xl p-2.5 mb-2.5 shadow-lg backdrop-blur-sm">
            <h2 className="text-base font-bold mb-2.5 lyric-accent">Settings</h2>
            <div className="space-y-2.5">
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium mb-1">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={state.settings.apiKey}
                    onChange={(e) => dispatch({ 
                      type: 'UPDATE_SETTINGS', 
                      payload: { apiKey: e.target.value }
                    })}
                    className="w-full p-2 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                    placeholder="Enter your OpenRouter API key"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Default AI Model</label>
                  <ModelDropdown
                    value={state.settings.selectedModel}
                    onChange={(modelId) => {
                      dispatch({ 
                        type: 'UPDATE_SETTINGS', 
                        payload: { selectedModel: modelId }
                      });
                      toast({
                        title: "Default Model Updated",
                        description: "New default model has been saved",
                      });
                    }}
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.settings.soundEnabled}
                    onChange={(e) => dispatch({ 
                      type: 'UPDATE_SETTINGS', 
                      payload: { soundEnabled: e.target.checked }
                    })}
                    className="w-3 h-3 lyric-accent-bg rounded"
                  />
                  <span className="text-xs font-medium">Sound Effects</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.settings.hapticEnabled}
                    onChange={(e) => dispatch({ 
                      type: 'UPDATE_SETTINGS', 
                      payload: { hapticEnabled: e.target.checked }
                    })}
                    className="w-3 h-3 lyric-accent-bg rounded"
                  />
                  <span className="text-xs font-medium">Haptic Feedback</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.settings.autoSuggestMusic}
                    onChange={(e) => dispatch({ 
                      type: 'UPDATE_SETTINGS', 
                      payload: { autoSuggestMusic: e.target.checked }
                    })}
                    className="w-3 h-3 lyric-accent-bg rounded"
                  />
                  <span className="text-xs font-medium">Auto-Suggest Musical Settings</span>
                </label>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_PROMPT_SET_MANAGER' })}
                  className="px-2.5 py-1.5 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-colors duration-300 shadow-sm hover:shadow-md transform hover:scale-105 font-medium text-xs"
                >
                  Manage Prompt Sets
                </button>
                {/* Add Writing Teams button */}
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_MODEL_SLATES_MANAGER' })}
                  className="px-2.5 py-1.5 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-colors duration-300 shadow-sm hover:shadow-md transform hover:scale-105 font-medium text-xs"
                >
                  Manage Writing Teams
                </button>
                <button
                  onClick={resetToDefaults}
                  className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300 shadow-sm hover:shadow-md transform hover:scale-105 font-medium text-xs"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compact Musical Context Panel */}
        <MusicalContextPanel
          isExpanded={state.musicalContext.isExpanded}
          onToggle={() => dispatch({ 
            type: 'UPDATE_MUSICAL_CONTEXT', 
            payload: { isExpanded: !state.musicalContext.isExpanded }
          })}
          selectedGenres={state.musicalContext.selectedGenres}
          onGenreToggle={(genreId) => {
            const newGenres = state.musicalContext.selectedGenres.includes(genreId)
              ? state.musicalContext.selectedGenres.filter(id => id !== genreId)
              : [...state.musicalContext.selectedGenres, genreId];
            dispatch({ 
              type: 'UPDATE_MUSICAL_CONTEXT', 
              payload: { selectedGenres: newGenres }
            });
          }}
          selectedStructure={state.musicalContext.selectedStructure}
          onStructureChange={(structureId) => dispatch({ 
            type: 'UPDATE_MUSICAL_CONTEXT', 
            payload: { selectedStructure: structureId }
          })}
          musicalSettings={{
            tempo: state.musicalContext.tempo,
            chordProgression: state.musicalContext.chordProgression,
            timeSignature: state.musicalContext.timeSignature,
            rhythmFeel: state.musicalContext.rhythmFeel
          }}
          onMusicalSettingsChange={(settings) => dispatch({
            type: 'UPDATE_MUSICAL_CONTEXT',
            payload: settings
          })}
        />

        {/* Compact User Input */}
        <div className="lyric-surface border lyric-border border-opacity-30 rounded-xl p-2.5 mb-2.5 shadow-lg">
          <h2 className="text-base font-bold mb-2 lyric-accent">Your Inspiration</h2>
          <textarea
            value={state.userInput}
            onChange={(e) => dispatch({ type: 'SET_USER_INPUT', payload: e.target.value })}
            className={`w-full h-20 p-2.5 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 resize-none focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300 ${!isDark ? 'typewriter-font' : ''}`}
            placeholder="Enter your inspiration: a story, struggle, joke, premise, or any spark of creativity..."
          />
          <div className="mt-2.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-1.5">
            <div className="flex flex-col sm:flex-row gap-1.5">
              <button
                onClick={enhancePrompt}
                disabled={enhancingPrompt || !state.userInput.trim()}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-xs"
              >
                {enhancingPrompt ? 'Enhancing...' : 'Enhance Prompt'}
              </button>
            </div>
            {Object.keys(state.stageData).length > 0 && (
              <button
                onClick={exportLyrics}
                className="px-2.5 py-2 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-all duration-300 flex items-center justify-center space-x-1.5 shadow-sm hover:shadow-md transform hover:scale-105 text-xs"
              >
                <Download size={12} />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Compact Stages with Edit Buttons */}
        <div className="space-y-1.5">
          {STAGES.map((stage, index) => {
            const isExpanded = state.expandedStages.has(stage.id);
            const hasData = state.stageData[stage.id];
            const isAnimating = state.animationState.targetStage === stage.id && state.animationState.isPlaying;
            const canProceedToNext = hasData && index < STAGES.length - 1;

            return (
              <div key={stage.id} className="lyric-surface border lyric-border border-opacity-30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                <div 
                  className="p-2.5 cursor-pointer flex items-center justify-between hover:lyric-highlight-bg transition-all duration-300 rounded-t-xl"
                  onClick={() => dispatch({ type: 'TOGGLE_STAGE_EXPANSION', payload: stage.id })}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm transition-all duration-300 text-xs ${
                      hasData ? 'lyric-accent-bg text-white' : 'lyric-bg-secondary border lyric-border border-opacity-50'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs">{stage.name}</h3>
                      <p className="text-xs opacity-70 leading-tight">{stage.description}</p>
                    </div>
                  </div>
                  <div className="transition-transform duration-300">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-2.5 pb-2.5 border-t lyric-border border-opacity-20">
                    {/* Model Selection */}
                    <div className="mb-2.5">
                      <label className="text-xs font-medium mb-1 block lyric-accent">AI Model for this Stage</label>
                      <ModelDropdown
                        value={state.stageModels[stage.id] || ''}
                        onChange={(modelId) => {
                          dispatch({ 
                            type: 'SET_STAGE_MODEL', 
                            stage: stage.id, 
                            payload: modelId 
                          });
                          toast({
                            title: "Model Updated",
                            description: `Model for ${stage.name} has been updated`,
                          });
                        }}
                      />
                      {!state.stageModels[stage.id] && (
                        <p className="text-xs opacity-60 mt-1">
                          Using default: {state.settings.selectedModel || 'No default model selected'}
                        </p>
                      )}
                    </div>

                    {/* Musical Suggestions stage has special handling */}
                    {stage.id === 'musicalSuggestions' && state.musicalSuggestions && (
                      <div className="mb-2.5">
                        <div className="p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 mb-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium opacity-70">Tempo:</span>
                              <div className="font-semibold">{state.musicalSuggestions.tempo} BPM</div>
                            </div>
                            <div>
                              <span className="font-medium opacity-70">Time:</span>
                              <div className="font-semibold">{state.musicalSuggestions.timeSignature}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium opacity-70">Chords:</span>
                              <div className="font-semibold">{state.musicalSuggestions.chordProgression}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium opacity-70">Feel:</span>
                              <div className="font-semibold">{state.musicalSuggestions.rhythmFeel}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => acceptMusicalSuggestions(state.musicalSuggestions)}
                            className="flex-1 px-2 py-1.5 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 font-medium text-xs"
                          >
                            Accept Settings
                          </button>
                          <button
                            onClick={() => dispatch({ 
                              type: 'UPDATE_MUSICAL_CONTEXT', 
                              payload: { isExpanded: true }
                            })}
                            className="px-2 py-1.5 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-all duration-300 text-xs"
                          >
                            Modify
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Compact Prompt Editor */}
                    <div className="mb-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-1">
                        <label className="text-xs font-medium lyric-accent">AI Prompt</label>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              dispatch({ 
                                type: 'SET_CUSTOM_PROMPT', 
                                stage: stage.id, 
                                payload: state.customPrompts[stage.id] || DEFAULT_PROMPTS[stage.id]
                              });
                              handlePromptSave(stage.name);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-300 flex items-center space-x-0.5"
                          >
                            <Save size={8} />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => {
                              dispatch({ 
                                type: 'SET_CUSTOM_PROMPT', 
                                stage: stage.id, 
                                payload: DEFAULT_PROMPTS[stage.id]
                              });
                              handlePromptReset(stage.name);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-300 flex items-center space-x-0.5"
                          >
                            <RotateCcw size={8} />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={state.customPrompts[stage.id] || DEFAULT_PROMPTS[stage.id]}
                        onChange={(e) => dispatch({ 
                          type: 'SET_CUSTOM_PROMPT', 
                          stage: stage.id, 
                          payload: e.target.value
                        })}
                        className="w-full h-12 p-2 text-xs rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300"
                      />
                    </div>

                    {/* Compact Stage Output with Edit Capability */}
                    {hasData && (
                      <div className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium lyric-accent">AI Response</label>
                          <button
                            onClick={() => copyToClipboard(state.stageData[stage.id])}
                            className="p-1 rounded-md lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm border lyric-border border-opacity-30"
                            title="Copy to clipboard"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        
                        {isAnimating ? (
                          <div className={`p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 text-xs leading-relaxed ${stage.id === 'flow' && !isDark ? 'typewriter-font' : ''} ${stage.id === 'flow' ? 'min-h-[100px]' : ''}`}>
                            <span>{state.animationState.targetText.slice(0, state.animationState.currentChar)}</span>
                            <span className="animate-pulse lyric-accent font-bold">|</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <textarea
                              value={state.stageData[stage.id]}
                              onChange={(e) => handleStageEdit(stage.id, e.target.value)}
                              className={`w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300 text-xs leading-relaxed resize-vertical ${stage.id === 'flow' && !isDark ? 'typewriter-font' : ''}`}
                              rows={stage.id === 'flow' ? 10 : 4}
                            />
                          </div>
                        )}
                        
                        {/* Compact Animation Controls */}
                        {isAnimating && (
                          <div className="flex items-center space-x-1.5 mt-1.5">
                            <button
                              onClick={state.animationState.isPlaying ? pauseAnimation : resumeAnimation}
                              className="p-1 rounded-md lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm"
                            >
                              {state.animationState.isPlaying ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                            <button 
                              onClick={skipAnimation} 
                              className="p-1 rounded-md lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm"
                            >
                              <Square size={12} />
                            </button>
                            <span className="text-xs opacity-70">
                              {Math.round((state.animationState.currentChar / state.animationState.targetText.length) * 100)}% complete
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Compact Stage Actions */}
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => processStage(index)}
                        disabled={state.isLoading}
                        className="w-full px-2.5 py-2 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-xs"
                      >
                        {state.isLoading ? 'Processing...' : hasData ? 'Regenerate' : 'Generate'}
                      </button>
                      
                      {/* Next Stage Button - replaces Previous Stage */}
                      {canProceedToNext && (
                        <button
                          onClick={() => proceedToNextStage(index)}
                          disabled={state.isLoading}
                          className="w-full px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md transform hover:scale-105 text-xs font-medium flex items-center justify-center space-x-1"
                        >
                          <span>Next Stage</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Compact Critique Stage */}
          {state.stageData['flow'] && (
            <div className="lyric-surface border lyric-border border-opacity-30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div 
                className="p-2.5 cursor-pointer flex items-center justify-between hover:lyric-highlight-bg transition-all duration-300 rounded-t-xl"
                onClick={() => dispatch({ type: 'TOGGLE_STAGE_EXPANSION', payload: 'critique' })}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm transition-all duration-300 text-xs ${
                    state.stageData['critique'] ? 'lyric-accent-bg text-white' : 'lyric-bg-secondary border lyric-border border-opacity-50'
                  }`}>
                    7
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">Review & Critique</h3>
                    <p className="text-xs opacity-70 leading-tight">Get professional feedback on your lyrics</p>
                  </div>
                </div>
                <div className="transition-transform duration-300">
                  {state.expandedStages.has('critique') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>

              {state.expandedStages.has('critique') && (
                <div className="px-2.5 pb-2.5 border-t lyric-border border-opacity-20">
                  {/* Model Selection for Critique */}
                  <div className="mb-2.5">
                    <label className="text-xs font-medium mb-1 block lyric-accent">AI Model for Critique</label>
                    <ModelDropdown
                      value={state.stageModels['critique'] || ''}
                      onChange={(modelId) => dispatch({ 
                        type: 'SET_STAGE_MODEL', 
                        stage: 'critique', 
                        payload: modelId 
                      })}
                    />
                    {!state.stageModels['critique'] && (
                      <p className="text-xs opacity-60 mt-1">
                        Using default: {state.settings.selectedModel || 'No default model selected'}
                      </p>
                    )}
                  </div>

                  {state.stageData['critique'] && (
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium lyric-accent">AI Critique</label>
                        <button
                          onClick={() => copyToClipboard(state.stageData['critique'])}
                          className="p-1 rounded-md lyric-surface hover:lyric-highlight-bg transition-all duration-300 shadow-sm border lyric-border border-opacity-30"
                          title="Copy critique to clipboard"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <textarea
                        value={state.stageData['critique']}
                        onChange={(e) => dispatch({ 
                          type: 'SET_STAGE_DATA', 
                          stage: 'critique', 
                          payload: e.target.value
                        })}
                        className="w-full p-2 rounded-lg lyric-bg-secondary border lyric-border border-opacity-30 focus:ring-2 focus:ring-opacity-50 lyric-highlight transition-all duration-300 text-xs leading-relaxed resize-vertical"
                        rows={6}
                      />
                    </div>
                  )}

                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={processCritique}
                      disabled={state.isLoading}
                      className="w-full px-3 py-2 lyric-accent-bg text-white rounded-lg hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 font-semibold text-xs"
                    >
                      {state.isLoading ? 'Analyzing...' : state.stageData['critique'] ? 'Regenerate Critique' : 'Get Professional Critique'}
                    </button>
                    
                    {state.stageData['flow'] && (
                      <>
                        <button
                          onClick={() => dispatch({ type: 'TOGGLE_PREP_FOR_SUNO' })}
                          className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-xs font-medium flex items-center justify-center space-x-1"
                        >
                          <Music size={12} />
                          <span>Prep for Suno</span>
                        </button>
                        <button
                          onClick={exportLyrics}
                          className="w-full px-3 py-2 lyric-surface border lyric-border border-opacity-30 rounded-lg hover:lyric-highlight-bg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-xs font-medium flex items-center justify-center space-x-1"
                        >
                          <Download size={12} />
                          <span>Export Lyrics as .txt</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Musical Suggestions Modal */}
      {state.showMusicalSuggestions && state.musicalSuggestions && (
        <MusicalSuggestionsModal
          suggestions={state.musicalSuggestions}
          onAccept={acceptMusicalSuggestions}
          onDecline={() => {
            dispatch({ type: 'SET_MUSICAL_SUGGESTIONS', payload: null });
            const flowStageIndex = STAGES.findIndex(s => s.id === 'flow');
            if (flowStageIndex !== -1) processStage(flowStageIndex);
          }}
          onModify={() => {
            dispatch({ type: 'SET_MUSICAL_SUGGESTIONS', payload: null });
            dispatch({ 
              type: 'UPDATE_MUSICAL_CONTEXT', 
              payload: { isExpanded: true }
            });
          }}
        />
      )}

      {/* Enhanced Prompt Set Manager Modal */}
      {state.showPromptSetManager && (
        <EnhancedPromptSetManager
          onClose={() => dispatch({ type: 'TOGGLE_PROMPT_SET_MANAGER' })}
          currentPrompts={state.customPrompts}
          onLoadPromptSet={(prompts) => {
            Object.entries(prompts).forEach(([stage, prompt]) => {
              dispatch({ type: 'SET_CUSTOM_PROMPT', stage, payload: prompt });
            });
          }}
        />
      )}

      {/* Add Clear Output Dialog */}
      <ClearOutputDialog
        isOpen={state.showClearOutputDialog}
        onConfirm={handleClearOutput}
        onCancel={() => dispatch({ type: 'TOGGLE_CLEAR_OUTPUT_DIALOG' })}
      />

      {/* Add Model Slates Manager Modal */}
      {state.showModelSlatesManager && (
        <ModelSlatesManager
          currentStageModels={state.stageModels}
          defaultModel={state.settings.selectedModel}
          onLoadSlate={handleLoadModelSlate}
          onClose={() => dispatch({ type: 'TOGGLE_MODEL_SLATES_MANAGER' })}
        />
      )}

      {/* Prep for Suno Modal */}
      {state.showPrepForSuno && state.stageData['flow'] && (
        <PrepForSuno
          lyrics={state.stageData['flow']}
          musicalContext={state.musicalContext}
          userInput={state.userInput}
          onClose={() => dispatch({ type: 'TOGGLE_PREP_FOR_SUNO' })}
        />
      )}

      {/* Lyric Library Modal */}
      <LyricLibrary
        isOpen={state.showLyricLibrary}
        onClose={() => dispatch({ type: 'TOGGLE_LYRIC_LIBRARY' })}
        onLoadLyrics={handleLoadFromLibrary}
        currentLyrics={state.stageData['flow']}
        currentTitle={state.userInput.split('\n')[0]?.replace('Title:', '').trim()}
      />

      {/* Advanced Lyric Editor Modal */}
      <AdvancedLyricEditor
        isOpen={state.showAdvancedEditor}
        onClose={() => dispatch({ type: 'TOGGLE_ADVANCED_EDITOR' })}
        initialLyrics={state.stageData['flow']}
        initialTitle={state.userInput.split('\n')[0]?.replace('Title:', '').trim()}
        onSave={handleAdvancedEditorSave}
        apiKey={state.settings.apiKey}
        selectedModel={state.settings.selectedModel}
      />
    </div>
  );
}
