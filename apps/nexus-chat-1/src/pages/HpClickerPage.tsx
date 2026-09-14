import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Heart, Gem, Zap, Trophy, ArrowUp, ChevronDown, ChevronUp, Crown, Infinity, RotateCcw, Star, Timer } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useApp } from '../contexts/AppContext';
import { isOwnerEmail } from '../lib/gameData';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

const PIXEL_HEART = [
  [0,0,1,1,0,0,0,1,1,0,0],
  [0,1,1,1,1,0,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,0,0,0],
];

const MAX_LEVEL = 1000000;

type FloatingText = { id: number; x: number; y: number; value: number };
type UpgradesMap = Record<string, number>;
type FloatingHeart = { id: number; x: number; color: string; emoji: string; boostType: string; boostLabel: string };
type ActiveBoost = { type: string; label: string; color: string; expiresAt: number };

type UpgradeDef = {
  key: string; name: string; icon: string; category: string;
  baseCost: number; costMult: number; perLevel: number;
  format: (lvl: number, per: number) => string;
};

// ── Build upgrade tree (removed Lucky Drops, Shield, Shadow, Elemental) ──
function buildUpgrades(): UpgradeDef[] {
  const ups: UpgradeDef[] = [];
  const make = (cat: string, icon: string, names: string[], baseCost: number, costGrowth: number, costMult: number, perBase: number, fmt: (l: number, p: number) => string) => {
    names.forEach((n, i) => {
      ups.push({ key: `${cat.toLowerCase().replace(/\s/g,'')}_${i}`, name: n, icon, category: cat, baseCost: Math.floor(baseCost * Math.pow(costGrowth, i)), costMult, perLevel: perBase * (i + 1), format: fmt });
    });
  };

  make('Click Power', '👆', [
    'Finger Strength','Iron Finger','Steel Tap','Power Click','Mega Click','Ultra Click','Hyper Click',
    'Super Click','Titan Click','God Click','Divine Tap','Celestial Click','Cosmic Click','Galaxy Click',
    'Universe Click','Multiverse Click','Omega Click','Infinity Click','Transcend Click','Supreme Click',
    'Atomic Tap','Quantum Click','Plasma Click','Neutron Click','Photon Click','Dark Matter Click',
    'Antimatter Click','Singularity Click','Big Bang Click','Eternal Click',
  ], 30, 2.2, 1.4, 2, (l, p) => `+${l * p} HP/click`);

  make('Auto Clicker', '🤖', [
    'Tiny Bot','Mini Bot','Small Bot','Medium Bot','Large Bot','Mega Bot','Ultra Bot','Hyper Bot',
    'Super Bot','Titan Bot','God Bot','Divine Bot','Celestial Bot','Cosmic Bot','Galaxy Bot',
    'Quantum Bot','Plasma Bot','Neutron Bot','Photon Bot','Dark Bot',
    'Aether Bot','Chrono Bot','Infinity Bot',
  ], 150, 2.5, 1.6, 3, (l, p) => `+${l * p} HP/sec`);

  make('Multi Click', '✨', [
    'Lucky Tap','Double Chance','Triple Threat','Quad Strike','Penta Hit','Hexa Blow','Septa Strike',
    'Octa Slam','Nona Crush','Deca Smash','Rapid Multi','Chain Multi','Storm Multi','Tempest Multi',
    'Hurricane Multi','Cyclone Multi','Vortex Multi','Maelstrom Multi','Cataclysm Multi','Apocalypse Multi',
  ], 200, 2.4, 1.5, 2, (l, p) => `+${l * p}% 2x`);

  make('Critical Hit', '⚡', [
    'Sharp Eye','Keen Sight','Eagle Eye','Hawk Vision','Sniper Focus','Critical Mass','Lethal Precision',
    'Fatal Strike','Death Touch','Annihilate','Piercing Gaze','Killer Instinct','Assassin Eye',
    'Phantom Strike','Omega Crit','Infinity Crit','Transcend Crit','Supreme Crit',
  ], 500, 2.6, 1.6, 1, (l, p) => `+${l * p}% crit`);

  make('Gem Bonus', '💎', [
    'Gem Finder','Gem Miner','Gem Digger','Gem Expert','Gem Master','Gem Lord','Gem King','Gem Emperor',
    'Gem God','Gem Titan','Gem Seeker','Gem Hunter','Gem Collector','Gem Hoarder','Gem Magnate',
    'Gem Baron','Gem Tycoon','Gem Overlord','Gem Sovereign','Gem Almighty',
  ], 400, 2.5, 1.7, 2, (l, p) => `+${l * p} gems/100`);

  make('Multiplier', '🔥', [
    'Warm Up','Momentum','Acceleration','Overdrive','Turbo','Nitro','Blaze','Inferno','Supernova',
    'Big Bang','Hyper Drive','Warp Speed','Ludicrous Speed','Plaid Speed','Light Speed','Dark Energy',
    'Quantum Flux','Plasma Surge','Neutron Burst','Photon Wave',
  ], 800, 3, 1.8, 1, (l, p) => `x${(1 + l * p * 0.1).toFixed(1)}`);

  make('Combo', '🌀', [
    'Quick Hands','Fast Fingers','Rapid Fire','Blitz Mode','Storm Click','Thunder Click','Lightning Click',
    'Tempest Click','Hurricane Click','Tornado Click','Combo King','Chain Master','Rush Lord',
    'Frenzy Mode','Rampage Mode','Berserk Mode','Ultra Frenzy','Mega Rush','Giga Combo','Tera Combo',
  ], 400, 2.3, 1.5, 3, (l, p) => `+${l * p}% combo`);

  make('Time Warp', '⏰', [
    'Time Skip','Time Hop','Time Leap','Time Jump','Time Warp','Chrono Shift','Temporal Rift',
    'Time Dilation','Chrono Surge','Time Storm','Epoch Shift','Era Warp','Aeon Skip',
    'Eternity Pulse','Infinity Loop',
  ], 1000, 3, 1.9, 4, (l, p) => `+${l * p}% speed`);

  make('Celestial', '⭐', [
    'Starlight','Moonbeam','Sunburst','Comet Tail','Aurora Flash','Constellation Power',
    'Zodiac Force','Galaxy Pulse','Nebula Core','Supernova Heart',
  ], 2000, 3.5, 2.1, 8, (l, p) => `+${l * p}% celestial`);

  return ups;
}

const ALL_UPGRADES = buildUpgrades();
const CATEGORIES = [...new Set(ALL_UPGRADES.map(u => u.category))];

function getCost(baseCost: number, mult: number, level: number) {
  return Math.floor(baseCost * Math.pow(mult, level));
}

// Heart boost definitions
const HEART_BOOSTS = [
  { color: '#ff4444', emoji: '❤️', type: 'click', label: '+50% HP/click' },
  { color: '#ffd700', emoji: '💛', type: 'gems', label: '+100% gems' },
  { color: '#44ff44', emoji: '💚', type: 'auto', label: '+50% auto HP' },
  { color: '#4488ff', emoji: '💙', type: 'crit', label: '+25% crit' },
  { color: '#aa44ff', emoji: '💜', type: 'mult', label: 'x2 multiplier' },
];

type SaveData = {
  hp?: number; totalClicks?: number; upgrades?: UpgradesMap;
  prestige?: number; godPrestige?: number;
  activeBoosts?: ActiveBoost[];
};

function loadSave(): SaveData {
  try { const s = localStorage.getItem('hub:hpclicker'); if (s) return JSON.parse(s); } catch {} return {};
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function HpClickerPage() {
  const { profile, addGems } = useApp();
  const isOwner = profile && (isOwnerEmail(profile.email) || profile.role === 'owner');
  const [hp, setHp] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradesMap>({});
  const [prestige, setPrestige] = useState(0);
  const [godPrestige, setGodPrestige] = useState(0);
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [scale, setScale] = useState(1);
  const [hue, setHue] = useState(0);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([]);
  const floatId = useRef(0);
  const heartId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load save
  useEffect(() => {
    const d = loadSave();
    setHp(d.hp || 0);
    setTotalClicks(d.totalClicks || 0);
    if (d.upgrades) setUpgrades(d.upgrades);
    setPrestige(d.prestige || 0);
    setGodPrestige(d.godPrestige || 0);
    if (d.activeBoosts) setActiveBoosts(d.activeBoosts.filter(b => b.expiresAt > Date.now()));
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('hub:hpclicker', JSON.stringify({ hp, totalClicks, upgrades, prestige, godPrestige, activeBoosts }));
  }, [hp, totalClicks, upgrades, prestige, godPrestige, activeBoosts]);

  // Hue animation
  useEffect(() => { const t = setInterval(() => setHue(h => (h + 1) % 360), 50); return () => clearInterval(t); }, []);

  // Float cleanup
  useEffect(() => { if (floats.length === 0) return; const t = setTimeout(() => setFloats(f => f.slice(1)), 800); return () => clearTimeout(t); }, [floats]);

  // Spawn floating hearts randomly
  useEffect(() => {
    const t = setInterval(() => {
      const boost = HEART_BOOSTS[Math.floor(Math.random() * HEART_BOOSTS.length)];
      setFloatingHearts(prev => [...prev, { id: heartId.current++, x: 10 + Math.random() * 80, color: boost.color, emoji: boost.emoji, boostType: boost.type, boostLabel: boost.label }]);
    }, 8000 + Math.random() * 7000);
    return () => clearInterval(t);
  }, []);

  // Remove floating hearts after animation
  useEffect(() => {
    if (floatingHearts.length === 0) return;
    const t = setTimeout(() => setFloatingHearts(h => h.slice(1)), 5000);
    return () => clearTimeout(t);
  }, [floatingHearts]);

  // Tick active boosts countdown
  useEffect(() => {
    const t = setInterval(() => {
      setActiveBoosts(prev => prev.filter(b => b.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const bonuses = useMemo(() => {
    let clickPower = 1, autoHP = 0, multiChance = 0, gemBonus = 0, critChance = 0, hpMult = 1, comboBonus = 0;
    for (const u of ALL_UPGRADES) {
      const lvl = upgrades[u.key] || 0;
      if (lvl === 0) continue;
      const val = lvl * u.perLevel;
      if (u.category === 'Click Power') clickPower += val;
      else if (u.category === 'Auto Clicker') autoHP += val;
      else if (u.category === 'Multi Click') multiChance += val;
      else if (u.category === 'Gem Bonus') gemBonus += val;
      else if (u.category === 'Critical Hit') critChance += val;
      else if (u.category === 'Multiplier') hpMult += val * 0.1;
      else if (u.category === 'Combo') comboBonus += val;
      else clickPower += val;
    }
    // Prestige bonus: +10% per prestige
    hpMult *= (1 + prestige * 0.1);
    // God Prestige bonus: x2 per god prestige
    hpMult *= Math.pow(2, godPrestige);
    // Active boosts
    for (const b of activeBoosts) {
      if (b.type === 'click') clickPower = Math.floor(clickPower * 1.5);
      if (b.type === 'auto') autoHP = Math.floor(autoHP * 1.5);
      if (b.type === 'crit') critChance += 25;
      if (b.type === 'mult') hpMult *= 2;
      if (b.type === 'gems') gemBonus += gemBonus;
    }
    return { clickPower, autoHP, multiChance: Math.min(multiChance, 95), gemBonus, critChance: Math.min(critChance, 80), hpMult, comboBonus };
  }, [upgrades, prestige, godPrestige, activeBoosts]);

  // Auto HP
  useEffect(() => {
    if (bonuses.autoHP <= 0) return;
    const t = setInterval(() => setHp(prev => prev + Math.floor(bonuses.autoHP * bonuses.hpMult)), 1000);
    return () => clearInterval(t);
  }, [bonuses.autoHP, bonuses.hpMult]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : 100;
    const y = rect ? e.clientY - rect.top : 100;
    let value = bonuses.clickPower;
    if (Math.random() * 100 < bonuses.multiChance) value *= 2;
    if (Math.random() * 100 < bonuses.critChance) value *= 5;
    value = Math.floor(value * bonuses.hpMult * (1 + bonuses.comboBonus / 100));
    setHp(prev => prev + value);
    setTotalClicks(prev => prev + 1);
    setFloats(prev => [...prev, { id: floatId.current++, x, y, value }]);
    setScale(0.9);
    setTimeout(() => setScale(1), 100);
    if ((totalClicks + 1) % 100 === 0 && profile) {
      const gemReward = 5 + bonuses.gemBonus;
      addGems(gemReward);
      toast.success(`💎 +${gemReward} gems for 100 clicks!`);
    }
  }, [totalClicks, profile, addGems, bonuses]);

  function buyUpgrade(key: string, baseCost: number, costMult: number) {
    const level = upgrades[key] || 0;
    if (level >= MAX_LEVEL) { toast.error(`Max level (${MAX_LEVEL.toLocaleString()}) reached!`); return; }
    const cost = getCost(baseCost, costMult, level);
    if (hp < cost) { toast.error(`Need ${cost.toLocaleString()} HP!`); return; }
    setHp(prev => prev - cost);
    setUpgrades(prev => ({ ...prev, [key]: Math.min((prev[key] || 0) + 1, MAX_LEVEL) }));
    toast.success('⬆️ Upgraded!');
  }

  function doPrestige() {
    if (hp < 100000) { toast.error('Need 100K HP to prestige!'); return; }
    setHp(0);
    setUpgrades({});
    setTotalClicks(0);
    setPrestige(p => p + 1);
    toast.success(`🔄 Prestige ${prestige + 1}! +10% boost to all HP gains!`);
  }

  function doGodPrestige() {
    if (prestige < 10) { toast.error('Need 10 prestiges for God Prestige!'); return; }
    setHp(0);
    setUpgrades({});
    setTotalClicks(0);
    setPrestige(0);
    setGodPrestige(g => g + 1);
    toast.success(`⚡ GOD PRESTIGE ${godPrestige + 1}! x2 multiplier to EVERYTHING!`);
  }

  function catchHeart(h: FloatingHeart) {
    setFloatingHearts(prev => prev.filter(fh => fh.id !== h.id));
    const boost: ActiveBoost = { type: h.boostType, label: h.boostLabel, color: h.color, expiresAt: Date.now() + 10 * 60 * 1000 };
    setActiveBoosts(prev => {
      const filtered = prev.filter(b => b.type !== h.boostType);
      return [...filtered, boost];
    });
    toast.success(`${h.emoji} ${h.boostLabel} for 10 minutes!`);
  }

  const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  const nextMilestone = milestones.find(m => m > hp) || hp + 1000000;
  const progress = Math.min(100, (hp / nextMilestone) * 100);
  const totalUpgradeLevels = Object.values(upgrades).reduce((a, b) => a + b, 0);
  const filteredUpgrades = ALL_UPGRADES.filter(u => u.category === activeCategory);
  const canPrestige = hp >= 100000;
  const canGodPrestige = prestige >= 10;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 h-full overflow-y-auto relative">
      {/* Floating Hearts */}
      {floatingHearts.map(h => (
        <button key={h.id} onClick={() => catchHeart(h)}
          className="absolute z-30 text-2xl animate-bounce cursor-pointer hover:scale-150 transition-transform"
          style={{ left: `${h.x}%`, animation: 'floatUp 5s ease-out forwards', filter: `drop-shadow(0 0 8px ${h.color})` }}>
          {h.emoji}
        </button>
      ))}

      <div className="text-center mb-4">
        <h1 className="text-2xl font-black flex items-center justify-center gap-2">
          <Heart className="w-7 h-7 text-destructive fill-current" /> HP Clicker
        </h1>
        <p className="text-muted-foreground text-sm">
          {ALL_UPGRADES.length} upgrades — max level {MAX_LEVEL.toLocaleString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <StatBox icon={<Heart className="w-4 h-4 text-destructive" />} value={hp >= 999999999 ? '∞' : hp.toLocaleString()} label="HP" />
        <StatBox icon={<Zap className="w-4 h-4 text-yellow-400" />} value={totalClicks >= 999999999 ? '∞' : totalClicks.toLocaleString()} label="Clicks" />
        <StatBox icon={<ArrowUp className="w-4 h-4 text-primary" />} value={totalUpgradeLevels.toLocaleString()} label="Levels" />
        <StatBox icon={<RotateCcw className="w-4 h-4 text-cyan-400" />} value={prestige >= 999999999 ? '∞' : String(prestige)} label="Prestige" />
        <StatBox icon={<Star className="w-4 h-4 text-yellow-400" />} value={godPrestige >= 999999999 ? '∞' : String(godPrestige)} label="God P." />
        <StatBox icon={<Gem className="w-4 h-4 text-purple-400" />} value={profile?.gems && profile.gems >= 999999999 ? '∞' : (profile?.gems || 0).toLocaleString()} label="Gems" />
      </div>

      {/* Active Boosts with countdown */}
      {activeBoosts.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mb-3">
          {activeBoosts.map(b => (
            <span key={b.type} className="text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: b.color + '20', color: b.color, border: `1px solid ${b.color}40` }}>
              <Timer className="w-2.5 h-2.5" />
              {b.label} — {formatTime(b.expiresAt - Date.now())}
            </span>
          ))}
        </div>
      )}

      {/* Owner Cheats */}
      {isOwner && (
        <div className="bg-card border-2 border-yellow-500/40 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">Owner Cheats</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => { setHp(999999999); toast.success('∞ HP!'); }}>∞ HP</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => { setTotalClicks(999999999); toast.success('∞ Clicks!'); }}>∞ Clicks</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => { setPrestige(999999999); toast.success('∞ Prestige!'); }}>∞ Prestige</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8 text-yellow-400 border-yellow-400/40" onClick={() => { setGodPrestige(999999999); toast.success('⚡ ∞ God Prestige!'); }}>∞ God P.</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8 text-purple-400 border-purple-400/40" onClick={() => {
              if (!profile) return;
              DB.saveUser({ ...profile, gems: 999999999 });
              addGems(999999999 - profile.gems);
              toast.success('♾️ ∞ Gems!');
            }}>∞ 💎</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => {
              const maxed: UpgradesMap = {};
              ALL_UPGRADES.forEach(u => { maxed[u.key] = MAX_LEVEL; });
              setUpgrades(maxed);
              toast.success(`All maxed to ${MAX_LEVEL.toLocaleString()}!`);
            }}>Max All ⬆️</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => { setHp(p => p + 1000000); toast.success('+1M HP!'); }}>+1M HP</Button>
            <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => { addGems(100000); toast.success('💎 +100K!'); }}>+100K 💎</Button>
          </div>
        </div>
      )}

      {/* Prestige Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={doPrestige} disabled={!canPrestige}
          className={`p-3 rounded-xl border-2 text-left transition-all ${canPrestige ? 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer' : 'border-border opacity-40 cursor-not-allowed'}`}>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-sm font-bold text-cyan-400">Prestige</p>
              <p className="text-[10px] text-muted-foreground">Reset for +10% boost</p>
              <p className="text-[9px] text-muted-foreground">Requires 100K HP</p>
            </div>
          </div>
        </button>
        <button onClick={doGodPrestige} disabled={!canGodPrestige}
          className={`p-3 rounded-xl border-2 text-left transition-all ${canGodPrestige ? 'border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 cursor-pointer' : 'border-border opacity-40 cursor-not-allowed'}`}>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm font-bold text-yellow-400">God Prestige</p>
              <p className="text-[10px] text-muted-foreground">Reset for x2 mult</p>
              <p className="text-[9px] text-muted-foreground">Requires 10 prestiges</p>
            </div>
          </div>
        </button>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-2.5 mb-4">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-muted-foreground flex items-center gap-1"><Trophy className="w-3 h-3" />Milestone</span>
          <span className="font-bold">{hp.toLocaleString()} / {nextMilestone.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-destructive rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Active bonuses */}
      <div className="flex flex-wrap gap-1 justify-center mb-3">
        {bonuses.clickPower > 1 && <span className="text-[9px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded-full">{bonuses.clickPower} HP/click</span>}
        {bonuses.autoHP > 0 && <span className="text-[9px] bg-green-500/20 text-green-400 font-bold px-1.5 py-0.5 rounded-full">{Math.floor(bonuses.autoHP * bonuses.hpMult)} HP/sec</span>}
        {bonuses.multiChance > 0 && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.5 rounded-full">{bonuses.multiChance}% 2x</span>}
        {bonuses.critChance > 0 && <span className="text-[9px] bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded-full">{bonuses.critChance}% crit</span>}
        {bonuses.hpMult > 1 && <span className="text-[9px] bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded-full">x{bonuses.hpMult.toFixed(1)}</span>}
        {prestige > 0 && <span className="text-[9px] bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded-full">P{prestige >= 999999999 ? '∞' : prestige}</span>}
        {godPrestige > 0 && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.5 rounded-full">GP{godPrestige >= 999999999 ? '∞' : godPrestige}</span>}
      </div>

      {/* Pixel Heart */}
      <div ref={containerRef} className="relative flex items-center justify-center py-4 select-none cursor-pointer" onClick={handleClick}>
        <div className="transition-transform duration-100" style={{ transform: `scale(${scale})` }}>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(11, 1fr)' }}>
            {PIXEL_HEART.flatMap((row, ry) =>
              row.map((cell, cx) => (
                <div key={`${ry}-${cx}`} className="w-5 h-5 sm:w-6 sm:h-6 rounded-sm"
                  style={{
                    backgroundColor: cell ? `hsl(${(hue + ry * 10 + cx * 5) % 360}, 80%, 55%)` : 'transparent',
                    boxShadow: cell ? `0 0 8px hsl(${(hue + ry * 10) % 360}, 80%, 55%)` : 'none',
                  }} />
              ))
            )}
          </div>
        </div>
        {floats.map(f => (
          <span key={f.id} className="absolute font-black text-lg pointer-events-none animate-float-up"
            style={{ left: f.x, top: f.y, color: f.value >= 50 ? '#ffd700' : '#ff6b6b' }}>
            +{f.value.toLocaleString()}
          </span>
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground mb-1">Every 100 clicks = 💎 {5 + bonuses.gemBonus} gems</p>
      <p className="text-center text-[10px] text-muted-foreground mb-4">Catch floating hearts for 10-minute boosts! ❤️💛💚💙💜</p>

      {/* Upgrades */}
      <Button variant="outline" className="w-full mb-3" onClick={() => setShowUpgrades(!showUpgrades)}>
        {showUpgrades ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
        {showUpgrades ? 'Hide' : 'Show'} Upgrades ({ALL_UPGRADES.length} × {MAX_LEVEL.toLocaleString()})
      </Button>

      {showUpgrades && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => {
              const catUps = ALL_UPGRADES.filter(u => u.category === cat);
              const catLevels = catUps.reduce((s, u) => s + (upgrades[u.key] || 0), 0);
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${activeCategory === cat ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                  {cat} {catLevels > 0 && <span className="text-[8px] opacity-70">({catLevels})</span>}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredUpgrades.map(u => {
              const level = upgrades[u.key] || 0;
              const maxed = level >= MAX_LEVEL;
              const cost = maxed ? 0 : getCost(u.baseCost, u.costMult, level);
              return (
                <button key={u.key} onClick={() => !maxed && buyUpgrade(u.key, u.baseCost, u.costMult)}
                  disabled={maxed || hp < cost}
                  className="bg-card border border-border rounded-xl p-2.5 text-left hover:bg-secondary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{u.icon}</span>
                    <span className="text-[11px] font-bold truncate">{u.name}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-primary mt-0.5">{u.format(level, u.perLevel)}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">Lv.{level.toLocaleString()} / {MAX_LEVEL.toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-destructive">{maxed ? 'MAXED' : `♥${cost.toLocaleString()}`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Heart float-up animation */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(1); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(-20vh) scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-2 text-center">
      <div className="mx-auto mb-0.5 flex justify-center">{icon}</div>
      <p className="text-xs font-black truncate">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
