import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync('src/styles/tokens.css', 'utf8');
const colors = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [
    match[1],
    match[2],
  ]),
);
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function ratio(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
it.each([
  ['white', 'primary'],
  ['white', 'dark'],
  ['dark', 'secondary'],
  ['dark', 'success'],
  ['dark', 'error'],
  ['dark', 'light'],
  ['muted', 'white'],
  ['error-text', 'white'],
])('verifica contraste AA de texto: %s sobre %s', (foreground, background) => {
  expect(ratio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(
    4.5,
  );
});
it('verifica contraste da borda de controles essenciais', () => {
  expect(ratio(colors['control-border'], colors.white)).toBeGreaterThanOrEqual(
    3,
  );
});
