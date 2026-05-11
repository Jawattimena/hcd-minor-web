// ═══════════════════════════════════════════════════════════════════════════
// SNELTOETSEN VOOR NAVIGATIE
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener("keydown", (e) => {

  // CMD + I: Spring naar de navigatie-gids
  if ((e.metaKey || e.ctrlKey) && e.key === "i") {
    e.preventDefault();
    const navigationGuide = document.querySelector("header div[tabindex='0']");
    if (navigationGuide) {
      navigationGuide.focus();
      announce("Navigation guide opened.");
    }
  }

  // CMD + U: Wissel tussen tekst en notities
  if ((e.metaKey || e.ctrlKey) && e.key === "u") {
    e.preventDefault();
    if (isInNotities()) {
      focusLeestekst();
    } else {
      focusNotities();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLG DE LAATST GEFOCUSTE ZIN
// ═══════════════════════════════════════════════════════════════════════════

let lastFocusedSentence = null;

// ═══════════════════════════════════════════════════════════════════════════
// ZINNEN LOGICA — geen checkboxes, alleen focusbare <p> elementen
// Space selecteert/deselecteert en opent een notitieveld
// ═══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".sentence").forEach((sentence) => {

  // Onthoud welke zin gefocust is
  sentence.addEventListener("focus", () => {
    lastFocusedSentence = sentence;
  });

  // Spatiebalk: selecteer/deselecteer de zin
  sentence.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();

      const isSelected = sentence.ariaset.selected === "true";

      if (isSelected) {
        sentence.dataset.selected = "false";
        sentence.setAttribute("aria-selected", "false");
        removeNote(sentence.id);
        announce("Deselected.");
      } else {
        sentence.dataset.selected = "true";
        sentence.setAttribute("aria-selected", "true");
        const verseText = sentence.getAttribute("aria-label") || sentence.textContent.trim();
        addNote(sentence.id, verseText);
        announce("Selected. Note field opened.");
      }
      
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HULPFUNCTIES
// ═══════════════════════════════════════════════════════════════════════════

function parseVerseId(id) {
  const match = id.match(/^(.+)-(\d+):(\d+)$/);
  if (!match) return { book: "", chapter: "", verse: "" };
  return { book: match[1], chapter: match[2], verse: match[3] };
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTITIES LOGICA
// ═══════════════════════════════════════════════════════════════════════════

function addNote(id, verseText) {
  const notities = document.querySelector(".notities");

  if (document.getElementById("note-" + id)) return;

  const { book, chapter, verse } = parseVerseId(id);

  const block = document.createElement("div");
  block.className = "note-block";
  block.id = "note-" + id;

  const verseRef = document.createElement("p");
  verseRef.className = "note-verse-ref";
  verseRef.textContent = `${book} ${chapter}:${verse}`;
  verseRef.setAttribute("aria-hidden", "true");

  const verseLabel = document.createElement("p");
  verseLabel.className = "note-verse-label";

  // Haal de eigenlijke zintekst op — verwijder het "Verse X." prefix uit aria-label
  const cleanText = verseText.replace(/^Verse \d+\.\s*/i, "").trim();
  verseLabel.textContent = cleanText;

  const textarea = document.createElement("textarea");
  textarea.placeholder = "";
  textarea.setAttribute(
    "aria-label",
    `Write your note for ${book} ${chapter}:${verse} — ${cleanText}`
  );

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.className = "note-save-btn";

  saveButton.addEventListener("click", () => {
    saveNote(id, textarea.value);
    saveButton.classList.add("hidden");
  });

  block.appendChild(verseRef);
  block.appendChild(verseLabel);
  block.appendChild(textarea);
  block.appendChild(saveButton);

  notities.appendChild(block);

  textarea.focus();
}

function removeNote(id) {
  const block = document.getElementById("note-" + id);
  if (block) block.remove();
  localStorage.removeItem(id);
}

function saveNote(id, content) {
  localStorage.setItem(id, content);
  announce("Note saved.");

  // Zet focus terug op de zin in de tekst
  const sentence = document.getElementById(id);
  if (sentence) {
    sentence.focus();
    sentence.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARIA-LIVE REGION
// ═══════════════════════════════════════════════════════════════════════════

const liveRegion = document.createElement("div");
liveRegion.setAttribute("aria-live", "polite");
liveRegion.setAttribute("aria-atomic", "true");
liveRegion.style.cssText =
  "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
document.body.appendChild(liveRegion);

function announce(msg) {
  liveRegion.textContent = "";
  requestAnimationFrame(() => (liveRegion.textContent = msg));
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS HULPFUNCTIES
// ═══════════════════════════════════════════════════════════════════════════

function focusLeestekst() {
  const target =
    lastFocusedSentence ||
    document.querySelector(".sentence, .book-chapter");

  if (target) {
    target.focus();
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    announce("Text focused.");
  }
}

function focusNotities() {
  const textareas = document.querySelectorAll(".notities textarea");
  if (textareas.length === 0) {
    announce("No notes yet. Select a verse first by pressing Space.");
    return;
  }
  const empty = [...textareas].find((t) => t.value === "");
  (empty || textareas[textareas.length - 1]).focus();
  announce("Notes focused.");
}

function isInNotities() {
  return document.querySelector(".notities")?.contains(document.activeElement);
} 