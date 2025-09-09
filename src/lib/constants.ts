export const LETTER_FREQ: Record<string, number> = {
  a: 9, b: 2, c: 2, d: 3, e: 15, f: 2, g: 2, h: 2, i: 8, j: 1, k: 1, l: 5,
  m: 3, n: 6, o: 6, p: 2, q: 1, r: 6, s: 6, t: 6, u: 6, v: 2, w: 1, x: 1, y: 1, z: 1,
  '*': 2
};

export const fold = (s: string) => 
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function extractWords(tiles: { x: number; y: number; as_letter: string }[]) {
  if (tiles.length === 0) return [];

  const tileMap = new Map<string, string>();
  for (const tile of tiles) {
    tileMap.set(`${tile.x},${tile.y}`, tile.as_letter);
  }

  const words: { dir: 'H' | 'V'; start: { x: number; y: number }; text: string }[] = [];
  const processed = new Set<string>();

  // Find horizontal words
  for (const tile of tiles) {
    const key = `H:${tile.x},${tile.y}`;
    if (processed.has(key)) continue;

    let startX = tile.x;
    while (tileMap.has(`${startX - 1},${tile.y}`)) {
      startX--;
    }

    let text = '';
    let x = startX;
    while (tileMap.has(`${x},${tile.y}`)) {
      text += tileMap.get(`${x},${tile.y}`) || '';
      processed.add(`H:${x},${tile.y}`);
      x++;
    }

    if (text.length > 1) {
      words.push({ dir: 'H', start: { x: startX, y: tile.y }, text });
    }
  }

  // Find vertical words
  for (const tile of tiles) {
    const key = `V:${tile.x},${tile.y}`;
    if (processed.has(key)) continue;

    let startY = tile.y;
    while (tileMap.has(`${tile.x},${startY - 1}`)) {
      startY--;
    }

    let text = '';
    let y = startY;
    while (tileMap.has(`${tile.x},${y}`)) {
      text += tileMap.get(`${tile.x},${y}`) || '';
      processed.add(`V:${tile.x},${y}`);
      y++;
    }

    if (text.length > 1) {
      words.push({ dir: 'V', start: { x: tile.x, y: startY }, text });
    }
  }

  return words;
}