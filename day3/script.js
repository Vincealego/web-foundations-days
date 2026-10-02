// ---------- Starting data ----------
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// ---------- Functions ----------

// Returns an array of notes whose text contains word (case-insensitive).
function searchNotes(word) {
  const term = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(term));
}

// Returns the note with the most characters, or null if there are no notes.
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// Returns an object counting notes per category, e.g. { personal: 2, work: 1 }.
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category] += 1;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

// Returns a sentence such as "5 notes: 2 personal, 1 work, 2 study."
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const personal = counts.personal || 0;
  const work = counts.work || 0;
  const study = counts.study || 0;
  const word = total === 1 ? "note" : "notes";
  return `${total} ${word}: ${personal} personal, ${work} work, ${study} study.`;
}

// Lower-cases, trims and collapses extra spaces so comparisons are fair.
function normalise(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Returns true if a note with the same text already exists.
function isDuplicate(text) {
  const target = normalise(text);
  return notes.some((note) => normalise(note.text) === target);
}

// Adds a note if valid. Returns true when added, false otherwise (and logs why).
function addNote(text, category) {
  const validCategories = ["personal", "work", "study"];
  const cleaned = typeof text === "string" ? text.trim() : "";

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Not added: text must be 1-200 characters.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("Not added: duplicate note.");
    return false;
  }
  if (!validCategories.includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category: category });
  return true;
}

// ---------- Tests (expected output in the comment beside each call) ----------

// searchNotes
console.log("searchNotes('call'):", searchNotes("call"));
// Expected: [ { id: 5, text: "Call mum", category: "personal" } ]
console.log("searchNotes('xyz'):", searchNotes("xyz"));
// Expected: [] (edge case: no results)

// longestNote
console.log("longestNote():", longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
const savedNotes = notes;
notes = [];
console.log("longestNote() with no notes:", longestNote());
// Expected: null (edge case: empty array)
notes = savedNotes;

// countByCategory
console.log("countByCategory():", countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }
notes = [];
console.log("countByCategory() with no notes:", countByCategory());
// Expected: {} (edge case: empty array)
notes = savedNotes;

// getSummary
console.log("getSummary():", getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "Only one", category: "work" }];
console.log("getSummary() with one note:", getSummary());
// Expected: "1 note: 0 personal, 1 work, 0 study." (edge case: singular "note")
notes = savedNotes;

// isDuplicate
console.log("isDuplicate('  call MUM '):", isDuplicate("  call MUM "));
// Expected: true (ignores case and extra spaces)
console.log("isDuplicate('Call dad'):", isDuplicate("Call dad"));
// Expected: false

// addNote
console.log("addNote('Pay rent', 'personal'):", addNote("Pay rent", "personal"));
// Expected: true (valid note added)
console.log("addNote('call mum', 'personal'):", addNote("call mum", "personal"));
// Expected: logs "Not added: duplicate note." then false
console.log("addNote('', 'work'):", addNote("", "work"));
// Expected: logs "Not added: text must be 1-200 characters." then false
console.log("addNote('Go gym', 'fitness'):", addNote("Go gym", "fitness"));
// Expected: logs "Not added: category must be personal, work or study." then false
console.log("addNote('x'.repeat(201), 'work'):", addNote("x".repeat(201), "work"));
// Expected: logs "Not added: text must be 1-200 characters." then false
console.log("getSummary() after adding:", getSummary());
// Expected: "6 notes: 3 personal, 1 work, 2 study."
