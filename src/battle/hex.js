/** Pure axial-hex helpers used by battle rules and, later, the canvas renderer. */
export const HEX_DIRECTIONS = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 }),
]);

export function hexKey({ q, r }) {
  return `${q},${r}`;
}

export function sameHex(a, b) {
  return a.q === b.q && a.r === b.r;
}

export function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function hexNeighbors(hex) {
  return HEX_DIRECTIONS.map(({ q, r }) => ({ q: hex.q + q, r: hex.r + r }));
}

export function isInside(board, { q, r }) {
  return q >= 0 && q < board.width && r >= 0 && r < board.height;
}

/**
 * Breadth-first reach on a bounded axial board. Occupied and blocked cells cannot
 * be crossed; the origin is included with cost zero.
 */
export function reachableHexes({ origin, range, board, occupied = [], blocked = [] }) {
  const forbidden = new Set([...occupied, ...blocked].map(hexKey));
  forbidden.delete(hexKey(origin));
  const distances = new Map([[hexKey(origin), 0]]);
  const queue = [origin];

  while (queue.length) {
    const current = queue.shift();
    const distance = distances.get(hexKey(current));
    if (distance >= range) continue;
    for (const neighbor of hexNeighbors(current)) {
      const key = hexKey(neighbor);
      if (!isInside(board, neighbor) || forbidden.has(key) || distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push(neighbor);
    }
  }

  return [...distances].map(([key, distance]) => {
    const [q, r] = key.split(",").map(Number);
    return { q, r, distance };
  });
}
