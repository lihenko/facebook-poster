export function randomItem<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Array is empty');
  }

  return items[Math.floor(Math.random() * items.length)];
}

export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}