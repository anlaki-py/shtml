const SLUG_LENGTH = 6;

const SLUG_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function createSlug(random: () => number = Math.random): string {
  let slug = "";

  for (let index = 0; index < SLUG_LENGTH; index += 1) {
    const value = random();
    if (value < 0 || value >= 1) {
      throw new Error("The random source must return a value from 0 up to 1.");
    }
    const character = SLUG_ALPHABET.at(
      Math.floor(value * SLUG_ALPHABET.length),
    );
    if (character === undefined) {
      throw new Error("The random source produced an invalid slug character.");
    }
    slug += character;
  }

  return slug;
}

export function isSlug(value: string): boolean {
  return /^[0-9A-Za-z]{6}$/.test(value);
}
