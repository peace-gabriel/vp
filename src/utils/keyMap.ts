export const VIRTUAL_PIANO_MAP: Record<string, string> = {
  '1': 'C2', '!': 'C#2',
  '2': 'D2', '@': 'D#2',
  '3': 'E2',
  '4': 'F2', '$': 'F#2',
  '5': 'G2', '%': 'G#2',
  '6': 'A2', '^': 'A#2',
  '7': 'B2',
  '8': 'C3', '*': 'C#3',
  '9': 'D3', '(': 'D#3',
  '0': 'E3',
  'q': 'F3', 'Q': 'F#3',
  'w': 'G3', 'W': 'G#3',
  'e': 'A3', 'E': 'A#3',
  'r': 'B3',
  't': 'C4', 'T': 'C#4',
  'y': 'D4', 'Y': 'D#4',
  'u': 'E4',
  'i': 'F4', 'I': 'F#4',
  'o': 'G4', 'O': 'G#4',
  'p': 'A4', 'P': 'A#4',
  'a': 'B4',
  's': 'C5', 'S': 'C#5',
  'd': 'D5', 'D': 'D#5',
  'f': 'E5',
  'g': 'F5', 'G': 'F#5',
  'h': 'G5', 'H': 'G#5',
  'j': 'A5', 'J': 'A#5',
  'k': 'B5',
  'l': 'C6', 'L': 'C#6',
  'z': 'D6', 'Z': 'D#6',
  'x': 'E6',
  'c': 'F6', 'C': 'F#6',
  'v': 'G6', 'V': 'G#6',
  'b': 'A6', 'B': 'A#6',
  'n': 'B6',
  'm': 'C7'
};

export const getNoteFromKey = (e: KeyboardEvent): string | undefined => {
  // First try the exact character (handles standard shift)
  let note = VIRTUAL_PIANO_MAP[e.key];
  if (note) return note;

  // Fallback 1: try the lowercase version (caps lock on but no shift)
  note = VIRTUAL_PIANO_MAP[e.key.toLowerCase()];
  if (note) return note;

  // Fallback 2: using e.code for physical location if shift is held but OS mapping is weird
  // e.code format is usually "KeyA", "Digit1"
  if (e.shiftKey) {
    let baseChar = e.code.replace('Key', '').replace('Digit', '');

    // Map digit physical keys to their shift characters for our map
    const codeShiftMap: Record<string, string> = {
      '1': '!', '2': '@', '4': '$', '5': '%', '6': '^', '8': '*', '9': '('
    };

    // Try uppercase letter
    if (baseChar.length === 1 && /[A-Z]/.test(baseChar)) {
      return VIRTUAL_PIANO_MAP[baseChar.toUpperCase()];
    }

    // Try shift digit
    if (codeShiftMap[baseChar]) {
      return VIRTUAL_PIANO_MAP[codeShiftMap[baseChar]];
    }
  }

  return undefined;
};

export const getAllNotes = () => {
  // Return sorted keys from C2 to C7 based on proper MIDI note order
  const notes = [
    "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
    "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
    "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
    "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
    "C6", "C#6", "D6", "D#6", "E6", "F6", "F#6", "G6", "G#6", "A6", "A#6", "B6",
    "C7"
  ];
  return notes;
}
