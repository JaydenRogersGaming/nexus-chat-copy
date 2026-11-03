import * as DB from './storage';

export type BadgeDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (p: DB.UserProfile) => boolean;
};

export const BADGE_DEFS: BadgeDef[] = [
  // Message badges
  { id: 'msg_1',     name: 'First Words',     icon: '💬', description: 'Send 1 message',         check: p => p.messageCount >= 1 },
  { id: 'msg_10',    name: 'Chatter',         icon: '🗣️', description: 'Send 10 messages',        check: p => p.messageCount >= 10 },
  { id: 'msg_50',    name: 'Talkative',       icon: '📢', description: 'Send 50 messages',        check: p => p.messageCount >= 50 },
  { id: 'msg_100',   name: 'Chataholic',      icon: '🎙️', description: 'Send 100 messages',       check: p => p.messageCount >= 100 },
  { id: 'msg_500',   name: 'Social Star',     icon: '⭐', description: 'Send 500 messages',       check: p => p.messageCount >= 500 },
  { id: 'msg_1000',  name: 'Chat Legend',     icon: '👑', description: 'Send 1,000 messages',     check: p => p.messageCount >= 1000 },
  { id: 'msg_5000',  name: 'Endless Talker',  icon: '🌊', description: 'Send 5,000 messages',     check: p => p.messageCount >= 5000 },

  // Gem badges
  { id: 'gem_100',    name: 'Gem Starter',     icon: '💎', description: 'Collect 100 gems',        check: p => p.gems >= 100 },
  { id: 'gem_500',    name: 'Gem Collector',   icon: '💍', description: 'Collect 500 gems',        check: p => p.gems >= 500 },
  { id: 'gem_1000',   name: 'Gem Hoarder',    icon: '🏦', description: 'Collect 1,000 gems',      check: p => p.gems >= 1000 },
  { id: 'gem_5000',   name: 'Gem Lord',       icon: '🤑', description: 'Collect 5,000 gems',      check: p => p.gems >= 5000 },
  { id: 'gem_10000',  name: 'Diamond Hands',  icon: '💰', description: 'Collect 10,000 gems',     check: p => p.gems >= 10000 },
  { id: 'gem_50000',  name: 'Gem Emperor',    icon: '👸', description: 'Collect 50,000 gems',     check: p => p.gems >= 50000 },
  { id: 'gem_100000', name: 'Gem God',        icon: '🏆', description: 'Collect 100,000 gems',    check: p => p.gems >= 100000 },

  // Gamble badges
  { id: 'gam_1',     name: 'First Bet',       icon: '🎲', description: 'Gamble once',             check: p => p.gambleCount >= 1 },
  { id: 'gam_10',    name: 'Gambler',         icon: '🎰', description: 'Gamble 10 times',         check: p => p.gambleCount >= 10 },
  { id: 'gam_50',    name: 'High Roller',     icon: '🃏', description: 'Gamble 50 times',         check: p => p.gambleCount >= 50 },
  { id: 'gam_100',   name: 'Casino VIP',      icon: '♠️', description: 'Gamble 100 times',        check: p => p.gambleCount >= 100 },
  { id: 'gam_w1',    name: 'Lucky',           icon: '🍀', description: 'Win 1 gamble',            check: p => p.gambleWins >= 1 },
  { id: 'gam_w10',   name: 'Winner',          icon: '🏅', description: 'Win 10 gambles',          check: p => p.gambleWins >= 10 },
  { id: 'gam_w50',   name: 'Jackpot King',    icon: '💵', description: 'Win 50 gambles',          check: p => p.gambleWins >= 50 },
  { id: 'gam_l5',    name: 'Unlucky',         icon: '😢', description: 'Lose 5 in a row',         check: p => p.gambleLoseStreak >= 5 },
  { id: 'gam_l10',   name: 'Cursed',          icon: '💀', description: 'Lose 10 in a row',        check: p => p.gambleLoseStreak >= 10 },

  // Social badges
  { id: 'dm_1',      name: 'First DM',        icon: '📩', description: 'Send a DM',               check: p => p.dmCount >= 1 },
  { id: 'dm_50',     name: 'Social Butterfly',icon: '🦋', description: 'Send 50 DMs',             check: p => p.dmCount >= 50 },
  { id: 'react_5',   name: 'Reactor',         icon: '😄', description: 'React 5 times',           check: p => p.reactionCount >= 5 },
  { id: 'react_50',  name: 'Emoji Lover',     icon: '🤩', description: 'React 50 times',          check: p => p.reactionCount >= 50 },
  { id: 'react_200', name: 'Emoji Master',    icon: '🎭', description: 'React 200 times',         check: p => p.reactionCount >= 200 },
  { id: 'grp_1',     name: 'Group Creator',   icon: '👥', description: 'Create a group',          check: p => p.groupCount >= 1 },
  { id: 'bug_1',     name: 'Bug Hunter',      icon: '🐛', description: 'Report a bug',            check: p => p.bugCount >= 1 },
  { id: 'sug_1',     name: 'Visionary',       icon: '💡', description: 'Submit a suggestion',     check: p => p.suggestionCount >= 1 },
  { id: 'voice_1',   name: 'Voice Active',    icon: '🎤', description: 'Join voice chat',         check: p => p.voiceJoined },

  // Night owl
  { id: 'night',     name: 'Night Owl',       icon: '🦉', description: 'Active after midnight',   check: () => { const h = new Date().getHours(); return h >= 0 && h < 4; } },

  // Role badges
  { id: 'role_mod',   name: 'Moderator',      icon: '🛡️', description: 'Be a mod',                check: p => ['mod','admin','co-owner','owner'].includes(p.role) },
  { id: 'role_admin', name: 'Administrator',  icon: '⚔️', description: 'Be an admin',             check: p => ['admin','co-owner','owner'].includes(p.role) },
  { id: 'role_own',   name: 'Owner',          icon: '👑', description: 'Be the owner',            check: p => p.role === 'owner' },
];

/** Check and award new badges for a user. Returns newly earned badge ids. */
export function checkBadges(email: string): string[] {
  const user = DB.getUser(email);
  if (!user) return [];
  const current = user.badges || [];
  const newBadges: string[] = [];
  for (const badge of BADGE_DEFS) {
    if (current.includes(badge.id)) continue;
    if (badge.check(user)) {
      newBadges.push(badge.id);
    }
  }
  if (newBadges.length > 0) {
    DB.saveUser({ ...user, badges: [...current, ...newBadges] });
  }
  return newBadges;
}
