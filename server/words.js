const WORDS = {
  animals: ['cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'butterfly', 'snake', 'rabbit', 'owl', 'octopus', 'kangaroo', 'spider', 'turtle', 'lion', 'monkey', 'shark', 'horse', 'frog', 'bee'],
  objects: ['umbrella', 'guitar', 'bicycle', 'clock', 'scissors', 'laptop', 'candle', 'key', 'glasses', 'telescope', 'backpack', 'lamp', 'toothbrush', 'camera', 'balloon', 'ladder', 'bridge', 'crown', 'mirror', 'suitcase'],
  actions: ['swimming', 'sleeping', 'dancing', 'cooking', 'running', 'climbing', 'laughing', 'painting', 'fishing', 'jumping', 'reading', 'singing', 'sneezing', 'skiing', 'driving'],
  food: ['pizza', 'banana', 'burger', 'ice cream', 'sandwich', 'watermelon', 'popcorn', 'cupcake', 'pancake', 'noodles', 'donut', 'cheese', 'carrot', 'coffee', 'egg'],
  nature: ['volcano', 'rainbow', 'mountain', 'waterfall', 'island', 'tornado', 'moon', 'sun', 'cloud', 'snowman', 'cactus', 'forest', 'beach', 'lightning', 'star'],
};

const ALL_WORDS = Object.values(WORDS).flat();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick `count` random words we haven't used yet in this game.
function pickWords(count, customWords = [], used = new Set()) {
  let pool = [...ALL_WORDS, ...customWords].filter((w) => !used.has(w));
  if (pool.length < count) {
    used.clear(); // ran out of words, start over
    pool = [...ALL_WORDS, ...customWords];
  }
  return shuffle(pool).slice(0, count);
}

// "  Ice   CREAM " -> "ice cream"  (so case and extra spaces don't matter)
function normalize(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

// Edit distance = how many single-letter changes to turn a into b.
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// "Close" = exactly one letter away (only for words of 4+ letters)
function isClose(guess, answer) {
  return answer.length >= 4 && levenshtein(guess, answer) === 1;
}

module.exports = { pickWords, normalize, isClose };
