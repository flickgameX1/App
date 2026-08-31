import { ALL_TEMPLATES, GENERAL_TEMPLATE, type Template } from './templates';

/**
 * Fuzzy task-type matching. No AI, no network: normalise the title, expand a
 * small synonym list, then score it against every template's aliases so that
 * "tidy bedroom" and "clean room" land on the same breakdown.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'our', 'his', 'her', 'their', 'your', 'this', 'that', 'these', 'those',
  'to', 'for', 'of', 'in', 'on', 'at', 'up', 'out', 'off', 'and', 'or', 'with', 'from', 'about',
  'do', 'doing', 'does', 'get', 'getting', 'go', 'going', 'make', 'making', 'some', 'all', 'more',
  'need', 'needs', 'must', 'should', 'have', 'has', 'gotta', 'today', 'tomorrow', 'tonight',
  'finish', 'start', 'sort', 'again', 'bit', 'quick', 'quickly', 'please',
]);

/** Words people use interchangeably, folded to one canonical token. */
const SYNONYMS: Record<string, string> = {
  tidy: 'clean',
  tidying: 'clean',
  declutter: 'clean',
  decluttering: 'clean',
  hoover: 'clean',
  vacuum: 'clean',
  bedroom: 'room',
  flat: 'house',
  apartment: 'house',
  place: 'house',
  mail: 'email',
  mails: 'email',
  emails: 'email',
  inbox: 'email',
  msg: 'message',
  msgs: 'message',
  texts: 'message',
  text: 'message',
  revise: 'study',
  revising: 'study',
  revision: 'study',
  studying: 'study',
  learning: 'study',
  learn: 'study',
  homework: 'assignment',
  coursework: 'assignment',
  essays: 'essay',
  writing: 'write',
  wrote: 'write',
  groceries: 'shopping',
  grocery: 'shopping',
  supermarket: 'shopping',
  shops: 'shopping',
  shop: 'shopping',
  errand: 'errands',
  dish: 'dishes',
  washing: 'laundry',
  washer: 'laundry',
  clothes: 'laundry',
  gym: 'exercise',
  workout: 'exercise',
  workouts: 'exercise',
  training: 'exercise',
  jog: 'run',
  jogging: 'run',
  running: 'run',
  cooking: 'cook',
  dinner: 'cook',
  lunch: 'cook',
  breakfast: 'cook',
  recipe: 'cook',
  reading: 'read',
  books: 'book',
  chapters: 'chapter',
  organise: 'plan',
  organize: 'plan',
  planning: 'plan',
  bug: 'code',
  bugs: 'code',
  coding: 'code',
  programming: 'code',
  debug: 'code',
  debugging: 'code',
  refactor: 'code',
  ticket: 'code',
  taxes: 'tax',
  bill: 'bills',
  forms: 'form',
  paperwork: 'form',
  appointments: 'appointment',
  ring: 'call',
  calling: 'call',
  phoning: 'call',
  cv: 'resume',
  interview: 'job',
  jobs: 'job',
};

function normalise(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Light stemming: enough to fold plurals and -ing forms, not a real stemmer. */
function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenise(input: string): string[] {
  const out: string[] = [];
  for (const raw of normalise(input).split(' ')) {
    if (!raw) continue;
    const mapped = SYNONYMS[raw] ?? SYNONYMS[stem(raw)] ?? stem(raw);
    if (STOPWORDS.has(mapped) || mapped.length < 2) continue;
    if (!out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function bigrams(input: string): string[] {
  const s = normalise(input).replace(/ /g, '');
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

/** Sørensen–Dice similarity on character bigrams: catches typos and variants. */
function dice(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (!ga.length || !gb.length) return 0;
  const pool = [...gb];
  let hits = 0;
  for (const g of ga) {
    const at = pool.indexOf(g);
    if (at !== -1) {
      pool.splice(at, 1);
      hits++;
    }
  }
  return (2 * hits) / (ga.length + gb.length);
}

function scoreAgainst(title: string, template: Template): number {
  const titleTokens = tokenise(title);
  if (!titleTokens.length) return 0;
  let best = 0;
  for (const alias of [...template.aliases, template.key.replace(/-/g, ' ')]) {
    const aliasTokens = tokenise(alias);
    if (!aliasTokens.length) continue;
    const shared = aliasTokens.filter((t) => titleTokens.includes(t)).length;
    // How much of the alias the title covers — a short alias fully present is a
    // strong signal ("call" in "call the dentist"), a half-covered one is not.
    const coverage = shared / aliasTokens.length;
    const score = 0.65 * coverage + 0.35 * dice(title, alias);
    if (score > best) best = score;
  }
  return best;
}

export interface Match {
  template: Template;
  confidence: number;
}

const MATCH_THRESHOLD = 0.5;

/** Best-matching template for a free-form task title, or the general fallback. */
export function matchTemplate(title: string): Match {
  let best: Match = { template: GENERAL_TEMPLATE, confidence: 0 };
  for (const template of ALL_TEMPLATES) {
    if (template.key === GENERAL_TEMPLATE.key) continue;
    const confidence = scoreAgainst(title, template);
    if (confidence > best.confidence) best = { template, confidence };
  }
  return best.confidence >= MATCH_THRESHOLD ? best : { template: GENERAL_TEMPLATE, confidence: 0 };
}
