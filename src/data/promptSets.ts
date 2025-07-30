
export interface PromptSet {
  id: string;
  name: string;
  description?: string;
  prompts: {
    perspective: string;
    message: string;
    tone: string;
    metaphor: string;
    themes: string;
    flow: string;
  };
  createdAt: string;
  isCustom: boolean;
}

export const DEFAULT_PROMPT_SETS: PromptSet[] = [
  {
    id: 'funky-protest',
    name: 'Funky Protest',
    description: 'Groovy rhythms with rebellious themes and social commentary',
    prompts: {
      perspective: "Establish a defiant, community-focused perspective that speaks truth to power with groove and swagger.",
      message: "Identify themes of resistance, social justice, and collective action with a funky, upbeat energy.",
      tone: "Choose a tone that's both rebellious and celebratory - angry but danceable, serious but groovy.",
      metaphor: "Create metaphors around movement, rhythm, and breaking chains - physical and metaphorical dancing as liberation.",
      themes: "Build imagery around community, rhythm, resistance, and the power of collective voice and movement.",
      flow: "Structure with strong rhythmic patterns, call-and-response sections, and repetitive hooks that build energy."
    },
    createdAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'minimalist-indie',
    name: 'Minimalist Indie',
    description: 'Sparse, intimate lyrics with subtle emotional depth',
    prompts: {
      perspective: "Establish a quiet, introspective voice that finds meaning in small moments and everyday details.",
      message: "Focus on subtle emotional truths, understated revelations, and the beauty in mundane experiences.",
      tone: "Choose a contemplative, gentle tone - melancholic but not depressing, thoughtful and subdued.",
      metaphor: "Create simple, elegant metaphors drawn from nature, weather, or domestic life - nothing grandiose.",
      themes: "Build around quiet imagery, empty spaces, soft colors, and the poetry of ordinary moments.",
      flow: "Structure with gentle rhythms, ample white space, and a conversational flow that feels effortless."
    },
    createdAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'wounded-romantic',
    name: 'Wounded Romantic',
    description: 'Bluesy narrative with vivid metaphor and slow swing pacing',
    prompts: {
      perspective: "Establish a first-person narrative voice that's been hurt by love but still believes in its power.",
      message: "Explore themes of heartbreak, resilience, and the complex beauty of vulnerable love.",
      tone: "Choose a tone that's melancholic yet hopeful - wounded but not broken, sad but still singing.",
      metaphor: "Create rich, blues-influenced metaphors around storms, rivers, broken instruments, and healing.",
      themes: "Build imagery around scars that tell stories, music that heals, and love that transforms pain.",
      flow: "Structure with a slow, swinging rhythm that allows for emotional pauses and melodic phrasing."
    },
    createdAt: new Date().toISOString(),
    isCustom: false
  }
];

export const getPromptSets = (): PromptSet[] => {
  try {
    const saved = localStorage.getItem('custom-prompt-sets');
    const custom = saved ? JSON.parse(saved) : [];
    return [...DEFAULT_PROMPT_SETS, ...custom];
  } catch (error) {
    console.error('Failed to load custom prompt sets:', error);
    return DEFAULT_PROMPT_SETS;
  }
};

export const savePromptSet = (promptSet: Omit<PromptSet, 'id' | 'createdAt'>) => {
  try {
    const existing = localStorage.getItem('custom-prompt-sets');
    const customSets = existing ? JSON.parse(existing) : [];
    
    const newSet: PromptSet = {
      ...promptSet,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isCustom: true
    };
    
    const updated = [...customSets, newSet];
    localStorage.setItem('custom-prompt-sets', JSON.stringify(updated));
    return newSet;
  } catch (error) {
    console.error('Failed to save prompt set:', error);
    throw new Error('Failed to save prompt set');
  }
};

export const deletePromptSet = (id: string) => {
  try {
    const existing = localStorage.getItem('custom-prompt-sets');
    const customSets = existing ? JSON.parse(existing) : [];
    const updated = customSets.filter((s: PromptSet) => s.id !== id);
    localStorage.setItem('custom-prompt-sets', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete prompt set:', error);
    throw new Error('Failed to delete prompt set');
  }
};
