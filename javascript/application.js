const LEVELS_PER_ROW = 3;
const TURN_LENGTH = 0;
const WORDS_PER_LEVEL = 1;
const MASK_WITH = '\u00A0';

const CASE_ANCHORS = {
  mianownik: "to jest",
  dopelniacz: "nie ma",
  celownik: "daję",
  biernik: "widzę",
  narzednik: "jestem z",
  miejscownik: "mówię o",
  wolacz: "hej!"
};

const GROUPS = [
  { name: "M basic", key: "m_basic" },
  { name: "M anim", key: "m_animate" },
  { name: "M hard", key: "m_hard" },

  { name: "F -a", key: "f_basic" },
  { name: "F cons", key: "f_cons" },
  { name: "F hard", key: "f_hard" },

  { name: "N -o", key: "n_basic" },
  { name: "N hard", key: "n_hard" },

  { name: "Plural", key: "plural_only" },
  { name: "Mass", key: "singular_only" }
];

const GROUP_LABELS = Object.fromEntries(
  GROUPS.map(g => [g.key, g.name])
);

const GROUP_ORDER = GROUPS.map(g => g.key);
function groupNouns(nouns) {
  const groups = {};

  nouns.forEach(n => {
    const g = getNounGroup(n);

    if (!groups[g]) {
      groups[g] = [];
    }

    groups[g].push(n);
  });

  return groups;
}
function getNounGroup(n) {
  const word = n.polish_word;

  // ===== PLURAL ONLY =====
  if ([
    "drzwi","okulary","spodnie","nożyczki","skrzypce",
    "wakacje","ferie","urodziny","imieniny","zawody",
    "narty","szachy","usta","plecy","ludzie"
  ].includes(word)) {
    return "plural_only";
  }

  // ===== MASS =====
  if ([
    "mleko","masło","mięso","złoto","srebro","piasek",
    "śnieg","deszcz","wiatr","dym","muzyka","cisza"
  ].includes(word)) {
    return "singular_only";
  }

  // ===== GENDER =====
  if (n.gender === "m") {
    if (n.animate) return "m_animate";

    if (n.flags?.is_difficult || n.flags?.has_alternation) {
      return "m_hard";
    }

    return "m_basic";
  }

  if (n.gender === "f") {
    if (word.endsWith("a")) {
      if (n.flags?.is_difficult) return "f_hard";
      return "f_basic";
    }

    if (n.flags?.is_difficult) return "f_hard";

    return "f_cons";
  }

  if (n.gender === "n") {
    if (word.endsWith("o")) return "n_basic";
    return "n_hard";
  }

  return "m_hard";
}

let HSK = [];
let revealIndex = 0;

async function loadHSK() {
  const res = await fetch("./data/result.json");
  HSK = await res.json();
}

const app = document.getElementById("app");

function router() {
  const hash = location.hash;
  const srsBtn = document.getElementById("srs-btn");


  if (!hash || hash === "#") {
    renderPath();
    if (srsBtn) {
      srsBtn.style.display = "block";
    }
    return;
  }

  if (hash === "#/srs") {
    renderSrs();
    return;
  }

  const levelMatch = hash.match(/^#\/level\/(\d+)(?:\/(\d+))?/);

  if (levelMatch) {
    const level = parseInt(levelMatch[1], 10);
    const index = parseInt(levelMatch[2] || "0", 10);
    renderLevel(level, index);
    if (srsBtn) srsBtn.style.display = "none";
    return;
  }
}

window.addEventListener("hashchange", router);

function getProgress() {
  return JSON.parse(localStorage.getItem("progress") || "{}");
}

function saveProgress(progress) {
  localStorage.setItem("progress", JSON.stringify(progress));
}

function markLevelCompleted(level) {
  const progress = getProgress();
  progress.completedLevels ||= {};
  progress.completedLevels[level] = true;
  saveProgress(progress);
}

function isLevelCompleted(level) {
  const progress = getProgress();
  return !!progress.completedLevels?.[level];
}
function renderPath() {
  const groups = groupNouns(HSK);

  app.innerHTML = `
    <div class="fixed-bottom">
      <button id='srs-btn' onclick='startSrsSession()'>SRS</button>
    </div>
    <div class='path' id='path'></div>
  `;

  const path = document.getElementById("path");

  GROUP_ORDER.forEach(groupKey => {
    const verbs = groups[groupKey];
    if (!verbs || verbs.length === 0) return;

    // заголовок
    const title = document.createElement("h1");
    title.textContent = GROUP_LABELS[groupKey];
    path.appendChild(title);

    // grid как у тебя
    let index = 0;
    let direction = "forward";

    while (index < verbs.length) {
      const rowVerbs = verbs.slice(index, index + LEVELS_PER_ROW);

      const row = document.createElement("div");
      row.className = "row";

      const ordered =
        direction === "forward"
          ? rowVerbs
          : [...rowVerbs].reverse();

      ordered.forEach(v => {
        const cell = document.createElement("div");
        cell.className = "cell";

        const btn = document.createElement("button");
        btn.textContent = v.polish_word;

        if (isLevelCompleted(v.id)) {
          btn.classList.add("completed");
        }
        btn.onclick = () => {
          localStorage.setItem("pathScroll", window.scrollY);
          location.hash = `/level/${v.id}`;
          window.location.reload();
        };

        cell.appendChild(btn);
        row.appendChild(cell);
      });

      path.appendChild(row);

      index += rowVerbs.length;
      direction = direction === "forward" ? "backward" : "forward";
    }
  });
  const savedScroll = localStorage.getItem("pathScroll");
  if (savedScroll !== null) {
    window.scrollTo(0, parseInt(savedScroll, 10));
  }
}

function getCharsForLevel(level) {
  const startId = (level - 1) * WORDS_PER_LEVEL + 1;
  const endId = startId + WORDS_PER_LEVEL - 1;
  return HSK.filter(c => c.id >= startId && c.id <= endId);
}

function isLevelEmpty(level) {
  return getWordsPreviewForLevel(level).length === 0;
}

function getWordsPreviewForLevel(level) {
  let filtered = getCharsForLevel(level).filter(c => !isIgnoredFromSrs(c.id))

  return filtered.map((c, i) =>
      `${c.polish_word}`
    ).join("");
}

function createRowFromLevels(container, direction, levels) {
  const row = document.createElement("div");
  row.className = "row";

  const orderedLevels =
    direction === "forward"
      ? levels
      : [...levels].reverse();

  const count = orderedLevels.length;

  orderedLevels.forEach((lvl, index) => {
    const cell = document.createElement("div");
    cell.className = "cell";

    const btn = document.createElement("button");

    const levelNum = document.createElement("div");
    levelNum.className = "level-number";
    levelNum.textContent = getVerbPreviewForLevel(lvl);
    btn.appendChild(levelNum);

    if (isLevelCompleted(lvl)) {
      btn.classList.add("completed");
    }

    btn.onclick = () => {
      location.hash = `/level/${lvl}`;
      window.location.reload();
    };

    cell.appendChild(btn);
    row.appendChild(cell);
  });
  if (row.innerHTML) {
    container.appendChild(row);
  }
}

function getVerbPreviewForLevel(level) {

  let filtered = getCharsForLevel(level).filter(c => !isIgnoredFromSrs(c.hanzi))

  return filtered.map((c, i) => c.polish_word)
}

function getAllLearnedChars() {
  const progress = getProgress();
  const completedLevels = Object.keys(progress.completedLevels || {}).map(Number);

  const chars = [];
  completedLevels.forEach(level => {
    chars.push(...getCharsForLevel(level));
  });

  return chars.filter(c => !isIgnoredFromSrs(c.id));
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function startSrsSession() {
  const limit = 9999999;
  const all = shuffle(getAllLearnedChars());
  const session = all.slice(0, limit);

  localStorage.setItem("srsSession", JSON.stringify({
    chars: session,
    index: 0
  }));

  location.hash = "#/srs";
}

function getCharsForLevel(level) {
  const startId = (level - 1) * WORDS_PER_LEVEL + 1;
  const endId = startId + WORDS_PER_LEVEL - 1;
  return HSK.filter(c => c.id >= startId && c.id <= endId);
}

function goBack(level, index) {
  if (index > 0) {
    location.hash = `#/level/${level}/${index - 1}`;
  } else {
    location.hash = "#";
  }
}

function finishAndGoNext(level) {
  markLevelCompleted(level);

  const nextLevel = level + 1;

  // если следующий уровень доступен — открыть его
  if (!isLevelEmpty(nextLevel)) {
    location.hash = `#/level/${nextLevel}`;
  } else {
    location.hash = "#";
  }

  window.location.reload();
}

function renderLevel(level, index = 0) {
  const chars = getCharsForLevel(level);
  const c = chars[index];

  const isLast = index >= chars.length - 1;

  app.innerHTML = `
    <div class="fixed-bottom high">
      <button class="back-btn" onclick="goBack(${level}, ${index})">⌘</button>
      ${ level > 1 ? `<button class="back-btn" onclick="renderLevel(${level - 1}, ${index})">←</button>` : ''}

      ${
        !isLast
          ? `<button class="next-btn" onclick="location.hash='#/level/${level}/${index + 1}'">→</button>`
          : `<button class="next-btn" onclick="finishLevel(${level})">✓</button>`
      }
    </div>

    <div class="char-card">
      <div class="verb">${c.polish_word} (${c.russian_word})</div>
      <div id="sentence-reveal"></div>
    </div>
  `;
  renderNounReveal("sentence-reveal", c)
}

function finishLevel(level) {
  markLevelCompleted(level);
  location.hash = "#";
  window.location.reload();
}

function mask(val, revealedCount) {
  if (!val) return "-";

  return val
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      return i < revealedCount ? ch : MASK_WITH;
    })
    .join("");
}

function isSeparator(ch) {
  return ch === " " || ch === "," || ch === "." || ch === "?";
}

function getWordBounds(state, fromIndex) {
  let start = fromIndex;

  // найти начало слова
  while (
    start > 0 &&
    !isSeparator(state.chars[start - 1].original)
  ) {
    start--;
  }

  let end = fromIndex;

  // найти конец слова
  while (
    end < state.chars.length &&
    !isSeparator(state.chars[end].original)
  ) {
    end++;
  }

  return { start, end };
}

function ignoreCurrentSrsChar() {
  const session = JSON.parse(localStorage.getItem("srsSession"));
  if (!session) return;

  const c = session.chars[session.index];

  ignoreCharFromSrs(c.id);

  session.chars.splice(session.index, 1);

  if (session.index >= session.chars.length) {
    finishSrsSession();
  } else {
    localStorage.setItem("srsSession", JSON.stringify(session));
    renderSrs();
  }
}
function getNounCell(state, number, kase) {
  return state.cells.find(c =>
    c.number === number && c.kase === kase
  );
}
function mask(val, revealedCount) {
  if (!val) return "-";

  return val
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      return i < revealedCount ? ch : MASK_WITH;
    })
    .join("");
}
function renderCaseTableMasked(state, number) {
  return `
    <table class="noun-table">
      ${rowCaseMasked(state, number, "mianownik", "mianownik")}
      ${rowCaseMasked(state, number, "dopelniacz", "dopelniacz")}
      ${rowCaseMasked(state, number, "celownik", "celownik")}
      ${rowCaseMasked(state, number, "biernik", "biernik")}
      ${rowCaseMasked(state, number, "narzednik", "narzednik")}
      ${rowCaseMasked(state, number, "miejscownik", "miejscownik")}
      ${rowCaseMasked(state, number, "wolacz", "wolacz")}
    </table>
  `;
}
function revealOneNoun(state) {
  const cell = state.cells.find(c =>
    c.value && c.revealedCount < c.value.length
  );

  if (!cell) return;

  cell.revealedCount++;
}

function revealRowNoun(state) {
  const cell = state.cells.find(c =>
    c.value && c.revealedCount < c.value.length
  );

  if (!cell) return;

  cell.revealedCount = cell.value.length;
}

function revealAllNoun(state) {
  state.cells.forEach(c => {
    if (c.value) {
      c.revealedCount = c.value.length;
    }
  });
}
function rowCaseMasked(state, number, key, label) {
  const cell = getNounCell(state, number, key);

  return `
    <tr>
      <td class="case-name">${label}</td>
      <td class="case-anchor">${CASE_ANCHORS[key]}</td>
      <td class="case-value">
        ${mask(cell?.value, cell?.revealedCount)}
      </td>
    </tr>
  `;
}
function createNounRevealState(noun) {
  const cells = [];

  function push(number, kase, value) {
    cells.push({
      number, // singular / plural
      kase,
      value,
      revealedCount: 0
    });
  }

  Object.entries(noun.singular).forEach(([k, v]) => {
    push("singular", k, v);
  });

  Object.entries(noun.plural).forEach(([k, v]) => {
    push("plural", k, v);
  });

  return {
    cells
  };
}
function renderSrs() {
  const session = JSON.parse(localStorage.getItem("srsSession"));
  if (!session) {
    app.innerHTML = "<p>No SRS session</p>";
    return;
  }

  const { chars, index } = session;
  const c = chars[index];

  if (!c) {
    return;
  }
  const isLast = index >= chars.length - 1;

  app.innerHTML = `
    <div class="fixed-bottom high">
      <button class="back-btn" onclick="location.hash = '#';">⌘</button>
      <button class="ignore-btn" onclick="ignoreCurrentSrsChar()">
        -
      </button>
      <button class="next-srs-btn"  onclick="nextSrs()">
        ${isLast ? "✓" : "→"}
      </button>
    </div>

    <div class="char-card">
      <div class="progress" style="display: none">${index + 1} / ${chars.length}</div>
      <div class="verb">${c.polish_word} (${c.russian_word})</div>
      <div id="sentence-reveal"></div>
    </div>
  `;
  renderNounReveal("sentence-reveal", c)
}

function nextSrs() {
  const session = JSON.parse(localStorage.getItem("srsSession"));
  markSrsSeen();
  session.index++;

  if (session.index >= session.chars.length) {
    finishSrsSession();
  } else {
    localStorage.setItem("srsSession", JSON.stringify(session));
    renderSrs();
  }
}
function markSrsSeen() {
  const today = new Date().toISOString().slice(0, 10);
  const progress = getProgress();

  progress.srsHistory ||= {};
  progress.srsHistory[today] ||= 0;
  progress.srsHistory[today]++;

  saveProgress(progress);
}

function finishSrsSession() {
  localStorage.removeItem("srsSession");
  location.hash = "#";
}

function ignoreCharFromSrs(id) {
  const progress = getProgress();
  progress.ignoredFromSrs ||= {};
  progress.ignoredFromSrs[id] = true;
  saveProgress(progress);
}

function isIgnoredFromSrs(id) {
  const progress = getProgress();
  return !!progress.ignoredFromSrs?.[id];
}
function renderNounReveal(containerId, noun) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const state = createNounRevealState(noun);

  function render() {
    container.innerHTML = `
      <div class="pl-row">
        <button id="reveal-one">+</button>
        <button id="reveal-row">++</button>
        <button id="reveal-all">+++</button>
      </div>

      <h1>Singular</h1>
      ${renderCaseTableMasked(state, "singular")}

      <h1>Plural</h1>
      ${renderCaseTableMasked(state, "plural")}
    `;

    document.getElementById("reveal-one").onclick = () => {
      revealOneNoun(state);
      render();
    };

    document.getElementById("reveal-row").onclick = () => {
      revealRowNoun(state);
      render();
    };

    document.getElementById("reveal-all").onclick = () => {
      revealAllNoun(state);
      render();
    };
  }

  render();
}
function renderCaseTable(forms) {
  return `
    <table class="noun-table">
      ${rowCase("Mianownik", "mianownik", forms.mianownik)}
      ${rowCase("Dopełniacz", "dopelniacz", forms.dopelniacz)}
      ${rowCase("Celownik", "celownik", forms.celownik)}
      ${rowCase("Biernik", "biernik", forms.biernik)}
      ${rowCase("Narzędnik", "narzednik", forms.narzednik)}
      ${rowCase("Miejscownik", "miejscownik", forms.miejscownik)}
      ${rowCase("Wołacz", "wolacz", forms.wolacz)}
    </table>
  `;
}
function rowCase(label, key, value) {
  return `
    <tr>
      <td class="case-name">${label}</td>
      <td class="case-anchor">${CASE_ANCHORS[key]}</td>
      <td class="case-value">${value || "-"}</td>
    </tr>
  `;
}
function rowMaskedCombined(state, tense, persons, label) {
  const m = getCell(state, tense, persons[0], "m");
  const f = getCell(state, tense, persons[1], "f");

  return `
    <tr>
      <td>${label}</td>
      <td>${mask(m?.value, m?.revealedCount)}</td>
      <td>${mask(f?.value, f?.revealedCount)}</td>
    </tr>
  `;
}
function revealWord(state) {
  const cell = state.cells.find(c =>
    c.value && c.revealedCount < c.value.length
  );

  if (!cell) return;

  cell.revealedCount = cell.value.length;
}

function renderPast(title, data) {
  if (!data) return "";

  return `
    <h2 class="header-h2">${title}</h2>
    <table class="verb-table">
      ${Object.entries(data)
        .map(([k, v]) => row(k, v))
        .join("")}
    </table>
  `;
}

function row(label, value) {
  return `
    <tr>
      <td>${label}</td>
      <td>${value || "-"}</td>
    </tr>
  `;
}
function row2(label, m, f) {
  return `
    <tr>
      <td>${label}</td>
      <td>${m || "-"}</td>
      <td>${f || "-"}</td>
    </tr>
  `;
}
function row3(label, m, f, n) {
  return `
    <tr>
      <td>${label}</td>
      <td>${m || "-"}</td>
      <td>${f || "-"}</td>
      <td>${n || "-"}</td>
    </tr>
  `;
}
function revealOne(state) {
  // ищем первую не раскрытую ячейку
  const cell = state.cells.find(c =>
    c.value && c.revealedCount < c.value.length
  );

  if (!cell) return;

  // обычное поведение
  cell.revealedCount++;
}
function getCell(state, tense, person, gender) {
  return state.cells.find(c =>
    c.tense === tense &&
    c.person === person &&
    (gender ? c.gender === gender : true)
  );
}


function revealAllVerb(state) {
  // найти первую незакрытую ячейку
  const target = state.cells.find(c =>
    c.value && c.revealedCount < c.value.length
  );

  if (!target) return;

  const targetTense = target.tense;

  state.cells.forEach(c => {
    if (c.tense === targetTense && c.value) {
      c.revealedCount = c.value.length;
    }
  });
}

function revealAllGlobal(state) {
  state.cells.forEach(c => {
    if (c.value) {
      c.revealedCount = c.value.length;
    }
  });
}
(async function init() {
  await loadHSK();
  router();
})();
