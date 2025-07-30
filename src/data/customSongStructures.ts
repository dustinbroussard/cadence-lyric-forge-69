
export interface CustomSongStructure {
  id: string;
  name: string;
  sections: string[];
  description?: string;
  isCustom: boolean;
  createdAt?: string;
}

export const getCustomSongStructures = (): CustomSongStructure[] => {
  const saved = localStorage.getItem('custom-song-structures');
  return saved ? JSON.parse(saved) : [];
};

export const saveCustomSongStructure = (structure: Omit<CustomSongStructure, 'id' | 'createdAt'>) => {
  const existing = getCustomSongStructures();
  const newStructure: CustomSongStructure = {
    ...structure,
    id: `custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
    isCustom: true
  };
  
  const updated = [...existing, newStructure];
  localStorage.setItem('custom-song-structures', JSON.stringify(updated));
  return newStructure;
};

export const deleteCustomSongStructure = (id: string) => {
  const existing = getCustomSongStructures();
  const updated = existing.filter(s => s.id !== id);
  localStorage.setItem('custom-song-structures', JSON.stringify(updated));
};
