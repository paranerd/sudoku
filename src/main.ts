import './styles.scss';
import { blockRows, blockCols, peers, conflicts, type Size, type Difficulty, type Puzzle } from './sudoku';
import { load, save, newGame, type Game } from './state';

const labels: Record<Difficulty, string> = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };
const icons = {
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 2 3-2v-3l3-2-1-3-3-1-1-3Z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  undo: '<path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12"/>',
  pencil: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z"/>',
  erase: '<path d="m15 3 7 7-10 10H8l-6-6Z M7 9l9 9M12 20h9"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  light: '<path d="M9 18h6M10 21h4M9 15c0-2-3-3-3-6a6 6 0 1 1 12 0c0 3-3 4-3 6Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <header class="header">
      <a class="wordmark" href="./" aria-label="Sudoku Startseite">sudoku<span>.</span></a>
      <button class="icon-button" id="settings-button" aria-label="Einstellungen öffnen">${icon('settings')}</button>
    </header>
    <div class="intro"><p class="eyebrow">EIN FELD. EIN KLARER KOPF.</p><h1>Einfach mal abschalten.</h1></div>
    <section class="game-layout" aria-label="Sudoku-Spiel">
      <div class="board-section">
        <div class="board-meta"><span id="game-label">9 × 9 <span class="meta-dot">·</span> Mittel</span>
          <div class="timer-group"><span id="timer" aria-label="Spielzeit">00:00</span><button class="icon-button small" id="pause-button" aria-label="Spiel pausieren">${icon('pause')}</button></div>
        </div>
        <div class="board-wrap"><div id="board" class="board" role="grid" aria-label="Sudoku-Feld"></div>
          <div class="pause-overlay" id="pause-overlay" hidden><span>Ein kleiner Moment Ruhe.</span><button class="primary" id="resume-button">${icon('play')} Weiterspielen</button></div>
          <div class="loading-overlay" id="loading-overlay"><span class="spinner"></span><span>Dein Sudoku entsteht …</span></div>
        </div>
        <div class="board-footer"><span id="progress-text">Dein Spiel wird automatisch gespeichert.</span><span class="progress-track" aria-hidden="true"><span id="progress-bar"></span></span></div>
      </div>
      <aside class="controls" aria-label="Spieleingabe">
        <div class="controls-top"><p class="eyebrow">DEIN NÄCHSTER ZUG</p><p class="input-help" id="input-help">Feld wählen. Zahl setzen.</p></div>
        <div class="number-pad" id="number-pad" aria-label="Zahlen"></div>
        <div class="tools">
          <button id="undo-button" class="tool" aria-label="Letzten Zug rückgängig machen">${icon('undo')}<span>Zurück</span></button>
          <button id="notes-button" class="tool" aria-pressed="false" aria-label="Notizen umschalten">${icon('pencil')}<span>Notizen</span></button>
          <button id="erase-button" class="tool" aria-label="Gewähltes Feld leeren">${icon('erase')}<span>Löschen</span></button>
        </div>
        <div class="hint-card" id="hint-card" hidden><div>${icon('light')}<span>Ein kleiner Denkanstoß?</span><button class="dismiss" id="dismiss-hint" aria-label="Hilfsangebot schließen">${icon('close')}</button></div><p>Löse ein Feld auf und finde deinen Rhythmus wieder.</p><button class="text-button" id="reveal-button">Eine Zahl auflösen ${icon('arrow')}</button></div>
        <div class="completion" id="completion" hidden><span class="completion-icon">${icon('check')}</span><h2>Alles an seinem Platz.</h2><p id="completion-text"></p></div>
        <button id="new-button" class="primary new-button">Neues Spiel ${icon('arrow')}</button>
        <p class="quiet-note">Dein Tempo. Deine kleine Auszeit.</p>
      </aside>
    </section>
    <footer class="footer"><span>Weniger Ablenkung. Mehr Fokus.</span><span id="offline-status"><span class="status-dot"></span> Lokal gespeichert</span></footer>
  </main>
  <div id="announcement" class="sr-only" role="status" aria-live="polite"></div>
  <dialog id="new-dialog" aria-labelledby="new-title"><form method="dialog" class="dialog-content">
    <div class="dialog-header"><h2 id="new-title">Ein frisches Feld.</h2><button class="icon-button" value="cancel" aria-label="Schließen">${icon('close')}</button></div>
    <p class="dialog-description" id="new-description">Wähle die Größe und deine Herausforderung.</p>
    <fieldset><legend>Feldgröße</legend><div class="segments" id="size-options">${([4, 6, 9] as Size[]).map(n => `<label><input type="radio" name="size" value="${n}"><span>${n} × ${n}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>Schwierigkeit</legend><div class="segments">${Object.entries(labels).map(([key, label]) => `<label><input type="radio" name="difficulty" value="${key}"><span>${label}</span></label>`).join('')}</div></fieldset>
    <button class="primary full" id="start-button" type="button">Los geht’s ${icon('arrow')}</button>
  </form></dialog>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="dialog-content">
    <div class="dialog-header"><h2 id="settings-title">Ganz wie du magst.</h2><button class="icon-button" value="close" aria-label="Schließen">${icon('close')}</button></div>
    <div class="setting"><label for="idle-toggle"><strong>Hilfe bei einer Denkpause</strong><span>Bietet dir an, eine Zahl aufzulösen.</span></label><input class="switch" id="idle-toggle" type="checkbox"></div>
    <div class="setting"><label for="idle-delay">Anbieten nach</label><select id="idle-delay"><option value="60">1 Minute</option><option value="90">1½ Minuten</option><option value="120">2 Minuten</option></select></div>
    <div class="setting"><label for="conflict-toggle"><strong>Doppelte Zahlen markieren</strong><span>Zeigt Konflikte in Zeile, Spalte und Block.</span></label><input class="switch" id="conflict-toggle" type="checkbox"></div>
    <div class="offline-info"><strong id="pwa-status">Offline-Modus wird vorbereitet …</strong><p id="pwa-description">Nach dem ersten Laden kannst du auch ohne Internet neue Rätsel spielen.</p><button class="text-button" id="install-button" type="button" hidden>App installieren ${icon('arrow')}</button><button class="text-button" id="update-button" type="button" hidden>Update laden ${icon('arrow')}</button></div>
    <details><summary>Tastatur & Spielregeln</summary><p>Pfeiltasten wählen ein Feld. Ziffern setzen eine Zahl. N schaltet Notizen um, Entf löscht, Strg/⌘ + Z macht einen Zug rückgängig.</p><p>Jede Zahl gehört genau einmal in jede Zeile, Spalte und jeden Block. 4×4 hat 2×2-Blöcke, 6×6 hat 2×3-Blöcke, 9×9 hat 3×3-Blöcke.</p></details>
  </form></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
const initial = load();
let game: Game | null = initial.game;
const settings = initial.settings;
let selected = game ? game.values.findIndex(n => !n) : 0;
if (selected < 0) selected = 0;
let notesMode = false, paused = false, generating = false;
let lastTick = performance.now(), lastAction = performance.now();
let running = false;
let storageFailed = false;
const newDialog = $<HTMLDialogElement>('new-dialog'), settingsDialog = $<HTMLDialogElement>('settings-dialog');
function announce(message: string) { $('announcement').textContent = message; }
function persist() {
  if (!save(game, settings) && !storageFailed) {
    storageFailed = true;
    $('progress-text').textContent = 'Speichern nicht verfügbar. Lass dieses Fenster geöffnet.';
    announce('Dein Browser erlaubt kein lokales Speichern.');
  }
}
function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  return `${hours ? `${hours}:` : ''}${String(Math.floor(whole / 60) % 60).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
function settleTime() {
  const now = performance.now();
  if (running && game) game.elapsed += (now - lastTick) / 1000;
  lastTick = now;
  running = !!game && !paused && !game.completed && !generating && !document.hidden && !newDialog.open && !settingsDialog.open;
  $('timer').textContent = formatTime(game?.elapsed || 0);
}
function activity() { lastAction = performance.now(); }
function hideHint() { $('hint-card').hidden = true; }
function render() {
  if (!game) return;
  const { size, values, givens, notes } = game;
  const hadFocus = $('board').contains(document.activeElement);
  const bad = settings.showConflicts ? conflicts(values, size) : new Set<number>();
  const chosenValue = values[selected];
  $('board').style.setProperty('--size', String(size));
  $('board').dataset.size = String(size);
  $('board').innerHTML = Array.from({ length: size }, (_, r) => `<div role="row">${Array.from({ length: size }, (_, c) => {
    const i = r * size + c, n = values[i];
    const classes = ['cell', givens[i] ? 'given' : 'entered', i === selected ? 'selected' : peers(i, selected, size) ? 'related' : '', chosenValue && chosenValue === n ? 'matching' : '', bad.has(i) ? 'conflict' : '', (c + 1) % blockCols(size) === 0 && c < size - 1 ? 'block-right' : '', (r + 1) % blockRows(size) === 0 && r < size - 1 ? 'block-bottom' : ''].join(' ');
    const text = n ? String(n) : notes[i].length ? `Notizen ${notes[i].join(', ')}` : 'leer';
    return `<button class="${classes}" data-index="${i}" role="gridcell" aria-selected="${i === selected}" aria-label="Zeile ${r + 1}, Spalte ${c + 1}: ${text}${givens[i] ? ', vorgegeben' : ''}${bad.has(i) ? ', Konflikt' : ''}" tabindex="${i === selected ? 0 : -1}" ${paused || generating ? 'disabled' : ''}>${n || `<span class="notes" style="--note-cols:${size === 4 ? 2 : 3}">${Array.from({ length: size }, (_, j) => `<span>${notes[i].includes(j + 1) ? j + 1 : ''}</span>`).join('')}</span>`}</button>`;
  }).join('')}</div>`).join('');
  if (hadFocus) focusCell();
  $('game-label').innerHTML = `${size} × ${size} <span class="meta-dot">·</span> ${labels[game.difficulty]}`;
  $('number-pad').dataset.size = String(size);
  $('number-pad').innerHTML = Array.from({ length: size }, (_, i) => {
    const n = i + 1, count = values.filter(v => v === n).length;
    return `<button class="number ${count === size ? 'filled' : ''}" data-number="${n}" aria-label="${notesMode ? 'Notiz' : 'Zahl'} ${n}" ${paused || generating || game!.completed ? 'disabled' : ''}><span>${n}</span><span class="number-count" aria-hidden="true">${Math.max(0, size - count)}</span></button>`;
  }).join('');
  const total = givens.filter(n => !n).length;
  const filled = values.filter((n, i) => !givens[i] && n).length;
  if (!storageFailed) $('progress-text').textContent = game.completed ? 'Geschafft. Gut gemacht.' : `${filled} von ${total} Feldern ausgefüllt`;
  $('progress-bar').style.width = `${filled / total * 100}%`;
  $('notes-button').setAttribute('aria-pressed', String(notesMode));
  $('input-help').textContent = notesMode ? 'Kleine Zahlen. Große Gedanken.' : 'Feld wählen. Zahl setzen.';
  $<HTMLButtonElement>('undo-button').disabled = !game.history.length || paused || game.completed || generating;
  $<HTMLButtonElement>('erase-button').disabled = !!givens[selected] || paused || game.completed || generating;
  $<HTMLButtonElement>('notes-button').disabled = paused || game.completed || generating;
  $<HTMLButtonElement>('pause-button').disabled = game.completed || generating;
  $('pause-button').innerHTML = icon(paused ? 'play' : 'pause');
  $('pause-button').setAttribute('aria-label', paused ? 'Weiterspielen' : 'Spiel pausieren');
  $('pause-overlay').hidden = !paused;
  $('loading-overlay').hidden = !generating;
  $('completion').hidden = !game.completed;
  if (game.completed) $('completion-text').textContent = `Gelöst in ${formatTime(game.elapsed)}${game.hints ? ` · ${game.hints} ${game.hints === 1 ? 'Hilfestellung' : 'Hilfestellungen'}` : ''}. Zeit für eine neue Runde?`;
}
function focusCell() { $('board').querySelector<HTMLButtonElement>(`[data-index="${selected}"]`)?.focus({ preventScroll: true }); }
function snapshot() {
  if (!game) return;
  game.history.push({ values: [...game.values], notes: game.notes.map(n => [...n]) });
  if (game.history.length > 100) game.history.shift();
}
function edit(value: number, reveal = false) {
  if (!game || paused || generating || game.completed || game.givens[selected]) return;
  activity(); hideHint();
  if (notesMode && !reveal && value) {
    if (game.values[selected]) return;
    snapshot();
    const ns = game.notes[selected];
    game.notes[selected] = ns.includes(value) ? ns.filter(n => n !== value) : [...ns, value].sort();
  } else {
    if (game.values[selected] === value && !game.notes[selected].length) return;
    snapshot();
    game.values[selected] = value;
    game.notes[selected] = [];
    if (value) game.notes.forEach((ns, i) => { if (peers(i, selected, game!.size)) game!.notes[i] = ns.filter(n => n !== value); });
  }
  if (reveal) game.hints++;
  if (game.values.every((n, i) => n === game!.solution[i])) {
    settleTime(); game.completed = true; running = false;
    announce(`Sudoku gelöst in ${formatTime(game.elapsed)}.`);
  }
  render(); persist();
}
function undo() {
  if (!game || paused || generating || game.completed) return;
  const previous = game.history.pop();
  if (!previous) return;
  game.values = previous.values; game.notes = previous.notes;
  activity(); hideHint(); render(); persist();
}
function togglePause() {
  if (!game || game.completed || generating) return;
  settleTime(); paused = !paused; settleTime();
  activity(); hideHint(); render(); persist();
  if (!paused) focusCell();
}
const worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
worker.onmessage = (event: MessageEvent<Puzzle>) => {
  game = newGame(event.data); selected = game.values.findIndex(n => !n);
  paused = false; notesMode = false; generating = false;
  activity(); hideHint(); render(); settleTime(); persist();
  announce(`${game.size} mal ${game.size}, ${labels[game.difficulty]}. Neues Spiel bereit.`);
};
worker.onerror = () => {
  generating = false;
  $('loading-overlay').hidden = true;
  announce('Das Rätsel konnte nicht erstellt werden. Bitte lade die App neu.');
  $('progress-text').textContent = 'Das Rätsel konnte nicht erstellt werden. Bitte neu laden.';
};
function start(size: Size, difficulty: Difficulty) {
  settleTime(); generating = true; running = false; hideHint();
  if (game) render(); else $('loading-overlay').hidden = false;
  worker.postMessage({ size, difficulty });
}
$('board').addEventListener('click', event => {
  const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-index]');
  if (!cell || paused || generating) return;
  selected = Number(cell.dataset.index); activity(); render(); focusCell();
});
$('number-pad').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-number]');
  if (button) edit(Number(button.dataset.number));
});
$('notes-button').onclick = () => { notesMode = !notesMode; render(); };
$('erase-button').onclick = () => edit(0);
$('undo-button').onclick = undo;
$('pause-button').onclick = togglePause;
$('resume-button').onclick = togglePause;
$('dismiss-hint').onclick = () => { hideHint(); activity(); };
$('reveal-button').onclick = () => {
  if (!game) return;
  if (game.givens[selected] || game.values[selected] === game.solution[selected]) {
    selected = game.values.findIndex((n, i) => n !== game!.solution[i]);
  }
  if (selected < 0) return;
  edit(game.solution[selected], true);
  announce(`Zeile ${Math.floor(selected / game.size) + 1}, Spalte ${selected % game.size + 1}: ${game.solution[selected]}.`);
};
$('new-button').onclick = () => {
  settleTime();
  newDialog.querySelector<HTMLInputElement>(`[name="size"][value="${game?.size || 9}"]`)!.checked = true;
  newDialog.querySelector<HTMLInputElement>(`[name="difficulty"][value="${game?.difficulty || 'medium'}"]`)!.checked = true;
  $('new-description').textContent = game && !game.completed ? 'Wähle dein neues Sudoku. Dein aktuelles Spiel wird ersetzt.' : 'Wähle die Größe und deine Herausforderung.';
  newDialog.showModal(); settleTime(); hideHint();
};
$('start-button').onclick = () => {
  const data = new FormData(newDialog.querySelector('form')!);
  newDialog.close();
  start(Number(data.get('size')) as Size, data.get('difficulty') as Difficulty);
};
$('settings-button').onclick = () => {
  settleTime();
  $<HTMLInputElement>('idle-toggle').checked = settings.idleHints;
  $<HTMLInputElement>('conflict-toggle').checked = settings.showConflicts;
  $<HTMLSelectElement>('idle-delay').value = String(settings.idleSeconds);
  $<HTMLSelectElement>('idle-delay').disabled = !settings.idleHints;
  settingsDialog.showModal(); settleTime(); hideHint();
};
settingsDialog.addEventListener('change', () => {
  settings.idleHints = $<HTMLInputElement>('idle-toggle').checked;
  settings.showConflicts = $<HTMLInputElement>('conflict-toggle').checked;
  settings.idleSeconds = Number($<HTMLSelectElement>('idle-delay').value);
  $<HTMLSelectElement>('idle-delay').disabled = !settings.idleHints;
  activity(); render(); persist();
});
[newDialog, settingsDialog].forEach(dialog => {
  dialog.addEventListener('close', () => { activity(); settleTime(); persist(); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});
document.addEventListener('keydown', event => {
  activity();
  if (!game || newDialog.open || settingsDialog.open || paused || generating || game.completed ||
    (event.target instanceof HTMLElement && event.target.closest('button') && !$('board').contains(event.target))) return;
  const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -game.size, ArrowDown: game.size };
  if (event.key in directions) {
    event.preventDefault();
    selected = (selected + directions[event.key] + game.size * game.size) % (game.size * game.size);
    render(); focusCell();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
  else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    if (/^[1-9]$/.test(event.key) && Number(event.key) <= game.size) { event.preventDefault(); edit(Number(event.key)); }
    else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); edit(0); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); notesMode = !notesMode; render(); }
  }
});
document.addEventListener('pointerdown', activity);
document.addEventListener('visibilitychange', () => { settleTime(); activity(); persist(); });
window.addEventListener('pagehide', () => { settleTime(); persist(); });
setInterval(() => {
  settleTime();
  if (running && settings.idleHints && performance.now() - lastAction >= settings.idleSeconds * 1000 && $('hint-card').hidden) {
    $('hint-card').hidden = false; announce('Du kannst jetzt eine Zahl auflösen.');
  }
  persist();
}, 1000);

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let installPrompt: InstallPrompt | null = null;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event as InstallPrompt; $('install-button').hidden = false;
});
$('install-button').onclick = async () => {
  if (!installPrompt) return;
  await installPrompt.prompt(); await installPrompt.userChoice;
  installPrompt = null; $('install-button').hidden = true;
};
window.addEventListener('appinstalled', () => { $('install-button').hidden = true; });
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(async registration => {
    const waiting = () => { if (registration.waiting && navigator.serviceWorker.controller) $('update-button').hidden = false; };
    waiting();
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', waiting);
    });
    $('update-button').onclick = () => {
      settleTime(); persist();
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      registration.waiting?.postMessage('ACTIVATE');
    };
    await navigator.serviceWorker.ready;
    $('offline-status').innerHTML = '<span class="status-dot"></span> Offline bereit';
    $('pwa-status').textContent = 'Bereit für deine Offline-Auszeit.';
    $('pwa-description').textContent = 'Alle Rätsel und Funktionen sind ohne Internet verfügbar. Auf iPhone/iPad: Teilen → Zum Home-Bildschirm.';
  }).catch(() => {
    $('pwa-status').textContent = 'Offline-Modus konnte nicht geladen werden.';
    $('pwa-description').textContent = 'Bitte lade die App mit Internetverbindung erneut.';
  });
} else {
  $('pwa-status').textContent = import.meta.env.DEV ? 'Offline-Modus im Produktions-Build.' : 'Dieser Browser unterstützt keinen Offline-Modus.';
}
if (game) { $('loading-overlay').hidden = true; render(); settleTime(); }
else start(9, 'medium');
