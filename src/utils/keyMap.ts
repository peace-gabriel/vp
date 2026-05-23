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

const BASE_CODE_MAP: Record<string, string> = {
  Digit1: 'C2',
  Digit2: 'D2',
  Digit3: 'E2',
  Digit4: 'F2',
  Digit5: 'G2',
  Digit6: 'A2',
  Digit7: 'B2',
  Digit8: 'C3',
  Digit9: 'D3',
  Digit0: 'E3',
  KeyQ: 'F3',
  KeyW: 'G3',
  KeyE: 'A3',
  KeyR: 'B3',
  KeyT: 'C4',
  KeyY: 'D4',
  KeyU: 'E4',
  KeyI: 'F4',
  KeyO: 'G4',
  KeyP: 'A4',
  KeyA: 'B4',
  KeyS: 'C5',
  KeyD: 'D5',
  KeyF: 'E5',
  KeyG: 'F5',
  KeyH: 'G5',
  KeyJ: 'A5',
  KeyK: 'B5',
  KeyL: 'C6',
  KeyZ: 'D6',
  KeyX: 'E6',
  KeyC: 'F6',
  KeyV: 'G6',
  KeyB: 'A6',
  KeyN: 'B6',
  KeyM: 'C7'
};

const SHIFT_CODE_MAP: Record<string, string> = {
  Digit1: 'C#2',
  Digit2: 'D#2',
  Digit4: 'F#2',
  Digit5: 'G#2',
  Digit6: 'A#2',
  Digit8: 'C#3',
  Digit9: 'D#3',
  KeyQ: 'F#3',
  KeyW: 'G#3',
  KeyE: 'A#3',
  KeyT: 'C#4',
  KeyY: 'D#4',
  KeyI: 'F#4',
  KeyO: 'G#4',
  KeyP: 'A#4',
  KeyS: 'C#5',
  KeyD: 'D#5',
  KeyG: 'F#5',
  KeyH: 'G#5',
  KeyJ: 'A#5',
  KeyL: 'C#6',
  KeyZ: 'D#6',
  KeyC: 'F#6',
  KeyV: 'G#6',
  KeyB: 'A#6'
};

export const getNoteFromKey = (e: KeyboardEvent): string | undefined => {
  const shiftedNote = e.shiftKey ? SHIFT_CODE_MAP[e.code] : undefined;
  if (shiftedNote) return shiftedNote;

  const baseNote = BASE_CODE_MAP[e.code];
  if (baseNote) return baseNote;

  const normalizedKey = e.key.length === 1 && !e.shiftKey ? e.key.toLowerCase() : e.key;
  const note = VIRTUAL_PIANO_MAP[normalizedKey];
  if (note) return note;

  const lowercaseNote = VIRTUAL_PIANO_MAP[e.key.toLowerCase()];
  if (lowercaseNote) return lowercaseNote;

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
