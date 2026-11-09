/** Title Case for English UI labels, preserving brands and abbreviations. */
const SMALL_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "as", "at", "by", "for",
  "from", "in", "into", "of", "on", "onto", "per", "to", "via", "with",
]);

export function titleCase(text: string): string {
  return text.replace(/\b[A-Za-z][A-Za-z0-9]*\b/g, (word, offset: number) => {
    const startsPhrase = offset === 0 || /[:.!?—]\s*$/.test(text.slice(0, offset));
    if (!startsPhrase && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
    return word[0].toUpperCase() + word.slice(1);
  });
}
