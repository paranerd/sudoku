import './styles.scss';
import { blockRows, blockCols, peers, conflicts, type Size, type Difficulty, type Puzzle } from './sudoku';
import { load, save, newGame, type Game } from './state';

const labels: Record<Difficulty, string> = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };
const icons = {
  settings: '<path d="m9.5 3-.5 2.4-1.5.9-2.3-.8-2.5 4.3 1.8 1.6v1.8l-1.8 1.6 2.5 4.3 2.3-.8 1.5.9.5 2.4h5l.5-2.4 1.5-.9 2.3.8 2.5-4.3-1.8-1.6v-1.8l1.8-1.6-2.5-4.3-2.3.8-1.5-.9-.5-2.4Z"/><circle cx="12" cy="12" r="3"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  undo: '<path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12"/>',
  pencil: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z"/>',
  erase: '<path d="m15 3 7 7-10 10H8l-6-6Z M7 9l9 9M12 20h9"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  light: '<path d="M9 18h6M10 21h4M9 15c0-2-3-3-3-6a6 6 0 1 1 12 0c0 3-3 4-3 6Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  restart: '<path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.8L21 8"/><path d="M21 3v5h-5"/>',
};
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <header class="header">
      <a class="wordmark" href="./" aria-label="Number Place Startseite">number place<span>.</span></a>
      <div class="header-actions"><button id="new-button" class="icon-button" aria-label="Neues Spiel" title="Neues Spiel">${icon('restart')}</button><button class="icon-button" id="settings-button" aria-label="Einstellungen öffnen" title="Einstellungen">${icon('settings')}</button></div>
    </header>
    <div class="intro"><p class="eyebrow">EIN FELD. EIN KLARER KOPF.</p><h1>Einfach mal abschalten.</h1></div>
    <section class="game-layout" aria-label="Zahlenrätsel">
      <div class="board-section">
        <div class="board-meta"><span id="game-label">9 × 9 <span class="meta-dot">·</span> Mittel</span>
          <div class="timer-group"><span id="timer" aria-label="Spielzeit">00:00</span><button class="icon-button small" id="pause-button" aria-label="Spiel pausieren">${icon('pause')}</button></div>
        </div>
        <div class="board-wrap"><div id="board" class="board" role="grid" aria-label="Spielfeld"></div>
          <div class="pause-overlay" id="pause-overlay" hidden><span>Ein kleiner Moment Ruhe.</span><button class="primary" id="resume-button">${icon('play')} Weiterspielen</button></div>
          <div class="loading-overlay" id="loading-overlay"><span class="spinner"></span><span>Dein Rätsel entsteht …</span></div>
        </div>
      </div>
      <aside class="controls" aria-label="Spieleingabe">
        <div class="controls-top"><p class="eyebrow">DEIN NÄCHSTER ZUG</p><p class="input-help" id="input-help">Feld wählen. Zahl setzen.</p></div>
        <div class="number-pad" id="number-pad" aria-label="Zahlen"></div>
        <div class="tools">
          <button id="undo-button" class="tool" aria-label="Letzten Zug rückgängig machen">${icon('undo')}<span>Zurück</span></button>
          <button id="notes-button" class="tool" aria-pressed="false" aria-label="Notizen umschalten">${icon('pencil')}<span>Notizen</span></button>
          <button id="erase-button" class="tool" aria-label="Gewähltes Feld leeren">${icon('erase')}<span>Löschen</span></button>
        </div>
        <div class="hint-card" id="hint-card" hidden>${icon('light')}<button class="text-button" id="reveal-button">Eine Zahl auflösen ${icon('arrow')}</button><button class="dismiss" id="dismiss-hint" aria-label="Hilfsangebot schließen">${icon('close')}</button></div>
        <div class="completion" id="completion" hidden><span class="completion-icon">${icon('check')}</span><h2>Alles an seinem Platz.</h2><p id="completion-text"></p></div>
      </aside>
    </section>
  </main>
  <div id="announcement" class="sr-only" role="status" aria-live="polite"></div>
  <dialog id="new-dialog" aria-labelledby="new-title"><form method="dialog" class="dialog-content">
    <div class="dialog-header"><h2 id="new-title">Neues Spiel</h2><button class="icon-button" value="cancel" aria-label="Schließen">${icon('close')}</button></div>
    <p class="dialog-description" id="new-description">Möchtest du ein neues Spiel starten?</p>
    <fieldset><legend>Feldgröße</legend><div class="segments" id="size-options">${([4, 6, 9] as Size[]).map(n => `<label><input type="radio" name="size" value="${n}"><span>${n} × ${n}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>Schwierigkeit</legend><div class="segments">${Object.entries(labels).map(([key, label]) => `<label><input type="radio" name="difficulty" value="${key}"><span>${label}</span></label>`).join('')}</div></fieldset>
    <div class="dialog-actions"><button class="secondary" value="cancel">Abbrechen</button><button class="primary" id="start-button" type="button">Neues Spiel starten ${icon('arrow')}</button></div>
  </form></dialog>
  <dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="dialog-content">
    <div class="dialog-header"><h2 id="settings-title">Einstellungen</h2><button class="icon-button" value="close" aria-label="Schließen">${icon('close')}</button></div>
    <div class="setting"><label for="idle-delay"><strong>Hilfe bei einer Denkpause</strong><span>Bietet nach einer Pause an, eine Zahl aufzulösen.</span></label><select id="idle-delay"><option value="0">Aus</option><option value="30">30s</option><option value="60">1min</option><option value="120">2min</option></select></div>
    <div class="setting"><label for="conflict-toggle"><strong>Doppelte Zahlen markieren</strong><span>Zeigt Konflikte in Zeile, Spalte und Block.</span></label><input class="switch" id="conflict-toggle" type="checkbox"></div>
    <div class="setting"><label for="highlight-toggle"><strong>Block, Zeile & Spalte hervorheben</strong><span>Markiert die Umgebung des gewählten Feldes.</span></label><input class="switch" id="highlight-toggle" type="checkbox"></div>
    <div class="app-actions"><button class="text-button" id="help-button" type="button">Tastatur & Spielregeln</button><button class="text-button" id="install-button" type="button" hidden>App installieren ${icon('arrow')}</button><button class="text-button" id="update-button" type="button" hidden>Update laden ${icon('arrow')}</button></div>
  </form></dialog>
  <dialog id="help-dialog" aria-labelledby="help-title"><form method="dialog" class="dialog-content">
    <div class="dialog-header"><h2 id="help-title">Tastatur & Spielregeln</h2><button class="icon-button" value="close" aria-label="Zurück zu den Einstellungen">${icon('close')}</button></div>
    <p class="help-text">Jede Zahl gehört genau einmal in jede Zeile, Spalte und jeden Block. 4×4 hat 2×2-Blöcke, 6×6 hat 2×3-Blöcke, 9×9 hat 3×3-Blöcke.</p>
    <p class="help-text">Pfeiltasten wählen ein Feld. Ziffern setzen eine Zahl. N schaltet Notizen um, Entf löscht, Strg/⌘ + Z macht einen Zug rückgängig.</p>
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
const helpDialog = $<HTMLDialogElement>('help-dialog');
const dialogs = [newDialog, settingsDialog, helpDialog];
function announce(message: string) { $('announcement').textContent = message; }
function notice(message: string) {
  announce(message);
  $('announcement').className = 'notice';
}
function persist() {
  if (!save(game, settings) && !storageFailed) {
    storageFailed = true;
    notice('Speichern nicht verfügbar. Lass dieses Fenster geöffnet.');
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
  running = !!game && !paused && !game.completed && !generating && !document.hidden && dialogs.every(d => !d.open);
  $('timer').textContent = formatTime(game?.elapsed || 0);
}
function activity() { lastAction = performance.now(); }
function hideHint() { $('hint-card').hidden = true; fitBoard(); }
// Size the square using the actual remaining space, including help and completion cards.
function fitBoard() {
  const layout = document.querySelector<HTMLElement>('.game-layout')!;
  const controls = document.querySelector<HTMLElement>('.controls')!;
  const meta = document.querySelector<HTMLElement>('.board-meta')!;
  const style = getComputedStyle(layout);
  const stacked = style.display === 'flex';
  const gap = parseFloat(style.gap) || 0;
  const height = layout.clientHeight - meta.offsetHeight - (stacked ? controls.offsetHeight + gap : 0);
  const width = layout.clientWidth - (stacked ? 0 : controls.offsetWidth + gap);
  layout.style.setProperty('--board-side', `${Math.max(0, Math.floor(Math.min(460, height, width)))}px`);
}
new ResizeObserver(fitBoard).observe(document.querySelector('.game-layout')!);
new ResizeObserver(fitBoard).observe(document.querySelector('.controls')!);
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
    const classes = ['cell', givens[i] ? 'given' : 'entered', i === selected ? 'selected' : settings.highlightPeers && peers(i, selected, size) ? 'related' : '', chosenValue && chosenValue === n ? 'matching' : '', bad.has(i) ? 'conflict' : '', (c + 1) % blockCols(size) === 0 && c < size - 1 ? 'block-right' : '', (r + 1) % blockRows(size) === 0 && r < size - 1 ? 'block-bottom' : ''].join(' ');
    const text = n ? String(n) : notes[i].length ? `Notizen ${notes[i].join(', ')}` : 'leer';
    return `<button class="${classes}" data-index="${i}" role="gridcell" aria-selected="${i === selected}" aria-label="Zeile ${r + 1}, Spalte ${c + 1}: ${text}${givens[i] ? ', vorgegeben' : ''}${bad.has(i) ? ', Konflikt' : ''}" tabindex="${i === selected ? 0 : -1}" ${paused || generating ? 'disabled' : ''}>${n || `<span class="notes" style="--note-cols:${size === 4 ? 2 : 3}">${Array.from({ length: size }, (_, j) => `<span>${notes[i].includes(j + 1) ? j + 1 : ''}</span>`).join('')}</span>`}</button>`;
  }).join('')}</div>`).join('');
  if (hadFocus) focusCell();
  $('game-label').innerHTML = `${size} × ${size} <span class="meta-dot">·</span> ${labels[game.difficulty]}`;
  $('number-pad').dataset.size = String(size);
  $('number-pad').innerHTML = Array.from({ length: size }, (_, i) => {
    const n = i + 1, count = values.filter(v => v === n).length;
    return `<button class="number ${count === size ? 'filled' : ''}" data-number="${n}" aria-label="${notesMode ? 'Notiz' : 'Zahl'} ${n}" ${paused || generating || game!.completed ? 'disabled' : ''}>${n}</button>`;
  }).join('');
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
  if (game.completed) $('completion-text').textContent = `Gelöst in ${formatTime(game.elapsed)}${game.hints ? ` · ${game.hints} ${game.hints === 1 ? 'Hilfestellung' : 'Hilfestellungen'}` : ''}.`;
  fitBoard();
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
    announce(`Rätsel gelöst in ${formatTime(game.elapsed)}.`);
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
  notice('Das Rätsel konnte nicht erstellt werden. Bitte lade die App neu.');
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
  $('new-description').textContent = game && !game.completed ? 'Möchtest du ein neues Spiel starten? Dein aktuelles Spiel wird dabei ersetzt.' : 'Möchtest du ein neues Spiel starten?';
  newDialog.showModal(); settleTime(); hideHint();
};
$('start-button').onclick = () => {
  const data = new FormData(newDialog.querySelector('form')!);
  newDialog.close();
  start(Number(data.get('size')) as Size, data.get('difficulty') as Difficulty);
};
$('settings-button').onclick = () => {
  settleTime();
  $<HTMLInputElement>('conflict-toggle').checked = settings.showConflicts;
  $<HTMLInputElement>('highlight-toggle').checked = settings.highlightPeers;
  $<HTMLSelectElement>('idle-delay').value = String(settings.idleHints ? settings.idleSeconds : 0);
  settingsDialog.showModal(); settleTime(); hideHint();
};
settingsDialog.addEventListener('change', () => {
  const delay = Number($<HTMLSelectElement>('idle-delay').value);
  settings.idleHints = delay > 0;
  settings.showConflicts = $<HTMLInputElement>('conflict-toggle').checked;
  settings.highlightPeers = $<HTMLInputElement>('highlight-toggle').checked;
  if (delay > 0) settings.idleSeconds = delay;
  activity(); render(); persist();
});
$('help-button').onclick = () => { settingsDialog.close(); helpDialog.showModal(); settleTime(); };
function closeDialog(dialog: HTMLDialogElement) {
  dialog.close();
  if (dialog === helpDialog) settingsDialog.showModal();
  activity(); settleTime(); persist();
}
dialogs.forEach(dialog => {
  dialog.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog(dialog);
  });
});
document.addEventListener('keydown', event => {
  activity();
  if (!game || dialogs.some(d => d.open) || paused || generating || game.completed ||
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
    $('hint-card').hidden = false; fitBoard(); announce('Du kannst jetzt eine Zahl auflösen.');
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
    document.documentElement.dataset.offlineReady = 'true';
  }).catch(() => {
    notice('Offline-Modus konnte nicht geladen werden. Bitte mit Internetverbindung neu laden.');
  });
}
if (game) { $('loading-overlay').hidden = true; render(); settleTime(); }
else start(9, 'medium');
