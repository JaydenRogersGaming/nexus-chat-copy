export type Release = { version: string; date: string; title: string; added: string[]; fixed: string[]; changed: string[] };

/** Newest first. Add a new entry at the top for every update. */
export const CHANGELOG: Release[] = [
  {
    version: '2.5.0', date: 'Oct 30, 2026', title: 'Theater & VIP update',
    added: [
      '🎭 Theater: schedule movies with start and end times, with live viewer counts',
      'Theater chat that stays in sync while everyone watches together',
      'Owner can choose which roles are allowed to start movies (new 🎭 Theater tab in Admin)',
      '👑 VIP members now get 25% off in every shop',
      'VIP renewals now show how long you\'ve been a member in years and months',
    ],
    fixed: [
      'Theater movies no longer restart from the beginning when syncing',
      'Movies now end automatically when their showtime is over',
      'VIP bonus no longer double-boosts game winnings',
      'VIP Lounge is now only open to VIP members',
      'Clearer message when the chat robot can\'t reach its AI service',
    ],
    changed: [
      'Only the host can control Theater playback',
      'VIP pricing is now a one-time unlock plus a monthly price',
    ],
  },
  {
    version: '2.4.0', date: 'Oct 28, 2026', title: 'Ideas & collection update',
    added: ['Version number + this What\'s New panel', 'Idea Generator: "Every part of the site" tab with Add / Change / Delete suggestions', 'Idea Generator remembers past ideas so they don\'t repeat, and lets you mark repeats'],
    fixed: ['Limited collection lag when owning lots of holiday items'],
    changed: ['Limited items are now grouped into one folder per holiday'],
  },
  {
    version: '2.3.0', date: 'Oct 2026', title: 'VIP & translation',
    added: ['VIP membership (1,000 gems / month) with lounge, perks and early access', 'AI VIP style designer', 'Owner-made limited shop items', 'Auto-translate foreign messages to English', 'Browser quick-launch with YouTube and more'],
    fixed: ['Limited shop crashing after owner editor was added'],
    changed: ['Limited items get new names and rarer tiers on every refresh', 'Holiday shop themes and music'],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
