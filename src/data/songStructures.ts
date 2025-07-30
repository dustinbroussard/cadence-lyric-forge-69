
export interface SongStructure {
  id: string;
  name: string;
  sections: string[];
  description?: string;
  isCustom?: boolean;
}

export const SONG_STRUCTURES: SongStructure[] = [
  {
    id: 'classic-pop',
    name: 'Classic Pop',
    sections: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Chorus']
  },
  {
    id: 'folk-ballad',
    name: 'Folk Ballad',
    sections: ['Verse 1', 'Verse 2', 'Verse 3', 'Verse 4']
  },
  {
    id: 'blues',
    name: 'Blues',
    sections: ['Verse 1 (AAB)', 'Verse 2 (AAB)', 'Verse 3 (AAB)']
  },
  {
    id: 'aaa-structure',
    name: 'AAA Structure',
    sections: ['Verse 1', 'Verse 2', 'Verse 3']
  },
  {
    id: 'pop-rock',
    name: 'ABABCB (Pop Rock)',
    sections: ['Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus']
  },
  {
    id: 'hip-hop',
    name: 'Modern Hip-Hop',
    sections: ['Intro', 'Verse 1', 'Hook', 'Verse 2', 'Hook', 'Bridge / Breakdown', 'Hook', 'Outro']
  },
  {
    id: 'edm',
    name: 'Electronic (EDM)',
    sections: ['Intro', 'Build', 'Drop (Hook)', 'Verse', 'Build', 'Drop (Hook)', 'Outro']
  },
  {
    id: 'through-composed',
    name: 'Through-Composed',
    sections: ['Section A', 'Section B', 'Section C', 'Section D']
  },
  {
    id: 'verse-chorus-bridge',
    name: 'Verse–Chorus–Verse–Bridge',
    sections: ['Verse 1', 'Chorus', 'Verse 2', 'Bridge', 'Chorus', 'Outro']
  }
];
