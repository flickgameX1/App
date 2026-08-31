/**
 * The generic starter library. These are the fallback breakdowns; once a user
 * edits a type's steps we store their version in the `breakdowns` table and use
 * that instead (see lib/breakdowns.ts).
 *
 * Step-writing rules: the first step is always trivially small (the hard part is
 * starting), steps are concrete actions, and no template runs past ~7 steps.
 */
export interface Template {
  key: string;
  label: string;
  /** Phrases people actually type. Fuzzy-matched, so near-misses still land. */
  aliases: string[];
  steps: string[];
  /** Rough total minutes of work — seeds the task's estimatedEffort. */
  defaultEffort: number;
  /** Suggested minutes per sprint for this kind of work. */
  sprintLength: number;
}

export const GENERAL_TEMPLATE: Template = {
  key: 'general',
  label: 'Task',
  aliases: [],
  steps: [
    'Write down what "done" looks like',
    'Gather everything you need in one place',
    'Do the smallest first piece',
    'Keep going on the next piece',
    'Tidy up and check it against "done"',
  ],
  defaultEffort: 45,
  sprintLength: 25,
};

export const TEMPLATES: Template[] = [
  {
    key: 'essay',
    label: 'Essay / writing',
    aliases: ['essay', 'write essay', 'paper', 'report', 'assignment', 'dissertation', 'thesis', 'blog post', 'article', 'write up'],
    steps: [
      'Open the doc and paste in the question or brief',
      'Brain-dump every point you already have, messy is fine',
      'Group the dump into 3 or 4 sections',
      'Write the worst possible first paragraph',
      'Fill out each section, no editing yet',
      'Read it once and fix only what is broken',
      'Check formatting and references',
    ],
    defaultEffort: 120,
    sprintLength: 25,
  },
  {
    key: 'clean-room',
    label: 'Clean a room',
    aliases: ['clean room', 'tidy bedroom', 'tidy room', 'clean bedroom', 'declutter', 'clean flat', 'clean house', 'clean apartment', 'tidy up', 'messy room'],
    steps: [
      'Bin bag in hand, collect obvious rubbish only',
      'All dirty clothes into the laundry basket',
      'All dishes and cups out to the kitchen',
      'Clear the floor, everything to a surface',
      'Put away one surface at a time',
      'Quick wipe and vacuum',
    ],
    defaultEffort: 60,
    sprintLength: 20,
  },
  {
    key: 'email',
    label: 'Email / inbox',
    aliases: ['email', 'emails', 'inbox', 'reply to emails', 'answer emails', 'clear inbox', 'messages', 'reply to messages'],
    steps: [
      'Sort the inbox oldest first',
      'Delete and archive anything needing no reply',
      'Answer everything that takes under two minutes',
      'Reply to the one you have been avoiding',
      'Work down the rest until the timer goes',
    ],
    defaultEffort: 30,
    sprintLength: 20,
  },
  {
    key: 'study',
    label: 'Study session',
    aliases: ['study', 'revise', 'revision', 'learn', 'exam prep', 'study session', 'read notes', 'lecture', 'course', 'flashcards'],
    steps: [
      'Put the phone in another room',
      'Pick the one topic for this session',
      'Skim it once without taking notes',
      'Go through it again, writing questions as you go',
      'Answer your own questions from memory',
      'Note the one thing to start with next time',
    ],
    defaultEffort: 90,
    sprintLength: 25,
  },
  {
    key: 'errands',
    label: 'Errands / shopping',
    aliases: ['errands', 'shopping', 'groceries', 'shop', 'supermarket', 'go to the shops', 'buy', 'pick up'],
    steps: [
      'List every stop in one place',
      'Order the stops by route, not importance',
      'Check what you need to bring with you (bags, card, returns)',
      'Get out the door',
      'Work down the list',
      'Put everything away when you get back',
    ],
    defaultEffort: 60,
    sprintLength: 30,
  },
  {
    key: 'dishes',
    label: 'Dishes / kitchen',
    aliases: ['dishes', 'washing up', 'wash up', 'kitchen', 'clean kitchen', 'sink'],
    steps: [
      'Clear one side of the sink',
      'Everything that can soak, goes to soak',
      'Wash glasses and mugs first',
      'Wash plates and cutlery',
      'Pans last',
      'Wipe the counters',
    ],
    defaultEffort: 25,
    sprintLength: 15,
  },
  {
    key: 'laundry',
    label: 'Laundry',
    aliases: ['laundry', 'washing', 'wash clothes', 'fold clothes', 'put washing on'],
    steps: [
      'Gather everything from the floor and the basket',
      'Split into darks and lights',
      'Load, detergent, start it',
      'Set a reminder for when it finishes',
      'Hang or dry it',
      'Fold and put away',
    ],
    defaultEffort: 40,
    sprintLength: 15,
  },
  {
    key: 'admin',
    label: 'Admin / forms',
    aliases: ['admin', 'form', 'paperwork', 'application', 'renew', 'appointment', 'insurance', 'tax', 'bills', 'bank'],
    steps: [
      'Find the form or the page you need',
      'Collect the documents and numbers it will ask for',
      'Fill in everything you can answer without thinking',
      'Deal with the fields you got stuck on',
      'Check it once, submit it',
      'Save the confirmation somewhere you will find it',
    ],
    defaultEffort: 45,
    sprintLength: 20,
  },
  {
    key: 'call',
    label: 'Phone call',
    aliases: ['call', 'phone call', 'ring', 'phone', 'book appointment', 'call back'],
    steps: [
      'Write the one sentence you need to say',
      'Note the details they might ask for',
      'Check their opening hours',
      'Make the call',
      'Write down what was agreed',
    ],
    defaultEffort: 20,
    sprintLength: 15,
  },
  {
    key: 'code',
    label: 'Coding task',
    aliases: ['code', 'coding', 'bug', 'fix bug', 'feature', 'refactor', 'programming', 'ticket', 'pull request', 'debug'],
    steps: [
      'Open the repo and get it running',
      'Reproduce the current behaviour',
      'Write down what the change should do',
      'Make the smallest change that moves it forward',
      'Run the tests',
      'Clean up and commit',
    ],
    defaultEffort: 120,
    sprintLength: 30,
  },
  {
    key: 'exercise',
    label: 'Exercise',
    aliases: ['exercise', 'workout', 'gym', 'run', 'walk', 'training', 'yoga', 'stretch'],
    steps: [
      'Put the kit on',
      'Fill a water bottle',
      'Five minutes of easy warm-up',
      'The main session',
      'Stretch and shower',
    ],
    defaultEffort: 50,
    sprintLength: 30,
  },
  {
    key: 'meal',
    label: 'Cooking / meal prep',
    aliases: ['cook', 'cooking', 'meal prep', 'dinner', 'lunch', 'make food', 'recipe'],
    steps: [
      'Pick the meal and read the recipe through',
      'Check you have everything',
      'Prep and chop it all before turning anything on',
      'Cook it',
      'Eat',
      'Wash up while it is still easy',
    ],
    defaultEffort: 60,
    sprintLength: 25,
  },
  {
    key: 'reading',
    label: 'Reading',
    aliases: ['read', 'reading', 'book', 'chapter', 'paper reading', 'articles'],
    steps: [
      'Phone away, find where you left off',
      'Read one section',
      'Note the one idea worth keeping',
      'Keep going until the timer goes',
      'Bookmark where you stopped',
    ],
    defaultEffort: 45,
    sprintLength: 25,
  },
  {
    key: 'planning',
    label: 'Planning a project',
    aliases: ['plan', 'planning', 'project plan', 'organise', 'organize', 'sort out', 'figure out'],
    steps: [
      'Write the goal in one sentence',
      'Brain-dump everything that needs to happen',
      'Circle the three that unblock the rest',
      'Put a rough date on those three',
      'Pick the very next action',
    ],
    defaultEffort: 45,
    sprintLength: 20,
  },
  {
    key: 'job-application',
    label: 'Job application',
    aliases: ['job application', 'apply for job', 'cv', 'resume', 'cover letter', 'interview prep'],
    steps: [
      'Save the job ad somewhere you can reread it',
      'Pull the three things they most want',
      'Update the CV against those three',
      'Draft the cover letter badly, all in one go',
      'Tidy the letter and proofread both',
      'Submit and log where and when',
    ],
    defaultEffort: 90,
    sprintLength: 25,
  },
];

export const ALL_TEMPLATES: Template[] = [...TEMPLATES, GENERAL_TEMPLATE];

export function templateByKey(key: string): Template {
  return ALL_TEMPLATES.find((t) => t.key === key) ?? GENERAL_TEMPLATE;
}
