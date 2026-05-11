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

      const isSelected = sentence.dataset.selected === "true";

      if (isSelected) {
        // Deselecteren
        sentence.dataset.selected = "false";
        removeNote(sentence.id);
        announce("Deselected.");
      } else {
        // Selecteren
        sentence.dataset.selected = "true";
        // Haal tekst op zonder het versnummer (de aria-hidden span)
        const numberSpan = sentence.querySelector(".sentence-number");
        if (numberSpan) numberSpan.setAttribute("aria-hidden", "true");
        const verseText = sentence.textContent.replace(/^\s*\d+\s*/, "").trim();
        addNote(sentence.id, verseText);
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
// NOTITIES LOGICA — actief notitieveld per vers
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

  // Haal de eigenlijke zintekst op — verwijder het "Vers X." prefix uit aria-label
  const cleanText = verseText.replace(/^Vers \d+\.\s*/i, "").trim();
  verseLabel.textContent = cleanText;

  const textarea = document.createElement("textarea");
  textarea.placeholder = "";
  textarea.setAttribute(
    "aria-label",
    `write your note about ${book} ${chapter}:${verse}. ${cleanText}`
  );


  
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save note";
  saveButton.className = "note-save-btn";

  saveButton.addEventListener("click", () => {
    // Sla de notitie op en verplaats naar de opgeslagen lijst
    saveNote(id, textarea.value, cleanText);
    // Verwijder het actieve notitieblok
    block.remove();
    // Zet de zin terug naar deselecteerd
  });

  block.appendChild(verseRef);
  block.appendChild(verseLabel);
  block.appendChild(textarea);
  block.appendChild(saveButton);

  // Voeg het actieve blok in vóór het opgeslagen-blok (als dat al bestaat)
  const savedSection = document.getElementById("opgeslagen-notities-sectie");
  if (savedSection) {
    notities.insertBefore(block, savedSection);
  } else {
    notities.appendChild(block);
  }

  textarea.focus();

  // Laat screen reader voorlezen wat er getypt wordt
  let typingTimeout;

  textarea.addEventListener("input", () => {
    clearTimeout(typingTimeout);

    // Kleine vertraging zodat het niet bij elke letter spam wordt
    typingTimeout = setTimeout(() => {
      const value = textarea.value.trim();

      if (value.length === 0) {
        announce("Empty note.");
      } else {
        announce(value);
      }
    }, 300);
});
}

function removeNote(id) {
  // Verwijder het actieve notitieblok
  const block = document.getElementById("note-" + id);
  if (block) block.remove();
  // Verwijder ook uit localStorage
  localStorage.removeItem(id);
  // Verwijder uit de opgeslagen lijst als die er staat
  removeSavedNote(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// OPGESLAGEN NOTITIES — aparte sectie met <ul> lijst voor screen reader
// ═══════════════════════════════════════════════════════════════════════════

function saveNote(id, content, verseText) {
  // Sla op in localStorage
  localStorage.setItem(id, content);
  announce("Note saved.");

  // Verplaats focus terug naar de zin in de tekst
  const sentence = document.getElementById(id);
  if (sentence) {
    sentence.focus();
    sentence.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  // Voeg toe aan de opgeslagen notities sectie
  addToSavedNotes(id, content, verseText);
}

function getSavedSection() {
  // Geef de bestaande sectie terug, of maak een nieuwe aan
  let section = document.getElementById("opgeslagen-notities-sectie");

  if (!section) {
    const notities = document.querySelector(".notities");

    section = document.createElement("section");
    section.id = "opgeslagen-notities-sectie";
    section.setAttribute("aria-label", "Opgeslagen notities");

    const heading = document.createElement("h2");
    heading.textContent = "Opgeslagen notities";
    heading.id = "opgeslagen-notities-heading";

    const list = document.createElement("ul");
    list.className = "saved-notes-list";
    list.id = "saved-notes-list";
    list.setAttribute("aria-labelledby", "opgeslagen-notities-heading");

    section.appendChild(heading);
    section.appendChild(list);
    // Voeg de sectie bovenaan in .notities in, direct na de h2 "Notities"
    const notitiesHeading = notities.querySelector("h2");
    if (notitiesHeading && notitiesHeading.nextSibling) {
      notities.insertBefore(section, notitiesHeading.nextSibling);
    } else {
      notities.appendChild(section);
    }
  }

  return section;
}

function addToSavedNotes(id, content, verseText) {
  const { book, chapter, verse } = parseVerseId(id);

  // Haal de sectie op (of maak aan)
  const section = getSavedSection();
  const list = section.querySelector(".saved-notes-list");

  // Verwijder een eventueel al bestaand item met hetzelfde id (bij opnieuw opslaan)
  const existing = list.querySelector(`[data-note-id="${id}"]`);
  if (existing) existing.remove();

  // Maak een nieuw lijstitem — focusbaar zodat screen reader eerst de notitie voorleest
  const li = document.createElement("li");
  li.className = "saved-note-item";
  li.setAttribute("data-note-id", id);

  // Verwijzing naar het vers — zichtbaar als label, aria-label met volledige context
  const refEl = document.createElement("p");
  refEl.className = "note-verse-ref";
  refEl.textContent = `${book} ${chapter}:${verse}`;
  refEl.setAttribute("aria-hidden", "true");

  // De verstekst
  const verseEl = document.createElement("p");
  verseEl.className = "note-verse-label";
  verseEl.textContent = verseText;
  verseEl.setAttribute("aria-hidden", "true");

  // De notitietekst zelf
  const contentEl = document.createElement("p");
  contentEl.className = "saved-note-content";
  contentEl.textContent = content || "(geen tekst ingevoerd)";
  contentEl.setAttribute("tabindex", "0");

  // Verwijderknop — volledig toegankelijk voor screen reader
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete note";
  deleteButton.className = "note-delete-btn";
  deleteButton.setAttribute(
    "aria-label",
    `Delete note for ${book} ${chapter}:${verse}`
  );

  deleteButton.addEventListener("click", () => {
    deleteSavedNote(id, li, section);
  });

  li.appendChild(refEl);
  li.appendChild(verseEl);
  li.appendChild(contentEl);
  li.appendChild(deleteButton);

  // Geef het li element een aria-label zodat de screen reader de volledige context voorleest
  li.setAttribute(
    "aria-label",
    `note for ${book} ${chapter}:${verse}. versetext: ${verseText}. your note: ${content || "no text writen down"}.`
  );

  list.appendChild(li);
}

function deleteSavedNote(id, listItem, section) {
  const { book, chapter, verse } = parseVerseId(id);

  // Verwijder het lijstitem
  listItem.remove();

  // Verwijder uit localStorage
  localStorage.removeItem(id);

  // Zet de zin terug naar deselecteerd
  const sentence = document.getElementById(id);
  if (sentence) {
    sentence.dataset.selected = "false";
  }

  // Verwijder de sectie als er geen notities meer zijn
  const list = section.querySelector(".saved-notes-list");
  if (list && list.children.length === 0) {
    section.remove();
  }

  announce(`Note for ${book} ${chapter}:${verse} deleted.`);

  // Zet focus terug naar de tekst
  focusLeestekst();
}

function removeSavedNote(id) {
  // Verwijder een opgeslagen notitie op basis van id (bij deselecteren)
  const section = document.getElementById("opgeslagen-notities-sectie");
  if (!section) return;

  const list = section.querySelector(".saved-notes-list");
  if (!list) return;

  const item = list.querySelector(`[data-note-id="${id}"]`);
  if (item) item.remove();

  // Verwijder de sectie als er geen notities meer zijn
  if (list.children.length === 0) {
    section.remove();
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
  // 1. Focus eerst de inhoud van een opgeslagen notitie
  const firstSavedItem = document.querySelector(".saved-note-item");

  if (firstSavedItem) {
    const content = firstSavedItem.querySelector(".saved-note-content");

    if (content) {
      content.setAttribute("tabindex", "-1"); // tijdelijk focusbaar maken
      content.focus();
      announce("Saved notes focused.");
      return;
    }
  }

  // 2. Als er actieve textarea's zijn: focus daar
  const textareas = document.querySelectorAll(".notities textarea");
  if (textareas.length > 0) {
    const empty = [...textareas].find((t) => t.value === "");
    (empty || textareas[textareas.length - 1]).focus();
    announce("Notes focused.");
    return;
  }

  announce("No notes yet. Select a verse using Space first.");
}

function isInNotities() {
  return document.querySelector(".notities")?.contains(document.activeElement);
}

// ═══════════════════════════════════════════════════════════════════════════
// HERSTEL OPGESLAGEN NOTITIES UIT LOCALSTORAGE BIJ PAGINA LADEN
// ═══════════════════════════════════════════════════════════════════════════

function herstelOpgeslagenNotities() {
  // Loop door alle zinnen en kijk of er een opgeslagen notitie is
  document.querySelectorAll(".sentence").forEach((sentence) => {
    const id = sentence.id;
    const savedContent = localStorage.getItem(id);

    if (savedContent !== null) {
      // Markeer de zin als geselecteerd
      sentence.dataset.selected = "true";

      // Haal de verstekst op
      const verseText = sentence.textContent.replace(/^\s*\d+\s*/, "").trim();
      const cleanText = verseText.replace(/^Vers \d+\.\s*/i, "").trim();

      // Voeg toe aan de opgeslagen notities sectie
      addToSavedNotes(id, savedContent, cleanText);
    }
  });
}

// Herstel notities zodra de pagina geladen is
document.addEventListener("DOMContentLoaded", herstelOpgeslagenNotities);