import { cursorTo, clearScreenDown, emitKeypressEvents, moveCursor } from 'node:readline';
import { text } from '../i18n.mjs';

export function canShowClientMenu(input, output) {
  return input.isTTY && output.isTTY && typeof input.setRawMode === 'function' && process.env.TERM !== 'dumb';
}

export function cancelledPrompt() {
  return Object.assign(new Error('Interactive setup cancelled.'), { code: 'E_CANCELLED', exitCode: 130 });
}

export async function selectClientsFromMenu({ input, output, choices, initial, language }) {
  const ids = choices.map(choice => choice.id);
  const selected = new Set(initial.includes('all') ? ids : initial.filter(id => ids.includes(id)));
  const originalRawMode = Boolean(input.isRaw), wasFlowing = input.readableFlowing === true;
  let cursor = 0, offset = 0, renderedLines = 0;
  const erase = () => {
    if (renderedLines) moveCursor(output, 0, -renderedLines);
    cursorTo(output, 0);
    clearScreenDown(output);
  };
  function render() {
    const width = Math.max(12, (output.columns || 80) - 1);
    const help = text(language, 'clientMenuKeys').match(new RegExp(`.{1,${width}}(?:\\s|$)|.{1,${width}}`, 'g'));
    const size = Math.min(choices.length, Math.max(1, (output.rows || 24) - help.length - 2));
    if (cursor < offset) offset = cursor;
    if (cursor >= offset + size) offset = cursor - size + 1;
    const lines = [text(language, 'clientMenuTitle')];
    for (const [index, choice] of choices.slice(offset, offset + size).entries()) {
      const marker = index + offset === cursor ? '>' : ' ';
      lines.push(`${marker} [${selected.has(choice.id) ? 'x' : ' '}] ${choice.name} (${choice.id})`);
    }
    const visible = lines.map(line => line.length <= width ? line : line.slice(0, width - 1) + '…');
    visible.push(...help.map(line => line.trimEnd()));
    erase();
    output.write(visible.join('\n') + '\n');
    renderedLines = visible.length;
  }
  let keypress, end, streamError;
  try {
    emitKeypressEvents(input);
    input.setRawMode(true);
    output.write('\x1b[?25l');
    const result = await new Promise((resolve, reject) => {
      end = () => reject(cancelledPrompt());
      streamError = error => reject(error);
      keypress = (_value, key) => {
        if (key.name === 'escape' || key.ctrl && ['c', 'd'].includes(key.name)) return end();
        if (key.name === 'return' || key.name === 'enter') {
          return resolve(initial.includes('all') && selected.size === ids.length ? ['all'] : ids.filter(id => selected.has(id)));
        }
        if (key.name === 'up') cursor = (cursor + choices.length - 1) % choices.length;
        else if (key.name === 'down') cursor = (cursor + 1) % choices.length;
        else if (key.name === 'space') {
          if (!selected.delete(ids[cursor])) selected.add(ids[cursor]);
        } else return;
        render();
      };
      input.on('keypress', keypress);
      input.once('end', end);
      input.once('error', streamError);
      render();
      input.resume();
    });
    erase();
    output.write(`${text(language, 'clientsCurrent')}: ${result.join(', ') || text(language, 'clientMenuNone')}\n`);
    return result.length ? result : ['none'];
  } finally {
    if (keypress) input.off('keypress', keypress);
    if (end) input.off('end', end);
    if (streamError) input.off('error', streamError);
    if (!wasFlowing) input.pause();
    input.setRawMode(originalRawMode);
    output.write('\x1b[?25h');
  }
}
