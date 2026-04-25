// Nettoyage auto si token invalide
// ===== CONFIG =====
const SESSION_KEY = 'caca-session-v1'; // doit être défini AVANT le nettoyage

// Nettoyage auto si token invalide
if (localStorage.getItem(SESSION_KEY)) {
  try {
    const t = localStorage.getItem(SESSION_KEY);
    const payload = JSON.parse(atob(t.split('.')[1]));
    if (!payload.username) throw new Error();
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ===== Caca Simulator (avec prestige + comptes) =====
// ===== API configuration =====
const PROD_BACKEND_URL = "https://caca-simulator-backend.onrender.com/api";

const API_BASE = (() => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return PROD_BACKEND_URL;
  }
  return 'http://localhost:3000/api';
})();

const SAVE_PREFIX = 'caca-sim-save-v2:';
let CURRENT_USER = null;
let AUTH_TOKEN = null;

function saveKey() { return SAVE_PREFIX + (CURRENT_USER || '__guest__'); }

// ===== API Helper =====
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    let data = null;

try {
  data = await response.json();
} catch {
  // Si ce n'est pas du JSON, on récupère le texte brut
  const text = await response.text();
  throw new Error(text);
}

if (!response.ok) {
  throw new Error(data.error || 'Erreur API');
}

return data;
  } catch (error) {
    throw error;
  }
}

// ===== Account management =====
async function signup(username, password) {
  const data = await apiCall('/auth/signup', 'POST', { username, password });
  AUTH_TOKEN = data.token;
  localStorage.setItem(SESSION_KEY, data.token);
  return data.username;
}
async function login(username, password) {
  const data = await apiCall('/auth/login', 'POST', { username, password });
  AUTH_TOKEN = data.token;
  localStorage.setItem(SESSION_KEY, data.token);
  return data.username;
}
function logout() {
  if (typeof save === 'function') save();
  localStorage.removeItem(SESSION_KEY);
  AUTH_TOKEN = null;
  CURRENT_USER = null;
  location.reload();
}

// ===== Event system (backend) =====
let cachedActiveEvents = null;
async function fetchActiveEvents() {
  try {
    const data = await apiCall('/event');
    cachedActiveEvents = data.activeEvents || {};
    return cachedActiveEvents;
  } catch(e) {
    console.error('Fetch events error:', e);
    return cachedActiveEvents || {};
  }
}
async function toggleBackendEvent(eventId, active) {
  try {
    await apiCall('/event', 'POST', { eventId, active });
    cachedActiveEvents = await fetchActiveEvents();
    return true;
  } catch(e) {
    console.error('Toggle event error:', e);
    toast('Erreur lors de l\'activation de l\'événement');
    return false;
  }
}
async function clearBackendEvents() {
  try {
    await apiCall('/event/clear', 'POST');
    cachedActiveEvents = {};
    return true;
  } catch(e) {
    console.error('Clear events error:', e);
    toast('Erreur lors de la désactivation des événements');
    return false;
  }
}
function getActiveEvents() {
  return cachedActiveEvents || {};
}
function isEventOn(id) { return !!getActiveEvents()[id]; }
function activeEventsOfType(type) {
  const ev = getActiveEvents();
  return ADMIN_EVENTS.filter(e => e.type === type && ev[e.id]);
}

// ===== Announcement system (backend) =====
let cachedAnnouncement = null;
async function fetchAnnouncement() {
  try {
    const data = await apiCall('/announcement');
    cachedAnnouncement = data.announcement || null;
    return cachedAnnouncement;
  } catch(e) {
    console.error('Fetch announcement error:', e);
    return cachedAnnouncement || null;
  }
}
async function setAnnouncement(text) {
  try {
    await apiCall('/announcement', 'POST', { text });
    cachedAnnouncement = await fetchAnnouncement();
    return true;
  } catch(e) {
    console.error('Set announcement error:', e);
    toast('Erreur lors de la publication de l\'annonce');
    return false;
  }
}
async function clearAnnouncement() {
  try {
    await apiCall('/announcement', 'POST', { text: null });
    cachedAnnouncement = null;
    return true;
  } catch(e) {
    console.error('Clear announcement error:', e);
    toast('Erreur lors de la suppression de l\'annonce');
    return false;
  }
}

const TOILETS = [
  { id:'wc_basic',    name:'WC de base',           icon:'🚽', desc:'Une simple cuvette.',                 baseCost:15,        pps:0.2 },
  { id:'wc_public',   name:'WC public',            icon:'🏛️', desc:'Forte affluence garantie.',           baseCost:120,       pps:1.5 },
  { id:'wc_japanese', name:'WC japonais',          icon:'🛁', desc:'High-tech, très efficace.',           baseCost:1100,      pps:9 },
  { id:'wc_gold',     name:'Trône en or',          icon:'👑', desc:'Le luxe pour des cacas royaux.',      baseCost:12000,     pps:55 },
  { id:'wc_lab',      name:'Labo intestinal',      icon:'🧪', desc:'Production scientifique.',            baseCost:130000,    pps:300 },
  { id:'wc_factory',  name:'Usine à caca',         icon:'🏭', desc:'Industrialisation totale.',           baseCost:1.4e6,     pps:1700 },
  { id:'wc_space',    name:'Toilettes spatiales',  icon:'🚀', desc:'Caca en apesanteur.',                 baseCost:2e7,       pps:9000 },
  { id:'wc_dimension',name:'Portail dimensionnel', icon:'🌀', desc:'Caca de mondes parallèles.',          baseCost:3.3e8,     pps:55000 },
  { id:'wc_dragon',   name:'Dragon constipé',      icon:'🐉', desc:'Caca enflammé, très précieux.',       baseCost:5.1e9,     pps:340000 },
  { id:'wc_blackhole',name:'Trou noir digestif',   icon:'🕳️', desc:'Aspire et compresse la matière.',     baseCost:7.5e10,    pps:2.1e6 },
  { id:'wc_god',      name:'Trône divin',          icon:'⚡', desc:'Caca béni des dieux.',                baseCost:1e12,      pps:1.4e7 },
  { id:'wc_galactic', name:'Empire galactique',    icon:'🌌', desc:'Toute une galaxie chie pour toi.',    baseCost:1.4e13,    pps:9e7 },
  { id:'wc_quantum',  name:'Caca quantique',       icon:'⚛️', desc:'Existe et n\'existe pas à la fois.',  baseCost:1.8e14,    pps:6e8 },
  { id:'wc_eldritch', name:'Horreur intestinale',  icon:'👁️', desc:'Innommable, mais très productif.',    baseCost:2.4e15,    pps:4e9 },
  { id:'wc_omega',    name:'Toilettes Oméga',      icon:'∞',  desc:'La fin de toute digestion.',          baseCost:3.2e16,    pps:2.6e10 },
  { id:'wc_void',     name:'Néant fécal',          icon:'🕳️', desc:'Le caca au-delà de l\'existence.',    baseCost:4.5e17,    pps:1.7e11 },
  { id:'wc_bigbang',  name:'Big Bang intestinal',  icon:'💥', desc:'Crée un univers à chaque chasse.',    baseCost:6e18,      pps:1e12 },
  { id:'wc_multi',    name:'Multivers WC',         icon:'🎭', desc:'Une toilette par univers parallèle.', baseCost:8e19,      pps:7e12 },
  { id:'wc_butterfly',name:'Papillon quantique',   icon:'🦋', desc:'Un battement d\'aile = 1Md de cacas.',baseCost:1.1e21,    pps:5e13 },
  { id:'wc_oracle',   name:'Oracle constipé',      icon:'🔮', desc:'Voit le caca avant qu\'il existe.',   baseCost:1.5e22,    pps:3.5e14 },
  { id:'wc_volcano',  name:'Volcan fécal',         icon:'🌋', desc:'Éruption permanente de matière.',     baseCost:2.1e23,    pps:2.5e15 },
  { id:'wc_cryo',     name:'Caca cryogénique',     icon:'❄️', desc:'Conservé éternellement frais.',       baseCost:3e24,      pps:1.8e16 },
  { id:'wc_time',     name:'Toilette temporelle',  icon:'⌛', desc:'Caca du futur ramené au présent.',    baseCost:4.2e25,    pps:1.3e17 },
  { id:'wc_trident',  name:'Trident divin',        icon:'🔱', desc:'Force des mers fécales.',             baseCost:6e26,      pps:9.5e17 },
  { id:'wc_singularity',name:'Singularité absolue',icon:'🌠', desc:'Tout caca y mène. Aucun n\'en sort.', baseCost:8.5e27,    pps:7e18 },
];

// Per-toilet milestone tiers : every X owned doubles that toilet's output
const TIER_MILESTONES = [10, 25, 50, 100, 200, 400];

const UPGRADES = [
  { id:'up_hand1',  name:'Mains musclées',    icon:'💪', desc:'+1 par clic',          cost:50,    apply:s=>s.perClickAdd+=1 },
  { id:'up_hand2',  name:'Doigts agiles',     icon:'🖐️', desc:'+4 par clic',          cost:500,   apply:s=>s.perClickAdd+=4 },
  { id:'up_hand3',  name:'Force titanesque',  icon:'🦾', desc:'+25 par clic',         cost:7500,  apply:s=>s.perClickAdd+=25 },
  { id:'up_hand4',  name:'Mains de dieu',     icon:'🙌', desc:'+200 par clic',        cost:2.5e5, apply:s=>s.perClickAdd+=200 },
  { id:'up_hand5',  name:'Mains cosmiques',   icon:'🪐', desc:'+5000 par clic',       cost:1e8,   apply:s=>s.perClickAdd+=5000 },
  { id:'up_mult1',  name:'Régime fibreux',    icon:'🥦', desc:'×2 production totale', cost:25000, apply:s=>s.mult*=2 },
  { id:'up_mult2',  name:'Laxatif premium',   icon:'💊', desc:'×2 production totale', cost:1e6,   apply:s=>s.mult*=2 },
  { id:'up_mult3',  name:'Bénédiction du caca',icon:'✨',desc:'×3 production totale',cost:1e8,   apply:s=>s.mult*=3 },
  { id:'up_mult4',  name:'Caca-mancien',      icon:'🔮', desc:'×3 production totale', cost:5e10,  apply:s=>s.mult*=3 },
  { id:'up_mult5',  name:'Singularité fécale',icon:'🌟', desc:'×5 production totale', cost:1e13,  apply:s=>s.mult*=5 },
  { id:'up_click1', name:'Clic explosif',     icon:'💥', desc:'×3 par clic',          cost:250000,apply:s=>s.clickMult*=3 },
  { id:'up_click2', name:'Clic apocalyptique',icon:'☄️', desc:'×5 par clic',          cost:5e7,   apply:s=>s.clickMult*=5 },
  { id:'up_click3', name:'Clic divin',        icon:'⚡', desc:'×10 par clic',         cost:1e10,  apply:s=>s.clickMult*=10 },
  // Synergy: clicks gain a fraction of pps
  { id:'up_syn1',   name:'Synergie main/auto',icon:'🔗', desc:'Clic = +1% du /sec',   cost:5e5,   apply:s=>s.clickSynergy+=0.01 },
  { id:'up_syn2',   name:'Synergie main/auto II',icon:'🔗',desc:'Clic = +5% du /sec', cost:5e8,   apply:s=>s.clickSynergy+=0.04 },
  { id:'up_syn3',   name:'Symbiose totale',   icon:'🧬', desc:'Clic = +20% du /sec',  cost:5e11,  apply:s=>s.clickSynergy+=0.15 },
  // Late-game extensions
  { id:'up_hand6',  name:'Mains stellaires',  icon:'🌟', desc:'+50000 par clic',      cost:1e11,  apply:s=>s.perClickAdd+=50000 },
  { id:'up_hand7',  name:'Mains de l\'Oméga', icon:'🛐', desc:'+1M par clic',         cost:1e14,  apply:s=>s.perClickAdd+=1e6 },
  { id:'up_hand8',  name:'Mains absolues',    icon:'👐', desc:'+50M par clic',        cost:1e17,  apply:s=>s.perClickAdd+=5e7 },
  { id:'up_mult6',  name:'Caca-pocalypse',    icon:'☠️', desc:'×4 production totale', cost:1e15,  apply:s=>s.mult*=4 },
  { id:'up_mult7',  name:'Force créatrice',   icon:'🌅', desc:'×7 production totale', cost:1e18,  apply:s=>s.mult*=7 },
  { id:'up_mult8',  name:'Infinité',          icon:'♾️', desc:'×10 production totale',cost:1e21,  apply:s=>s.mult*=10 },
  { id:'up_click4', name:'Clic transcendant', icon:'🌠', desc:'×20 par clic',         cost:1e13,  apply:s=>s.clickMult*=20 },
  { id:'up_click5', name:'Clic d\'Oméga',     icon:'⚡', desc:'×50 par clic',         cost:1e16,  apply:s=>s.clickMult*=50 },
  { id:'up_syn4',   name:'Fusion absolue',    icon:'🔮', desc:'Clic = +50% du /sec',  cost:1e15,  apply:s=>s.clickSynergy+=0.30 },
  { id:'up_syn5',   name:'Unification',       icon:'⚛️', desc:'Clic = +100% du /sec', cost:1e19,  apply:s=>s.clickSynergy+=0.50 },
  { id:'up_crit1',  name:'Chance accrue',     icon:'🍀', desc:'+5% de chance crit',   cost:1e12,  apply:s=>s.critBonus=(s.critBonus||0)+0.05 },
  { id:'up_crit2',  name:'Doigts chanceux',   icon:'🎰', desc:'+10% de chance crit',  cost:1e15,  apply:s=>s.critBonus=(s.critBonus||0)+0.10 },
  { id:'up_critmult',name:'Coup de massue',   icon:'🔨', desc:'Crit ×10 (au lieu ×5)',cost:1e14,  apply:s=>s.critMultBonus=(s.critMultBonus||0)+5 },
];

const PRESTIGE_UPGRADES = [
  { id:'pu_start',  name:'Mise en jambes',    icon:'🏁', desc:'Commence avec 1000 💩',           cost:1,  apply:s=>{ s.startBonus = Math.max(s.startBonus||0, 1000); } },
  { id:'pu_start2', name:'Démarrage rapide',  icon:'⚡', desc:'Commence avec 100k 💩',           cost:5,  apply:s=>{ s.startBonus = Math.max(s.startBonus||0, 100000); } },
  { id:'pu_start3', name:'Démarrage colossal',icon:'🚀', desc:'Commence avec 100M 💩',           cost:25, apply:s=>{ s.startBonus = Math.max(s.startBonus||0, 1e8); } },
  { id:'pu_click1', name:'Doigts dorés',      icon:'🥇', desc:'×2 production par clic',          cost:2,  apply:s=>s.permClickMult*=2 },
  { id:'pu_click2', name:'Doigts platine',    icon:'🏆', desc:'×4 production par clic',          cost:10, apply:s=>s.permClickMult*=4 },
  { id:'pu_mult1',  name:'Aura dorée',        icon:'🌞', desc:'×2 production globale',           cost:3,  apply:s=>s.permMult*=2 },
  { id:'pu_mult2',  name:'Aura cosmique',     icon:'🌠', desc:'×3 production globale',           cost:15, apply:s=>s.permMult*=3 },
  { id:'pu_mult3',  name:'Aura divine',       icon:'👼', desc:'×5 production globale',           cost:75, apply:s=>s.permMult*=5 },
  { id:'pu_cheap1', name:'Réductions',        icon:'🏷️', desc:'Toilettes -10% du coût',          cost:5,  apply:s=>{ s.costMult=Math.min(s.costMult||1,0.9); } },
  { id:'pu_cheap2', name:'Soldes éternelles', icon:'💸', desc:'Toilettes -25% du coût',          cost:30, apply:s=>{ s.costMult=Math.min(s.costMult||1,0.75); } },
  { id:'pu_pdboost1',name:'Papier renforcé',  icon:'🧻', desc:'Bonus PD passe à +3% chacun',     cost:8,  apply:s=>{ s.pdBonus=Math.max(s.pdBonus||0.02,0.03); } },
  { id:'pu_pdboost2',name:'Papier ultime',    icon:'📜', desc:'Bonus PD passe à +5% chacun',     cost:50, apply:s=>{ s.pdBonus=Math.max(s.pdBonus||0.02,0.05); } },
  { id:'pu_pdgain1',name:'Recyclage',         icon:'♻️', desc:'+50% de PD gagnés au prestige',   cost:12, apply:s=>{ s.pdGainMult=Math.max(s.pdGainMult||1,1.5); } },
  { id:'pu_pdgain2',name:'Compostage',        icon:'🌱', desc:'×2 PD gagnés au prestige',        cost:60, apply:s=>{ s.pdGainMult=Math.max(s.pdGainMult||1,2); } },
  { id:'pu_auto',   name:'Doigt automatique', icon:'🤖', desc:'Auto-clic 5×/sec',                cost:20, apply:s=>{ s.autoClick = Math.max(s.autoClick||0, 5); } },
  { id:'pu_auto2',  name:'Main bionique',     icon:'🦿', desc:'Auto-clic 20×/sec',               cost:100,apply:s=>{ s.autoClick = Math.max(s.autoClick||0, 20); } },
  // Late-game prestige
  { id:'pu_start4', name:'Magnat du caca',    icon:'💼', desc:'Commence avec 100B 💩',           cost:200,apply:s=>{ s.startBonus = Math.max(s.startBonus||0, 1e11); } },
  { id:'pu_click3', name:'Doigts diamant',    icon:'💎', desc:'×8 production par clic',          cost:80, apply:s=>s.permClickMult*=8 },
  { id:'pu_mult4',  name:'Aura mythique',     icon:'🌟', desc:'×10 production globale',          cost:250,apply:s=>s.permMult*=10 },
  { id:'pu_mult5',  name:'Aura primordiale',  icon:'☀️', desc:'×25 production globale',          cost:1000,apply:s=>s.permMult*=25 },
  { id:'pu_cheap3', name:'Tout est gratuit',  icon:'🎁', desc:'Toilettes -50% du coût',          cost:300,apply:s=>{ s.costMult=Math.min(s.costMult||1,0.5); } },
  { id:'pu_pdboost3',name:'Papier transcendant',icon:'📜',desc:'Bonus PD passe à +10% chacun',  cost:500,apply:s=>{ s.pdBonus=Math.max(s.pdBonus||0.02,0.1); } },
  { id:'pu_pdgain3',name:'Recyclage parfait', icon:'♻️', desc:'×3 PD gagnés au prestige',        cost:400,apply:s=>{ s.pdGainMult=Math.max(s.pdGainMult||1,3); } },
  { id:'pu_auto3',  name:'Armée de doigts',   icon:'🤲', desc:'Auto-clic 100×/sec',              cost:600,apply:s=>{ s.autoClick = Math.max(s.autoClick||0, 100); } },
  { id:'pu_gem',    name:'Mineur de gems',    icon:'⛏️', desc:'+1 💎 toutes les 5 min auto',     cost:50, apply:s=>{ s.gemMine = Math.max(s.gemMine||0, 1); } },
  { id:'pu_gem2',   name:'Filon de gems',     icon:'💠', desc:'+5 💎 toutes les 5 min auto',     cost:300,apply:s=>{ s.gemMine = Math.max(s.gemMine||0, 5); } },
];

// ===== Pets / Eggs / Ascension =====
const ASCEND_THRESHOLD = 50; // total PD earned needed for first ascend

const PETS = [
  // Common (1.05–1.15)
  { id:'p_fly',       name:'Mouche',           icon:'🪰', rarity:'common',    mult:1.05 },
  { id:'p_worm',      name:'Vers',             icon:'🪱', rarity:'common',    mult:1.08 },
  { id:'p_rat',       name:'Rat des égouts',   icon:'🐀', rarity:'common',    mult:1.12 },
  { id:'p_mouse',     name:'Souris',           icon:'🐁', rarity:'common',    mult:1.15 },
  // Rare (1.25–1.5)
  { id:'p_skunk',     name:'Putois',           icon:'🦨', rarity:'rare',      mult:1.25 },
  { id:'p_pig',       name:'Cochon sale',      icon:'🐖', rarity:'rare',      mult:1.35 },
  { id:'p_goat',      name:'Chèvre',           icon:'🐐', rarity:'rare',      mult:1.50 },
  // Epic (1.75–2.5)
  { id:'p_bull',      name:'Taureau',          icon:'🐃', rarity:'epic',      mult:1.75 },
  { id:'p_horse',     name:'Cheval royal',     icon:'🐎', rarity:'epic',      mult:2.0 },
  { id:'p_elephant',  name:'Éléphant',         icon:'🐘', rarity:'epic',      mult:2.5 },
  // Legendary (3–5)
  { id:'p_tiger',     name:'Tigre majestueux', icon:'🐅', rarity:'legendary', mult:3.0 },
  { id:'p_dragon',    name:'Dragon doré',      icon:'🐲', rarity:'legendary', mult:4.0 },
  { id:'p_unicorn',   name:'Licorne du caca',  icon:'🦄', rarity:'legendary', mult:5.0 },
  // Myth (8–15)
  { id:'p_phoenix',   name:'Phénix fécal',     icon:'🦅', rarity:'myth',      mult:8.0 },
  { id:'p_kraken',    name:'Kraken',           icon:'🐙', rarity:'myth',      mult:12.0 },
  { id:'p_hydra',     name:'Hydre',            icon:'🐍', rarity:'myth',      mult:15.0 },
  // Divine (25–50)
  { id:'p_god',       name:'Dieu du caca',     icon:'👑', rarity:'divine',    mult:25.0 },
  { id:'p_cosmic',    name:'Entité cosmique',  icon:'🌌', rarity:'divine',    mult:50.0 },
];
const RARITY_ORDER = ['common','rare','epic','legendary','myth','divine'];
const RARITY_LABEL = { common:'Commun', rare:'Rare', epic:'Épique', legendary:'Légendaire', myth:'Mythique', divine:'Divin' };

const EGGS = [
  { id:'egg_common',    name:'Œuf commun',     icon:'🥚', cost:25,
    rarities:{ common:70, rare:25, epic:5 } },
  { id:'egg_rare',      name:'Œuf rare',       icon:'🥚', cost:120,
    rarities:{ rare:55, epic:35, legendary:9, myth:1 } },
  { id:'egg_epic',      name:'Œuf épique',     icon:'🪺', cost:600,
    rarities:{ epic:55, legendary:35, myth:9, divine:1 } },
  { id:'egg_legendary', name:'Œuf légendaire', icon:'🌟', cost:3000,
    rarities:{ legendary:50, myth:40, divine:10 } },
];

// ===== Mutations (event variants of pets) =====
const MUTATIONS = [
  { id:'mut_golden',  name:'Doré',        icon:'✨', multBoost:2,  glow:'#ffd166' },
  { id:'mut_frost',   name:'Givré',       icon:'❄️', multBoost:3,  glow:'#7fd0ff' },
  { id:'mut_shadow',  name:'Ombre',       icon:'🌑', multBoost:4,  glow:'#7c4dff' },
  { id:'mut_inferno', name:'Infernal',    icon:'🔥', multBoost:6,  glow:'#ff6b6b' },
  { id:'mut_rainbow', name:'Arc-en-ciel', icon:'🌈', multBoost:10, glow:'rainbow' },
];

// ===== Admin Events (global, toggled by admin) =====
const ADMIN_EVENTS = [
  { id:'evt_lucky',        name:'Chance +50%',        icon:'🍀', desc:'×1.5 chance d\'obtenir des raretés supérieures dans les œufs', type:'lucky',    multiplier:1.5 },
  { id:'evt_lucky2',       name:'Super Chance ×3',    icon:'🌟', desc:'×3 chance d\'obtenir des raretés supérieures',                  type:'lucky',    multiplier:3 },
  { id:'evt_lucky3',       name:'Méga Chance ×10',    icon:'💫', desc:'×10 chance — quasi-garantie de gros pets',                       type:'lucky',    multiplier:10 },
  { id:'evt_double',       name:'Double Pets',         icon:'👯', desc:'Chaque œuf donne 2 pets au lieu de 1',                          type:'double' },
  { id:'evt_triple',       name:'Triple Pets',         icon:'🎰', desc:'Chaque œuf donne 3 pets',                                       type:'triple' },
  { id:'evt_cheap',        name:'Œufs Soldés -50%',    icon:'💸', desc:'Tous les œufs à moitié prix',                                   type:'cheap',    multiplier:0.5 },
  { id:'evt_free_eggs',    name:'Œufs Gratuits',       icon:'🆓', desc:'Tous les œufs gratuits (90% de réduction)',                     type:'cheap',    multiplier:0.1 },
  { id:'evt_mut_golden',   name:'Mutation Doré',       icon:'✨', desc:'5% chance de muter le pet en Doré (×2 mult)',                  type:'mutation', mutationId:'mut_golden',  chance:0.05 },
  { id:'evt_mut_frost',    name:'Mutation Givré',      icon:'❄️', desc:'3% chance de muter en Givré (×3 mult)',                         type:'mutation', mutationId:'mut_frost',   chance:0.03 },
  { id:'evt_mut_shadow',   name:'Mutation Ombre',      icon:'🌑', desc:'2% chance de muter en Ombre (×4 mult)',                         type:'mutation', mutationId:'mut_shadow',  chance:0.02 },
  { id:'evt_mut_inferno',  name:'Mutation Infernal',   icon:'🔥', desc:'1% chance de muter en Infernal (×6 mult)',                      type:'mutation', mutationId:'mut_inferno', chance:0.01 },
  { id:'evt_mut_rainbow',  name:'Mutation Arc-en-ciel',icon:'🌈', desc:'0.5% chance ULTRA RARE — Arc-en-ciel (×10 mult)',               type:'mutation', mutationId:'mut_rainbow', chance:0.005 },
  { id:'evt_mut_party',    name:'PARTY MUTATION 25%',  icon:'🎉', desc:'25% chance de muter en aléatoire (toutes mutations actives)',   type:'mutation_random', chance:0.25 },
  { id:'evt_double_caca',  name:'Double Caca',         icon:'💩', desc:'×2 production de caca pour tous',                                type:'globalMult', multiplier:2 },
  { id:'evt_x10_caca',     name:'×10 Caca',            icon:'🚀', desc:'×10 production globale (gros boost)',                            type:'globalMult', multiplier:10 },
  { id:'evt_double_gems',  name:'×2 Gems',             icon:'💎', desc:'×2 gems gagnés via quêtes/minage',                               type:'gemMult',    multiplier:2 },
];

// ===== Event system (backend) =====
// Event functions are now defined earlier in the file (fetchActiveEvents, toggleBackendEvent, etc.)

// ===== Premium shop (PayPal) =====
const PAYPAL_EMAIL = 'j6209478@gmail.com';
const PAYPAL_CURRENCY = 'EUR';
const PREMIUM_ITEMS = [
  { id:'x2poop', icon:'💩', name:'×2 Caca permanent',         desc:'Double tous tes gains de caca pour toujours.',           price:1.99 },
  { id:'x2pps',  icon:'🚽', name:'×2 Production toilettes',   desc:'Double la production /sec de toutes tes toilettes.',     price:2.99 },
  { id:'x2pd',   icon:'🧻', name:'×2 Renaissance',            desc:'Double les 🧻 gagnés à chaque renaissance.',             price:3.99 },
  { id:'x2gems', icon:'💎', name:'×2 Gems',                   desc:'Double les gems gagnés via les quêtes et le minage.',    price:2.49 },
];

// ===== Skins =====
const SKINS = [
  { id:'default',  name:'Classique',   cost:0,    desc:'WC porcelaine de base.' },
  { id:'gold',     name:'Doré',        cost:100,  desc:'Trône en or massif.' },
  { id:'marble',   name:'Marbre',      cost:250,  desc:'Style antique luxueux.' },
  { id:'crystal',  name:'Cristal',     cost:400,  desc:'Glace cristalline pure.' },
  { id:'lava',     name:'Lave',        cost:600,  desc:'Magma incandescent.' },
  { id:'neon',     name:'Néon',        cost:850,  desc:'Cyber-WC futuriste.' },
  { id:'rainbow',  name:'Arc-en-ciel', cost:1200, desc:'Toutes les couleurs animées.' },
  { id:'cosmic',   name:'Cosmique',    cost:2000, desc:'Étoiles et galaxies.' },
];

// ===== Quests =====
const QUESTS = [
  { id:'q_click100',  icon:'👆', name:'Petit clic',          desc:'Clique 100 fois sur la cuvette',  goal:100,    reward:5,   track:'clicks' },
  { id:'q_click1k',   icon:'✌️', name:'Doigt vif',           desc:'Clique 1 000 fois',               goal:1000,   reward:15,  track:'clicks' },
  { id:'q_click10k',  icon:'🖐️', name:'Maître des clics',    desc:'Clique 10 000 fois',              goal:10000,  reward:50,  track:'clicks' },
  { id:'q_click100k', icon:'🤲', name:'Doigts d\'acier',     desc:'Clique 100 000 fois',             goal:100000, reward:200, track:'clicks' },
  { id:'q_poop1k',    icon:'💩', name:'Premiers pas',        desc:'Produis 1k 💩 au total',          goal:1e3,    reward:5,   track:'totalPoop' },
  { id:'q_poop1M',    icon:'💩', name:'Million de caca',     desc:'Produis 1M 💩 au total',          goal:1e6,    reward:20,  track:'totalPoop' },
  { id:'q_poop1B',    icon:'💩', name:'Milliardaire',        desc:'Produis 1B 💩 au total',          goal:1e9,    reward:60,  track:'totalPoop' },
  { id:'q_poop1T',    icon:'💩', name:'Roi du caca',         desc:'Produis 1T 💩 au total',          goal:1e12,   reward:200, track:'totalPoop' },
  { id:'q_poop1Qa',   icon:'💩', name:'Empereur fécal',      desc:'Produis 1Qa 💩 au total',         goal:1e15,   reward:500, track:'totalPoop' },
  { id:'q_toilet10',  icon:'🚽', name:'Petit collectionneur',desc:'Possède 10 toilettes au total',   goal:10,     reward:10,  track:'totalToilets' },
  { id:'q_toilet100', icon:'🚽', name:'Collectionneur',      desc:'Possède 100 toilettes au total',  goal:100,    reward:40,  track:'totalToilets' },
  { id:'q_toilet500', icon:'🚽', name:'Empire toilette',     desc:'Possède 500 toilettes au total',  goal:500,    reward:150, track:'totalToilets' },
  { id:'q_toilet1k',  icon:'🚽', name:'Mille trônes',        desc:'Possède 1000 toilettes au total', goal:1000,   reward:400, track:'totalToilets' },
  { id:'q_prestige1', icon:'♻️', name:'Renaissance',         desc:'Renais une première fois',        goal:1,      reward:30,  track:'prestigeCount' },
  { id:'q_prestige5', icon:'♻️', name:'Cycle infini',        desc:'Renais 5 fois',                   goal:5,      reward:120, track:'prestigeCount' },
  { id:'q_prestige20',icon:'♻️', name:'Renaissance éternelle',desc:'Renais 20 fois',                 goal:20,     reward:500, track:'prestigeCount' },
  { id:'q_upg5',      icon:'⚡', name:'Améliorer',           desc:'Achète 5 améliorations',          goal:5,      reward:15,  track:'upgradesBought' },
  { id:'q_upg15',     icon:'⚡', name:'Tous améliorés',      desc:'Achète 15 améliorations',         goal:15,     reward:80,  track:'upgradesBought' },
  { id:'q_crit50',    icon:'💥', name:'Critique !',          desc:'Fais 50 clics critiques',         goal:50,     reward:40,  track:'crits' },
  { id:'q_crit500',   icon:'💥', name:'Roi du crit',         desc:'Fais 500 clics critiques',        goal:500,    reward:300, track:'crits' },
];

// ===== State =====
const defaultState = () => ({
  poop: 0,
  totalPoop: 0,
  perClickAdd: 0,
  clickMult: 1,
  clickSynergy: 0,
  mult: 1,
  toilets: Object.fromEntries(TOILETS.map(t=>[t.id,0])),
  upgrades: {},
  // prestige permanent (never wiped)
  pd: 0,
  totalPdEarned: 0,
  prestigeUpgrades: {},
  permClickMult: 1,
  permMult: 1,
  costMult: 1,
  pdBonus: 0.02,        // each PD = +2% by default
  pdGainMult: 1,
  autoClick: 0,
  startBonus: 0,
  // Premium PayPal-purchased boosts (permanent, never wiped)
  premium: {},
  // Gems / quests / skins (permanent across prestige)
  gems: 0,
  totalGems: 0,
  clicks: 0,
  crits: 0,
  prestigeCount: 0,
  claimedQuests: {},
  ownedSkins: { default: true },
  skin: 'default',
  critBonus: 0,
  critMultBonus: 0,
  gemMine: 0,
  lastGemMine: 0,
  // Ascension / pets
  ap: 0,
  totalApEarned: 0,
  ascensionCount: 0,
  pets: {},
  mutations: {}, // { petId: { mutId: count } }
});

let state = defaultState(); // will be replaced after auth

async function save() {
  try { localStorage.setItem(saveKey(), JSON.stringify(state)); } catch(e){}
  // Sync to backend if logged in
  if (CURRENT_USER && AUTH_TOKEN) {
    syncToBackend();
  }
}
async function syncToBackend() {
  if (!CURRENT_USER || !AUTH_TOKEN) return;
  try {
    await apiCall('/updateScore', 'POST', {
      gameState: state,
      toilets: state.toilets,
      upgrades: state.upgrades,
      prestigeUpgrades: state.prestigeUpgrades,
      pets: state.pets,
      mutations: state.mutations,
      premium: state.premium,
      claimedQuests: state.claimedQuests,
      ownedSkins: state.ownedSkins,
      skin: state.skin
    });
  } catch(e) {
    console.error('Sync error:', e);
  }
}
async function load() {
  try {
    const raw = localStorage.getItem(saveKey());
    if (!raw) return null;
    const s = JSON.parse(raw);
    const def = defaultState();
    return { ...def, ...s,
      toilets: { ...def.toilets, ...(s.toilets||{}) },
      upgrades: s.upgrades||{},
      prestigeUpgrades: s.prestigeUpgrades||{},
      premium: s.premium||{},
      claimedQuests: s.claimedQuests||{},
      ownedSkins: { default: true, ...(s.ownedSkins||{}) },
      pets: s.pets||{},
      mutations: s.mutations||{},
    };
  } catch(e){ return null; }
}
async function loadFromBackend() {
  if (!CURRENT_USER || !AUTH_TOKEN) return null;
  try {
    const data = await apiCall('/gameState');
    const def = defaultState();
    return { ...def, ...data.gameState,
      toilets: data.toilets || {},
      upgrades: data.upgrades || {},
      prestigeUpgrades: data.prestigeUpgrades || {},
      premium: data.premium || {},
      claimedQuests: data.claimedQuests || {},
      ownedSkins: data.ownedSkins || { default: true },
      pets: data.pets || {},
      mutations: data.mutations || {},
      skin: data.skin || 'default'
    };
  } catch(e) {
    console.error('Load from backend error:', e);
    return null;
  }
}

function applyAllPrestigeUpgrades() {
  // Reset perm bonuses to defaults then re-apply (so loading is idempotent)
  state.permClickMult = 1;
  state.permMult = 1;
  state.costMult = 1;
  state.pdBonus = 0.02;
  state.pdGainMult = 1;
  state.autoClick = 0;
  state.startBonus = 0;
  state.gemMine = 0;
  for (const u of PRESTIGE_UPGRADES) {
    if (state.prestigeUpgrades[u.id]) u.apply(state);
  }
}

// ===== Math =====
function toiletTierMult(id) {
  const owned = state.toilets[id] || 0;
  let m = 1;
  for (const ms of TIER_MILESTONES) if (owned >= ms) m *= 2;
  return m;
}
function nextTierForToilet(id) {
  const owned = state.toilets[id] || 0;
  for (const ms of TIER_MILESTONES) if (owned < ms) return ms;
  return null;
}
function premiumMult(id) { return state.premium && state.premium[id] ? 2 : 1; }
function toiletPps(t) {
  return (state.toilets[t.id]||0) * t.pps * toiletTierMult(t.id) * premiumMult('x2pps');
}
function prestigeMult() {
  const pdActive = state.pd || 0;
  return 1 + pdActive * (state.pdBonus||0.02);
}
function petMult() {
  // Normal pets + mutated copies (each mutated copy uses pet.mult * mutation.multBoost)
  if (!state.pets) return 1;
  let bonus = 0;
  for (const p of PETS) {
    const c = state.pets[p.id] || 0;
    if (c > 0) bonus += (p.mult - 1) * c;
    const muts = state.mutations && state.mutations[p.id];
    if (muts) {
      for (const [mutId, mc] of Object.entries(muts)) {
        const m = MUTATIONS.find(x => x.id === mutId);
        if (m && mc > 0) bonus += (p.mult * m.multBoost - 1) * mc;
      }
    }
  }
  return 1 + bonus;
}
function eventGlobalMult() {
  return activeEventsOfType('globalMult').reduce((a,e)=> a * e.multiplier, 1);
}
function globalMult() {
  return state.mult * (state.permMult||1) * prestigeMult() * petMult()
    * premiumMult('x2poop') * eventGlobalMult();
}
function costOf(t) {
  const owned = state.toilets[t.id] || 0;
  return Math.ceil(t.baseCost * Math.pow(1.15, owned) * (state.costMult||1));
}
function perClick() {
  const base = (1 + state.perClickAdd) * state.clickMult * (state.permClickMult||1) * globalMult();
  const synergy = perSecond() * (state.clickSynergy||0);
  return Math.max(1, base + synergy);
}
function perSecond() {
  let pps = 0;
  for (const t of TOILETS) pps += toiletPps(t);
  return pps * globalMult();
}
function pdGainOnPrestige() {
  // sqrt-based; needs at least 1e6 lifetime poop for first PD
  const tp = state.totalPoop;
  if (tp < 1e6) return 0;
  return Math.floor(Math.sqrt(tp / 1e6) * (state.pdGainMult||1) * premiumMult('x2pd'));
}

function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  const units = ['k','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qad','Qid'];
  let i = -1;
  while (n >= 1000 && i < units.length-1) { n/=1000; i++; }
  return n.toFixed(n<10?2:n<100?1:0) + units[i];
}

// ===== DOM =====
const $ = id => document.getElementById(id);
const poopCountEl = $('poopCount');
const perClickEl = $('perClick');
const perSecondEl = $('perSecond');
const totalPoopEl = $('totalPoop');
const prestigeCountEl = $('prestigeCount');
const prestigeBonusEl = $('prestigeBonus');
const gemCountEl = $('gemCount');
const apCountEl = $('apCount');
const prestigeGainEl = $('prestigeGain');
const prestigeBtn = $('prestigeBtn');
const toiletEl = $('toilet');
const floatLayer = $('floatLayer');
const particleLayer = $('particleLayer');
const poopStack = $('poopStack');
const shopList = $('shopList');
const upgradeList = $('upgradeList');
const prestigeList = $('prestigeList');
const premiumList = $('premiumList');
const toastEl = $('toast');
const resetBtn = $('resetBtn');

function bump(el) {
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function updateStats() {
  poopCountEl.textContent = fmt(state.poop);
  perClickEl.textContent = fmt(perClick());
  perSecondEl.textContent = fmt(perSecond());
  totalPoopEl.textContent = fmt(state.totalPoop);
  prestigeCountEl.textContent = fmt(state.pd||0);
  prestigeBonusEl.textContent = '+' + Math.round(((prestigeMult()-1)*100)) + '%';
  if (gemCountEl) gemCountEl.textContent = fmt(state.gems||0);
  if (apCountEl) apCountEl.textContent = fmt(state.ap||0);
  // Prestige preview
  const gain = pdGainOnPrestige();
  prestigeGainEl.textContent = fmt(gain);
  prestigeBtn.disabled = gain <= 0;
  prestigeBtn.textContent = gain > 0 ? `Renaître (+${fmt(gain)} 🧻)` : 'Renaître (besoin de 1M total)';
}

// ===== Tabs =====
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b===btn));
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p=>{
      p.classList.toggle('active', p.dataset.panel===tab);
    });
  });
});

// ===== Quests =====
function questProgress(q) {
  switch (q.track) {
    case 'clicks': return state.clicks || 0;
    case 'totalPoop': return state.totalPoop || 0;
    case 'totalToilets': return Object.values(state.toilets||{}).reduce((a,b)=>a+b, 0);
    case 'prestigeCount': return state.prestigeCount || 0;
    case 'upgradesBought': return Object.keys(state.upgrades||{}).length;
    case 'crits': return state.crits || 0;
    default: return 0;
  }
}
function gemBonusMult() {
  let m = state.premium && state.premium.x2gems ? 2 : 1;
  m *= activeEventsOfType('gemMult').reduce((a,e)=> a * e.multiplier, 1);
  return m;
}
function claimQuest(q) {
  if (state.claimedQuests[q.id]) return;
  if (questProgress(q) < q.goal) return;
  const reward = Math.floor(q.reward * gemBonusMult());
  state.gems = (state.gems||0) + reward;
  state.totalGems = (state.totalGems||0) + reward;
  state.claimedQuests[q.id] = true;
  toast(`💎 +${reward} gems récoltés ! (${q.name})`);
  spawnConfetti(40);
  renderShop(); updateStats(); save();
}
function renderQuests() {
  const list = document.getElementById('questList');
  if (!list) return;
  list.innerHTML = '';
  // Sort: complete-not-claimed first, in-progress, then claimed
  const sorted = [...QUESTS].sort((a,b) => {
    const ac = !!state.claimedQuests[a.id], bc = !!state.claimedQuests[b.id];
    const ap = questProgress(a) >= a.goal, bp = questProgress(b) >= b.goal;
    if (ap && !ac && !(bp && !bc)) return -1;
    if (bp && !bc && !(ap && !ac)) return 1;
    if (ac && !bc) return 1;
    if (bc && !ac) return -1;
    return 0;
  });
  sorted.forEach(q => {
    const claimed = !!state.claimedQuests[q.id];
    const prog = questProgress(q);
    const complete = prog >= q.goal;
    const div = document.createElement('div');
    div.className = 'quest-item' + (claimed ? ' claimed' : complete ? ' complete' : '');
    const pct = Math.min(100, (prog / q.goal) * 100);
    div.innerHTML = `
      <div class="icon">${q.icon}</div>
      <div class="info">
        <span class="name">${q.name}</span>
        <span class="desc">${q.desc}</span>
        <div class="quest-progress">
          <div class="fill" style="width:${pct}%"></div>
          <div class="label">${fmt(Math.min(prog, q.goal))} / ${fmt(q.goal)}</div>
        </div>
      </div>
      <div class="reward">${claimed ? '✓ Réclamé' : '+' + Math.floor(q.reward * gemBonusMult()) + ' 💎'}</div>
    `;
    if (complete && !claimed) div.addEventListener('click', () => claimQuest(q));
    list.appendChild(div);
  });
}

// ===== Skins =====
function renderSkins() {
  const list = document.getElementById('skinList');
  if (!list) return;
  list.innerHTML = '';
  SKINS.forEach(sk => {
    const owned = !!(state.ownedSkins && state.ownedSkins[sk.id]);
    const equipped = state.skin === sk.id;
    const afford = (state.gems||0) >= sk.cost;
    const card = document.createElement('div');
    card.className = 'skin-card'
      + (equipped ? ' equipped' : '')
      + (!owned ? ' locked' : ' owned')
      + (!owned && !afford ? ' cant-afford' : '');
    card.innerHTML = `
      <div class="skin-preview" data-skin-preview="${sk.id}">
        <div class="sp-tank"></div>
        <div class="sp-seat"><div class="sp-bowl"><div class="sp-water"></div></div></div>
        <div class="sp-base"></div>
      </div>
      <div class="skin-name">${sk.name}</div>
      <div class="skin-cost">${equipped ? '✓ Équipé' : owned ? 'Cliquer pour équiper' : sk.cost + ' 💎'}</div>
    `;
    card.addEventListener('click', () => {
      if (equipped) return;
      if (owned) { equipSkin(sk.id); }
      else { buySkin(sk); }
    });
    list.appendChild(card);
  });
  // Apply skin colors to previews via inline styles
  list.querySelectorAll('[data-skin-preview]').forEach(prev => {
    const id = prev.dataset.skinPreview;
    // Use a temporary toilet element to read the vars: easier — just set via data-skin attribute on preview
    prev.dataset.skin = id;
  });
}
function buySkin(sk) {
  if (state.ownedSkins[sk.id]) return;
  if ((state.gems||0) < sk.cost) { toast('Pas assez de gems 💎'); return; }
  state.gems -= sk.cost;
  state.ownedSkins[sk.id] = true;
  state.skin = sk.id;
  toiletEl.dataset.skin = sk.id;
  toast(`🎨 ${sk.name} acheté et équipé !`);
  spawnConfetti(50); screenFlash();
  renderShop(); updateStats(); save();
}
function equipSkin(id) {
  state.skin = id;
  toiletEl.dataset.skin = id;
  toast(`🎨 Skin "${SKINS.find(s=>s.id===id).name}" équipé`);
  renderShop(); save();
}

// ===== Ascension =====
function apGainOnAscend() {
  const t = state.totalPdEarned || 0;
  if (t < ASCEND_THRESHOLD) return 0;
  return Math.floor(Math.sqrt(t / ASCEND_THRESHOLD));
}
function ascend() {
  const gain = apGainOnAscend();
  if (gain <= 0) return toast(`Atteins ${ASCEND_THRESHOLD} 🧻 gagnés à vie pour ascensionner`);
  if (!confirm(`Ascensionner et gagner ${gain} ✨ ?\n\nTu perds : 💩 caca, 🧻 PD, toilettes, améliorations et améliorations de prestige.\nTu gardes : 💎 gems, 🐾 pets, 🎨 skins, gamepass.`)) return;
  state.ap = (state.ap||0) + gain;
  state.totalApEarned = (state.totalApEarned||0) + gain;
  state.ascensionCount = (state.ascensionCount||0) + 1;
  // Wipe everything tied to runs and prestige
  state.poop = 0;
  state.totalPoop = 0;
  state.perClickAdd = 0;
  state.clickMult = 1;
  state.clickSynergy = 0;
  state.mult = 1;
  state.toilets = Object.fromEntries(TOILETS.map(t=>[t.id,0]));
  state.upgrades = {};
  state.pd = 0;
  state.totalPdEarned = 0;
  state.prestigeCount = 0;
  state.prestigeUpgrades = {};
  applyAllPrestigeUpgrades();
  renderShop(); updateStats(); save();
  toast(`✨ Ascension ! +${fmt(gain)} ✨`);
  spawnConfetti(220); screenFlash();
}
function renderAscension() {
  const gainEl = document.getElementById('ascendGain');
  const btn = document.getElementById('ascendBtn');
  const info = document.getElementById('ascendInfo');
  if (!gainEl || !btn) return;
  const gain = apGainOnAscend();
  gainEl.textContent = fmt(gain);
  btn.disabled = gain <= 0;
  btn.textContent = gain > 0 ? `Ascensionner (+${fmt(gain)} ✨)` : `Ascensionner (besoin de ${ASCEND_THRESHOLD} 🧻 à vie)`;
  if (info) info.textContent = `Ascensions effectuées : ${state.ascensionCount||0} • Total ✨ gagnés à vie : ${fmt(state.totalApEarned||0)}`;
}

// ===== Eggs =====
function pickFromEgg(egg) {
  // Apply lucky event: shift weights toward rarer tiers
  let weights = { ...egg.rarities };
  const luckyMult = activeEventsOfType('lucky').reduce((a,e)=> a * e.multiplier, 1);
  if (luckyMult > 1) {
    const adjusted = {};
    for (const [r, w] of Object.entries(weights)) {
      const idx = RARITY_ORDER.indexOf(r);
      // common/0 → reduce, rare+ → boost progressively
      if (idx === 0) adjusted[r] = w / luckyMult;
      else adjusted[r] = w * Math.pow(luckyMult, idx);
    }
    weights = adjusted;
  }
  const total = Object.values(weights).reduce((a,b)=>a+b, 0);
  let r = Math.random() * total;
  let chosenRarity = 'common';
  for (const [rarity, w] of Object.entries(weights)) {
    if (r < w) { chosenRarity = rarity; break; }
    r -= w;
  }
  const candidates = PETS.filter(p => p.rarity === chosenRarity);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
function rollMutation() {
  // Check normal mutation events (one-by-one, first hit wins)
  const muts = activeEventsOfType('mutation');
  for (const e of muts) {
    if (Math.random() < e.chance) return MUTATIONS.find(m => m.id === e.mutationId);
  }
  // Random mutation event: pick from any active mutation pool, or all if none
  const random = activeEventsOfType('mutation_random');
  for (const e of random) {
    if (Math.random() < e.chance) {
      const pool = muts.length
        ? muts.map(ev => MUTATIONS.find(m => m.id === ev.mutationId)).filter(Boolean)
        : MUTATIONS;
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return null;
}
function eggCost(egg) {
  const cheapMult = activeEventsOfType('cheap').reduce((a,e)=> Math.min(a, e.multiplier), 1);
  return Math.max(1, Math.ceil(egg.cost * cheapMult));
}
function openEgg(egg) {
  const cost = eggCost(egg);
  if ((state.ap||0) < cost) { toast('Pas assez de ✨'); return; }
  state.ap -= cost;
  const pulls =
    isEventOn('evt_triple') ? 3 :
    isEventOn('evt_double') ? 2 : 1;
  const results = [];
  state.pets = state.pets || {};
  state.mutations = state.mutations || {};
  for (let i = 0; i < pulls; i++) {
    const pet = pickFromEgg(egg);
    const mut = rollMutation();
    let dup;
    if (mut) {
      state.mutations[pet.id] = state.mutations[pet.id] || {};
      const prev = state.mutations[pet.id][mut.id] || 0;
      state.mutations[pet.id][mut.id] = prev + 1;
      dup = prev > 0;
    } else {
      const prev = state.pets[pet.id] || 0;
      state.pets[pet.id] = prev + 1;
      dup = prev > 0;
    }
    results.push({ pet, mut, dup });
  }
  // Show modal with all results, queued
  showEggResults(results);
  renderShop(); updateStats(); save();
  // Confetti burst based on best
  const best = results.reduce((a,r)=> {
    if (r.mut) return 'mutated';
    const idx = RARITY_ORDER.indexOf(r.pet.rarity);
    return idx > a ? idx : a;
  }, -1);
  if (best === 'mutated' || (typeof best === 'number' && best >= 4)) spawnConfetti(180);
  else if (typeof best === 'number' && best >= 2) spawnConfetti(70);
  else spawnConfetti(30);
}
function showEggResults(results) {
  let queue = [...results];
  const showNext = () => {
    if (!queue.length) return;
    const r = queue.shift();
    showSingleReveal(r, queue.length, showNext);
  };
  showNext();
}
function showSingleReveal({ pet, mut, dup }, remaining, onClose) {
  let modal = document.getElementById('eggReveal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'eggReveal';
    modal.className = 'egg-reveal';
    document.body.appendChild(modal);
  }
  const finalMult = mut ? pet.mult * mut.multBoost : pet.mult;
  const displayName = mut ? `${mut.icon} ${mut.name} ${pet.name}` : pet.name;
  const rarityTag = mut ? 'mutated' : pet.rarity;
  const rarityLabel = mut ? `MUTATION ${mut.name.toUpperCase()}` : RARITY_LABEL[pet.rarity];
  modal.innerHTML = `
    <div class="egg-reveal-card${mut ? ' mutated' : ''}">
      <div class="reveal-icon">${pet.icon}${mut ? `<span class="mut-badge">${mut.icon}</span>` : ''}</div>
      <div class="reveal-rarity" data-rarity="${rarityTag}">${rarityLabel}</div>
      <div class="reveal-name">${displayName}</div>
      <div class="reveal-mult">×${finalMult.toFixed(2)} production${mut ? ` <span style="opacity:0.7">(base ×${pet.mult} ${mut.icon}×${mut.multBoost})</span>` : ''}</div>
      <div class="reveal-dup">${dup ? '⭐ Doublon — bonus stacké !' : '✨ Nouveau pet !'}</div>
      <button class="reveal-close">${remaining > 0 ? `Suivant (${remaining}) →` : 'Continuer'}</button>
    </div>
  `;
  const close = () => {
    modal.classList.remove('show');
    setTimeout(() => onClose && onClose(), 300);
  };
  modal.querySelector('.reveal-close').addEventListener('click', close);
  modal.onclick = e => { if (e.target === modal) close(); };
  requestAnimationFrame(() => modal.classList.add('show'));
}
function renderEventBanner() {
  const banner = document.getElementById('eventBanner');
  if (!banner) return;
  const ev = getActiveEvents();
  const active = ADMIN_EVENTS.filter(e => ev[e.id]);
  if (!active.length) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }
  banner.classList.remove('hidden');
  banner.innerHTML = '<div class="event-banner-title">🎉 Événements actifs</div>'
    + '<div class="event-banner-list">'
    + active.map(e => `<span class="event-chip" data-type="${e.type}" title="${e.desc}">${e.icon} ${e.name}</span>`).join('')
    + '</div>';
}

function renderEggs() {
  const list = document.getElementById('eggList');
  if (!list) return;
  list.innerHTML = '';
  EGGS.forEach(egg => {
    const bestRarity = Object.keys(egg.rarities).sort((a,b)=> RARITY_ORDER.indexOf(b)-RARITY_ORDER.indexOf(a))[0];
    const cost = eggCost(egg);
    const discount = cost < egg.cost;
    const afford = (state.ap||0) >= cost;
    const card = document.createElement('div');
    card.className = 'egg-card' + (afford ? '' : ' disabled');
    card.dataset.rarity = bestRarity;
    const tags = Object.entries(egg.rarities)
      .map(([r, w]) => `<span class="egg-r-tag" style="color:${rarityColor(r)}">${RARITY_LABEL[r]} ${w}%</span>`)
      .join('');
    const priceHtml = discount
      ? `<s style="opacity:0.5">${egg.cost}</s> <b>${cost} ✨</b>`
      : `${cost} ✨`;
    card.innerHTML = `
      <div class="egg-icon">${egg.icon}</div>
      <div class="egg-name">${egg.name}</div>
      <div class="egg-cost">${priceHtml}</div>
      <div class="egg-rarities">${tags}</div>
    `;
    card.addEventListener('click', () => { if (afford) openEgg(egg); else toast('Pas assez de ✨'); });
    list.appendChild(card);
  });
}
function rarityColor(r) {
  return ({
    common:'#bbb', rare:'#7fd0ff', epic:'#d9b3ff',
    legendary:'#ffc870', myth:'#ff9b9b', divine:'#ffb3e6'
  })[r] || '#bbb';
}

// ===== Pets =====
function renderPets() {
  const list = document.getElementById('petList');
  const stats = document.getElementById('petStats');
  if (!list || !stats) return;
  // Sort by rarity then mult
  const sorted = [...PETS].sort((a,b) => {
    const r = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    return r !== 0 ? r : a.mult - b.mult;
  });
  list.innerHTML = '';
  let owned = 0, total = PETS.length;
  let copies = 0;
  let mutCount = 0;
  sorted.forEach(p => {
    const c = (state.pets && state.pets[p.id]) || 0;
    const muts = (state.mutations && state.mutations[p.id]) || {};
    const mutTotal = Object.values(muts).reduce((a,b)=>a+b, 0);
    const totalCopies = c + mutTotal;
    if (totalCopies > 0) { owned++; copies += totalCopies; mutCount += mutTotal; }
    const card = document.createElement('div');
    card.className = 'pet-card' + (totalCopies === 0 ? ' locked' : '') + (mutTotal > 0 ? ' has-mut' : '');
    card.dataset.rarity = p.rarity;
    let title = `${RARITY_LABEL[p.rarity]} • ×${p.mult}`;
    if (mutTotal > 0) {
      title += '\nMutations: ' + Object.entries(muts).map(([id,n])=>{
        const m = MUTATIONS.find(x=>x.id===id);
        return m ? `${m.icon} ${m.name} ×${n}` : '';
      }).join(', ');
    }
    card.title = title;
    const mutBadges = Object.entries(muts).map(([id,n])=>{
      const m = MUTATIONS.find(x=>x.id===id);
      if (!m) return '';
      return `<span class="mut-tag" data-mut="${id}" title="${m.name} ×${m.multBoost}">${m.icon}${n>1?n:''}</span>`;
    }).join('');
    card.innerHTML = `
      ${c > 0 ? `<div class="pet-count">×${c}</div>` : ''}
      <div class="pet-icon">${p.icon}</div>
      <div class="pet-name">${p.name}</div>
      <div class="pet-mult">×${p.mult.toFixed(2)}</div>
      ${mutBadges ? `<div class="mut-row">${mutBadges}</div>` : ''}
    `;
    list.appendChild(card);
  });
  stats.innerHTML = `
    <div>🐾 Pets uniques : <b>${owned} / ${total}</b></div>
    <div>📦 Exemplaires : <b>${copies}</b>${mutCount > 0 ? ` <span style="color:#ffd166">(${mutCount} 🧬)</span>` : ''}</div>
    <div>🔥 Multiplicateur : <b>×${fmt(petMult())}</b></div>
  `;
}

// Inject skin preview CSS dynamically (uses same vars as actual toilet)
(function injectSkinPreviewCSS(){
  const css = SKINS.map(sk => `
    .skin-preview[data-skin="${sk.id}"] .sp-tank { background: linear-gradient(180deg, var(--p-c1-${sk.id}), var(--p-c2-${sk.id}), var(--p-c3-${sk.id})); }
    .skin-preview[data-skin="${sk.id}"] .sp-seat { background: linear-gradient(180deg, var(--p-c1-${sk.id}), var(--p-c2-${sk.id}), var(--p-c4-${sk.id})); }
    .skin-preview[data-skin="${sk.id}"] .sp-bowl { background: radial-gradient(ellipse at 50% 30%, var(--p-bowl1-${sk.id}), var(--p-bowl3-${sk.id})); }
    .skin-preview[data-skin="${sk.id}"] .sp-water { background: linear-gradient(180deg, var(--p-w1-${sk.id}), var(--p-w2-${sk.id}), var(--p-w3-${sk.id})); }
    .skin-preview[data-skin="${sk.id}"] .sp-base { background: linear-gradient(180deg, var(--p-base1-${sk.id}), var(--p-base2-${sk.id}), var(--p-base3-${sk.id})); }
  `).join('\n');
  const root = document.documentElement;
  // Read computed vars from a hidden toilet for each skin
  const tmp = document.createElement('div');
  tmp.className = 'toilet';
  tmp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;visibility:hidden';
  document.body.appendChild(tmp);
  const vars = ['c1','c2','c3','c4','base1','base2','base3','w1','w2','w3','bowl1','bowl2','bowl3'];
  SKINS.forEach(sk => {
    tmp.dataset.skin = sk.id;
    const cs = getComputedStyle(tmp);
    vars.forEach(v => {
      root.style.setProperty(`--p-${v}-${sk.id}`, cs.getPropertyValue(`--skin-${v}`).trim());
    });
  });
  tmp.remove();
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// ===== Shop rendering =====
function renderShop() {
  shopList.innerHTML = '';
  TOILETS.forEach((t, idx) => {
    const owned = state.toilets[t.id] || 0;
    const cost = costOf(t);
    const unlocked = idx === 0
      || (state.toilets[TOILETS[idx-1].id]||0) > 0
      || state.totalPoop >= t.baseCost*0.5;
    const afford = state.poop >= cost;
    const tierMult = toiletTierMult(t.id);
    const nextTier = nextTierForToilet(t.id);
    const div = document.createElement('div');
    div.className = 'shop-item' + (!unlocked ? ' locked' : afford ? ' affordable' : '');
    div.dataset.id = t.id;
    const tierBadge = tierMult > 1 ? `<span class="tier-badge">×${tierMult}</span>` : '';
    const nextInfo = nextTier ? ` • prochain palier ${nextTier}` : ' • palier max';
    div.innerHTML = `
      <div class="icon">${unlocked?t.icon:'🔒'}</div>
      <div class="info">
        <span class="name">${unlocked?t.name:'???'}${tierBadge}</span>
        <span class="desc">${unlocked?t.desc:'Continue à produire pour débloquer'}</span>
        <span class="owned">Possédés : ${owned} • +${fmt(t.pps*tierMult*globalMult())}/s chacun${nextInfo}</span>
      </div>
      <div class="cost">${fmt(cost)} 💩</div>
    `;
    if (unlocked) div.addEventListener('click', () => buyToilet(t.id));
    shopList.appendChild(div);
  });

  renderEggs();
  renderPets();

  upgradeList.innerHTML = '';
  let visibleUp = 0;
  UPGRADES.forEach(u => {
    if (state.upgrades[u.id]) return;
    if (state.totalPoop < u.cost * 0.25) return;
    visibleUp++;
    const afford = state.poop >= u.cost;
    const div = document.createElement('div');
    div.className = 'shop-item' + (afford ? ' affordable' : '');
    div.innerHTML = `
      <div class="icon">${u.icon}</div>
      <div class="info">
        <span class="name">${u.name}</span>
        <span class="desc">${u.desc}</span>
      </div>
      <div class="cost">${fmt(u.cost)} 💩</div>
    `;
    div.addEventListener('click', () => buyUpgrade(u.id));
    upgradeList.appendChild(div);
  });
  if (visibleUp === 0) {
    upgradeList.innerHTML = '<p class="shop-sub" style="text-align:center">Continue à produire pour débloquer des améliorations…</p>';
  }

  prestigeList.innerHTML = '';
  PRESTIGE_UPGRADES.forEach(u => {
    const bought = !!state.prestigeUpgrades[u.id];
    const afford = (state.pd||0) >= u.cost;
    const div = document.createElement('div');
    div.className = 'shop-item prestige' + (bought ? ' bought' : afford ? ' affordable' : '');
    div.innerHTML = `
      <div class="icon">${u.icon}</div>
      <div class="info">
        <span class="name">${u.name}</span>
        <span class="desc">${u.desc}</span>
      </div>
      <div class="cost">${bought ? '✓ Acquis' : fmt(u.cost) + ' 🧻'}</div>
    `;
    if (!bought) div.addEventListener('click', () => buyPrestige(u.id));
    prestigeList.appendChild(div);
  });

  // Quests + Skins + Ascension/Eggs/Pets + Events + Leaderboard
  renderQuests();
  renderSkins();
  renderAscension();
  renderEggs();
  renderPets();
  renderEventBanner();
  renderLeaderboard();

  // Premium PayPal items
  premiumList.innerHTML = '';
  PREMIUM_ITEMS.forEach(it => {
    const bought = !!(state.premium && state.premium[it.id]);
    const div = document.createElement('div');
    div.className = 'shop-item premium' + (bought ? ' bought' : '');
    div.innerHTML = `
      <div class="icon">${it.icon}</div>
      <div class="info">
        <span class="name">${it.name}</span>
        <span class="desc">${it.desc}</span>
      </div>
      <div class="cost">${bought ? '✓ Acquis' : it.price.toFixed(2) + ' €'}</div>
    `;
    if (!bought) div.addEventListener('click', () => startPaypalCheckout(it));
    premiumList.appendChild(div);
  });
}

function buyToilet(id) {
  const t = TOILETS.find(x=>x.id===id);
  const cost = costOf(t);
  if (state.poop < cost) { toast('Pas assez de caca !'); return; }
  state.poop -= cost;
  const before = state.toilets[id]||0;
  state.toilets[id] = before + 1;
  flashItem(id);
  // Tier celebration
  if (TIER_MILESTONES.includes(state.toilets[id])) {
    toast(`🎉 Palier ${state.toilets[id]} atteint pour ${t.icon} ! Production ×2`);
    spawnConfetti(60); screenFlash();
  } else {
    toast(`${t.icon} ${t.name} acheté !`);
  }
  renderShop(); updateStats(); save();
}

function buyUpgrade(id) {
  const u = UPGRADES.find(x=>x.id===id);
  if (!u || state.upgrades[id]) return;
  if (state.poop < u.cost) { toast('Pas assez de caca !'); return; }
  state.poop -= u.cost;
  state.upgrades[id] = true;
  u.apply(state);
  toast(`${u.icon} ${u.name} débloqué !`);
  screenFlash();
  renderShop(); updateStats(); save();
}

function buyPrestige(id) {
  const u = PRESTIGE_UPGRADES.find(x=>x.id===id);
  if (!u || state.prestigeUpgrades[id]) return;
  if ((state.pd||0) < u.cost) { toast('Pas assez de Papier Doré !'); return; }
  state.pd -= u.cost;
  state.prestigeUpgrades[id] = true;
  applyAllPrestigeUpgrades();
  toast(`${u.icon} ${u.name} acquis !`);
  spawnConfetti(50); screenFlash();
  renderShop(); updateStats(); save();
}

function flashItem(id) {
  const el = shopList.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('bought-flash'); void el.offsetWidth;
  el.classList.add('bought-flash');
}

// ===== Ascension button =====
const ascendBtnEl = document.getElementById('ascendBtn');
if (ascendBtnEl) ascendBtnEl.addEventListener('click', ascend);

// ===== Prestige =====
prestigeBtn.addEventListener('click', () => {
  const gain = pdGainOnPrestige();
  if (gain <= 0) { toast('Atteins 1M de caca total avant de renaître'); return; }
  if (!confirm(`Renaître pour gagner ${fmt(gain)} 🧻 ?\nTu perds ton caca, tes toilettes et améliorations, mais gardes le Papier Doré et les améliorations de prestige.`)) return;
  state.pd = (state.pd||0) + gain;
  state.totalPdEarned = (state.totalPdEarned||0) + gain;
  state.prestigeCount = (state.prestigeCount||0) + 1;
  // wipe run
  state.poop = 0;
  state.totalPoop = 0;
  state.perClickAdd = 0;
  state.clickMult = 1;
  state.clickSynergy = 0;
  state.mult = 1;
  state.toilets = Object.fromEntries(TOILETS.map(t=>[t.id,0]));
  state.upgrades = {};
  // re-apply perm bonuses (startBonus etc.)
  applyAllPrestigeUpgrades();
  if (state.startBonus > 0) {
    state.poop = state.startBonus;
    state.totalPoop = state.startBonus;
  }
  renderShop(); updateStats(); save();
  toast(`♻️ Renaissance ! +${fmt(gain)} 🧻`);
  spawnConfetti(150); screenFlash();
});

// ===== Toilet click =====
const CRIT_CHANCE = 0.08;   // base 8% chance
const CRIT_MULT = 5;        // base ×5
function clickToilet(x, y, fromAuto=false) {
  const critChance = CRIT_CHANCE + (state.critBonus||0);
  const critMult = CRIT_MULT + (state.critMultBonus||0);
  const isCrit = !fromAuto && Math.random() < critChance;
  let gain = perClick();
  if (isCrit) gain *= critMult;
  state.poop += gain;
  state.totalPoop += gain;
  if (!fromAuto) {
    state.clicks = (state.clicks||0) + 1;
    if (isCrit) state.crits = (state.crits||0) + 1;
  }

  if (x !== undefined) {
    spawnFloat(isCrit ? `CRITIQUE ! +${fmt(gain)} 💩` : `+${fmt(gain)} 💩`, x, y, isCrit);
    spawnParticles(x, y, Math.min(14, 4 + Math.floor(Math.log10(gain+1))), isCrit);
    spawnSparkles(x, y, isCrit ? 12 : 4);
    spawnRipple(x, y);
  }
  addPoopVisual();

  if (!fromAuto) {
    if (isCrit) {
      toiletEl.classList.remove('crit'); void toiletEl.offsetWidth;
      toiletEl.classList.add('crit');
    } else {
      toiletEl.classList.remove('shake'); void toiletEl.offsetWidth;
      toiletEl.classList.add('shake');
    }
    if (Math.random() < 0.15) {
      toiletEl.classList.remove('flush'); void toiletEl.offsetWidth;
      toiletEl.classList.add('flush');
    }
  }
  bump(poopCountEl);
  updateStats();
  renderShopAffordability();
}

toiletEl.addEventListener('click', (e) => {
  const parentRect = floatLayer.getBoundingClientRect();
  clickToilet(e.clientX - parentRect.left, e.clientY - parentRect.top);
});

function spawnFloat(text, x, y, crit=false) {
  const el = document.createElement('div');
  el.className = 'float-text' + (crit?' crit':'');
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  floatLayer.appendChild(el);
  setTimeout(()=>el.remove(), crit?1500:1200);
}
function spawnParticles(x, y, n, crit=false) {
  const emojis = crit ? ['💩','✨','⭐','🌟','�'] : ['💩','�💨','✨'];
  for (let i=0;i<n;i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.fontSize = (crit?20:16) + 'px';
    const angle = Math.random()*Math.PI*2;
    const dist = (crit?100:60) + Math.random()*(crit?180:120);
    p.style.setProperty('--tx', Math.cos(angle)*dist+'px');
    p.style.setProperty('--ty', Math.sin(angle)*dist - 40 + 'px');
    p.style.setProperty('--r', (Math.random()*720-360)+'deg');
    particleLayer.appendChild(p);
    setTimeout(()=>p.remove(), 1100);
  }
}
function spawnSparkles(x, y, n) {
  for (let i=0;i<n;i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    const angle = Math.random()*Math.PI*2;
    const dist = 40 + Math.random()*80;
    s.style.setProperty('--tx', Math.cos(angle)*dist+'px');
    s.style.setProperty('--ty', Math.sin(angle)*dist+'px');
    particleLayer.appendChild(s);
    setTimeout(()=>s.remove(), 1300);
  }
}
function spawnRipple(x, y) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.left = x + 'px';
  r.style.top = y + 'px';
  particleLayer.appendChild(r);
  setTimeout(()=>r.remove(), 700);
}
const ambientLayer = document.getElementById('ambientLayer');
function spawnAmbient() {
  if (!ambientLayer) return;
  const rect = ambientLayer.getBoundingClientRect();
  const a = document.createElement('div');
  a.className = 'ambient';
  const emojis = ['💩','✨','💫','🧻','💨'];
  a.textContent = emojis[Math.floor(Math.random()*emojis.length)];
  a.style.left = (Math.random()*rect.width) + 'px';
  a.style.top = rect.height + 'px';
  a.style.fontSize = (10 + Math.random()*12) + 'px';
  a.style.setProperty('--drift', (Math.random()*100-50)+'px');
  a.style.animationDuration = (6+Math.random()*5) + 's';
  ambientLayer.appendChild(a);
  setTimeout(()=>a.remove(), 12000);
}
setInterval(spawnAmbient, 700);

function screenFlash() {
  const f = document.createElement('div');
  f.className = 'screen-flash';
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), 600);
}
function spawnConfetti(n=80) {
  const colors = ['#ffd166','#ff8e53','#e44e7b','#7b3fe4','#3fb6e4','#5cdb95'];
  for (let i=0;i<n;i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw';
    c.style.top = '-20px';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.transform = 'rotate('+(Math.random()*360)+'deg)';
    c.style.animationDelay = (Math.random()*0.5) + 's';
    c.style.animationDuration = (2 + Math.random()*1.5) + 's';
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 4500);
  }
}
function addPoopVisual() {
  const max = 8;
  const el = document.createElement('span');
  el.className = 'pp';
  el.textContent = '💩';
  poopStack.appendChild(el);
  while (poopStack.children.length > max) poopStack.firstChild.remove();
  setTimeout(()=>{ if (el.parentNode) el.remove(); }, 2500);
}

function renderShopAffordability() {
  shopList.querySelectorAll('.shop-item').forEach(el=>{
    const id = el.dataset.id; if (!id) return;
    const t = TOILETS.find(x=>x.id===id); if (!t) return;
    const cost = costOf(t);
    el.classList.toggle('affordable', !el.classList.contains('locked') && state.poop >= cost);
  });
}

// ===== Toast =====
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toastEl.classList.remove('show'), 1800);
}

// ===== Reset =====
resetBtn.addEventListener('click', ()=>{
  if (!confirm('Tout réinitialiser ? Tu perds AUSSI ton Papier Doré 🧻 et tes améliorations permanentes.')) return;
  state = defaultState();
  save(); renderShop(); updateStats();
  toast('Partie réinitialisée');
});

// ===== Game loop =====
let lastTime = performance.now();
let lastShopRender = 0;
let autoClickAcc = 0;
function tick(now) {
  const dt = (now - lastTime)/1000;
  lastTime = now;
  const gain = perSecond() * dt;
  if (gain > 0) {
    state.poop += gain;
    state.totalPoop += gain;
  }
  // Gem mining (every 5 minutes)
  if (state.gemMine > 0) {
    if (!state.lastGemMine) state.lastGemMine = Date.now();
    if (Date.now() - state.lastGemMine >= 300000) {
      const minedGems = Math.floor(state.gemMine * gemBonusMult());
      state.gems = (state.gems||0) + minedGems;
      state.totalGems = (state.totalGems||0) + minedGems;
      state.lastGemMine = Date.now();
      toast(`⛏️ +${minedGems} 💎 minés !`);
    }
  }
  // Auto-click from prestige upgrades
  if (state.autoClick > 0) {
    autoClickAcc += state.autoClick * dt;
    while (autoClickAcc >= 1) {
      autoClickAcc -= 1;
      // silent click (no particles to keep perf)
      const g = perClick();
      state.poop += g;
      state.totalPoop += g;
    }
  }
  updateStats();
  if (now - lastShopRender > 500) {
    renderShop();
    lastShopRender = now;
  }
  requestAnimationFrame(tick);
}

setInterval(save, 5000);
setInterval(syncToBackend, 10000); // Sync to backend every 10 seconds
setInterval(fetchActiveEvents, 5000); // Poll events every 5 seconds
setInterval(fetchAnnouncement, 5000); // Poll announcements every 5 seconds
window.addEventListener('beforeunload', save);

// ===== Auth UI wiring =====
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authUserInput = document.getElementById('authUser');
const authPassInput = document.getElementById('authPass');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const guestBtn = document.getElementById('guestBtn');
const userLabel = document.getElementById('userLabel');
const logoutBtn = document.getElementById('logoutBtn');
let authMode = 'login';

document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b === btn));
    authMode = btn.dataset.mode;
    authSubmit.textContent = authMode === 'login' ? 'Se connecter' : "S'inscrire";
    authError.textContent = '';
  });
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const u = authUserInput.value, p = authPassInput.value;
  // === Admin shortcut ===
  if (u.trim().toLowerCase() === ADMIN_USER && p === ADMIN_PASS) {
    try {
      const data = await apiCall('/auth/login', 'POST', { username: ADMIN_USER, password: ADMIN_PASS });
      AUTH_TOKEN = data.token;
      localStorage.setItem(SESSION_KEY, data.token);
      CURRENT_USER = ADMIN_USER;
      authOverlay.classList.add('hidden');
      openAdminPanel();
      return;
    } catch(err) {
      console.error('Admin login error:', err);
      authError.textContent = 'Erreur de connexion admin';
      return;
    }
  }
  try {
    let username;
    if (authMode === 'signup') {
      username = await signup(u, p);
      // auto-login after signup
      await login(u, p);
    } else {
      username = await login(u, p);
    }
    startGame(username);
  } catch (err) {
    console.error('Auth error:', err);
    if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
      authError.textContent = 'Impossible de contacter le serveur. Vérifie ta connexion ou joue en invité.';
    } else {
      authError.textContent = err.message || 'Erreur de connexion';
    }
  }
});

guestBtn.addEventListener('click', () => startGame(null));

logoutBtn.addEventListener('click', () => {
  if (confirm('Se déconnecter ? Ta progression est sauvegardée.')) logout();
});

// Admin button
const adminBtn = document.getElementById('adminBtn');
if (adminBtn) {
  adminBtn.addEventListener('click', () => {
    if (CURRENT_USER === ADMIN_USER || localStorage.getItem(SESSION_KEY) === '__admin__') {
      openAdminPanel();
    } else {
      toast('Accès admin réservé');
    }
  });
}

async function startGame(username) {
  CURRENT_USER = username;
  if (username) localStorage.setItem(SESSION_KEY, AUTH_TOKEN);
  else localStorage.removeItem(SESSION_KEY);
  // Show admin button if user is admin
  if (adminBtn) {
    if (username === ADMIN_USER || localStorage.getItem(SESSION_KEY) === '__admin__') {
      adminBtn.style.display = 'inline-block';
    } else {
      adminBtn.style.display = 'none';
    }
  }
  // Load this user's save from backend if logged in, otherwise localStorage
  if (username && AUTH_TOKEN) {
    try {
      const backendState = await loadFromBackend();
      if (backendState) {
        state = backendState;
      } else {
        state = load() || defaultState();
      }
    } catch(e) {
      console.error('Backend load failed, using localStorage:', e);
      state = load() || defaultState();
    }
  } else {
    state = load() || defaultState();
  }
  applyAllPrestigeUpgrades();
  // Apply equipped skin
  toiletEl.dataset.skin = state.skin || 'default';
  // Hide overlay
  authOverlay.classList.add('hidden');
  userLabel.textContent = '👤 ' + (username || 'invité');
  // Boot game
  renderShop();
  updateStats();
  refreshAnnouncement();
  refreshPoll();
  refreshOnlineCount();
  pingHeartbeat();
  showQueuedMessages();
  fetchActiveEvents().then(() => {
    renderEventBanner();
  });
  requestAnimationFrame(t => { lastTime = t; tick(t); });
}

// =====================================================
// ===== Admin / Announcements / Polls / Online =======
// =====================================================
const ADMIN_USER = 'ansaru';
const ADMIN_PASS = 'AnsaruDev';
const ANNOUNCE_KEY = 'caca-announce-v1';
const POLL_KEY = 'caca-poll-v1';
const HB_KEY = 'caca-heartbeats-v1';
const HB_TTL = 15000; // 15s

// Cross-tab live updates
const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('caca-sim') : null;
function broadcast(msg) { if (bc) try { bc.postMessage(msg); } catch(e){} }

// Storage helpers
function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch(e) { return fallback; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function getUserSave(user) { return readJSON(SAVE_PREFIX + user, null); }
function setUserSave(user, s) { localStorage.setItem(SAVE_PREFIX + user, JSON.stringify(s)); }

// ---------- Heartbeats / Online ----------
function pingHeartbeat() {
  if (!CURRENT_USER) return;
  const h = readJSON(HB_KEY, {});
  h[CURRENT_USER] = Date.now();
  writeJSON(HB_KEY, h);
}
function getOnlineUsers() {
  const h = readJSON(HB_KEY, {});
  const now = Date.now();
  return Object.entries(h).filter(([_,t]) => now - t < HB_TTL).map(([u]) => u);
}
function refreshOnlineCount() {
  const list = getOnlineUsers();
  const el = document.getElementById('onlineCount');
  if (el) el.textContent = list.length;
  const adminEl = document.getElementById('adminOnlineCount');
  if (adminEl) adminEl.textContent = list.length;
}
setInterval(() => { pingHeartbeat(); refreshOnlineCount(); if (adminPanelEl && !adminPanelEl.classList.contains('hidden')) renderAdminUsers(); }, 5000);
window.addEventListener('beforeunload', () => {
  if (!CURRENT_USER) return;
  const h = readJSON(HB_KEY, {});
  delete h[CURRENT_USER];
  writeJSON(HB_KEY, h);
});

// ---------- Announcement (player view) ----------
const announcementEl = document.getElementById('announcementBanner');
const announcementText = document.getElementById('announcementText');
const announcementClose = document.getElementById('announcementClose');
let dismissedAnnounceId = null;
announcementClose.addEventListener('click', () => {
  if (cachedAnnouncement) dismissedAnnounceId = cachedAnnouncement.id;
  announcementEl.classList.add('hidden');
});
function refreshAnnouncement() {
  const a = cachedAnnouncement;
  if (!a || !a.text || a.id === dismissedAnnounceId) {
    announcementEl.classList.add('hidden');
    return;
  }
  announcementText.textContent = a.text;
  announcementEl.classList.remove('hidden');
}

// ---------- Poll (player view) ----------
const pollEl = document.getElementById('pollWidget');
const pollQuestion = document.getElementById('pollQuestion');
const pollOptionsEl = document.getElementById('pollOptions');
const pollFooter = document.getElementById('pollFooter');
function refreshPoll() {
  const poll = readJSON(POLL_KEY, null);
  if (!poll || !poll.options || !poll.options.length) {
    pollEl.classList.add('hidden');
    return;
  }
  pollEl.classList.remove('hidden');
  pollQuestion.textContent = '📊 ' + poll.question;
  const votes = poll.votes || {};
  const counts = poll.options.map((_, i) => Object.values(votes).filter(v => v === i).length);
  const total = counts.reduce((a,b) => a+b, 0);
  const myVote = CURRENT_USER ? votes[CURRENT_USER] : undefined;
  pollOptionsEl.innerHTML = '';
  poll.options.forEach((opt, i) => {
    const pct = total ? Math.round(counts[i] / total * 100) : 0;
    const div = document.createElement('div');
    div.className = 'poll-option' + (myVote === i ? ' voted' : '');
    div.innerHTML = `
      <div class="bar" style="width:${pct}%"></div>
      <span class="opt-text">${myVote === i ? '✅ ' : ''}${opt}</span>
      <span class="pct">${pct}% • ${counts[i]}</span>
    `;
    if (myVote === undefined && CURRENT_USER) {
      div.addEventListener('click', () => votePoll(poll.id, i));
    }
    pollOptionsEl.appendChild(div);
  });
  pollFooter.textContent = `${total} vote${total>1?'s':''} • ${myVote!==undefined?'Tu as voté':'Clique pour voter'}`;
}
function votePoll(pollId, optionIndex) {
  const poll = readJSON(POLL_KEY, null);
  if (!poll || poll.id !== pollId || !CURRENT_USER) return;
  poll.votes = poll.votes || {};
  poll.votes[CURRENT_USER] = optionIndex;
  writeJSON(POLL_KEY, poll);
  broadcast({ type: 'poll-update' });
  refreshPoll();
  toast('Vote enregistré !');
}

// ---------- BroadcastChannel listener ----------
if (bc) {
  bc.onmessage = (ev) => {
    const m = ev.data || {};
    if (m.type === 'announce-update') refreshAnnouncement();
    if (m.type === 'poll-update') { refreshPoll(); if (adminPanelEl && !adminPanelEl.classList.contains('hidden')) renderAdminPollResults(); }
    if (m.type === 'event-update') { renderEventBanner(); if (document.getElementById('eggList')) renderEggs(); if (adminPanelEl && !adminPanelEl.classList.contains('hidden')) renderAdminEvents(); }
    if (m.type === 'admin-modify' && m.user === CURRENT_USER) {
      // Reload our state from disk
      const fresh = load();
      if (fresh) { state = fresh; applyAllPrestigeUpgrades(); updateStats(); renderShop(); toast('🛡️ Ton compte vient d\'être modifié par un admin'); }
    }
    if (m.type === 'admin-msg' && m.user === CURRENT_USER) {
      toast(`📨 Admin : ${m.text}`);
      // remove from queue once shown
      const q = readJSON('caca-msgs-' + CURRENT_USER, []);
      const idx = q.findIndex(x => x.text === m.text);
      if (idx >= 0) { q.splice(idx, 1); writeJSON('caca-msgs-' + CURRENT_USER, q); }
    }
    if (m.type === 'kick' && m.user === CURRENT_USER) {
      alert('Tu as été déconnecté par un admin.');
      logout();
    }
    if (m.type === 'heartbeat') refreshOnlineCount();
  };
}

// On login, show any queued admin messages
function showQueuedMessages() {
  if (!CURRENT_USER) return;
  const q = readJSON('caca-msgs-' + CURRENT_USER, []);
  if (!q.length) return;
  q.forEach((m, i) => {
    setTimeout(() => toast(`📨 Admin : ${m.text}`), 500 + i * 2200);
  });
  localStorage.removeItem('caca-msgs-' + CURRENT_USER);
}

// =====================================================
// ===== Admin panel ===================================
// =====================================================
const adminPanelEl = document.getElementById('adminPanel');
const adminUsersListEl = document.getElementById('adminUsersList');
const adminUserCountEl = document.getElementById('adminUserCount');
const adminUserSearch = document.getElementById('adminUserSearch');
const adminAnnounceInput = document.getElementById('adminAnnounceInput');
const adminAnnouncePublish = document.getElementById('adminAnnouncePublish');
const adminAnnounceClear = document.getElementById('adminAnnounceClear');
const adminAnnounceCurrent = document.getElementById('adminAnnounceCurrent');
const adminPollQuestion = document.getElementById('adminPollQuestion');
const adminPollOptions = document.getElementById('adminPollOptions');
const adminPollAddOption = document.getElementById('adminPollAddOption');
const adminPollPublish = document.getElementById('adminPollPublish');
const adminPollClear = document.getElementById('adminPollClear');
const adminPollResults = document.getElementById('adminPollResults');
const adminEvtClearAll = document.getElementById('adminEvtClearAll');
const adminEvtRefresh = document.getElementById('adminEvtRefresh');
const adminEventListEl = document.getElementById('adminEventList');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

const adminUserModal = document.getElementById('adminUserModal');
const adminUserModalTitle = document.getElementById('adminUserModalTitle');
const adminUserModalInfo = document.getElementById('adminUserModalInfo');
const adminUserModalClose = document.getElementById('adminUserModalClose');
const adminGiveAmount = document.getElementById('adminGiveAmount');

function openAdminPanel() {
  adminPanelEl.classList.remove('hidden');
  // hide game UI
  document.querySelector('.topbar').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  announcementEl.classList.add('hidden');
  pollEl.classList.add('hidden');
  renderAdminUsers();
  renderAdminAnnouncement();
  renderAdminPollEditor();
  renderAdminPollResults();
  renderAdminEvents();
  refreshOnlineCount();
}

adminLogoutBtn.addEventListener('click', () => {
  if (!confirm('Déconnexion de l\'admin ?')) return;
  localStorage.removeItem(SESSION_KEY);
  location.reload();
});

// ----- Users list -----
async function renderAdminUsers() {
  try {
    const users = await apiCall('/admin/users');
    adminUserCountEl.textContent = users.length;
    const online = new Set(getOnlineUsers());
    const filter = (adminUserSearch.value || '').trim().toLowerCase();
    adminUsersListEl.innerHTML = '';
    users.filter(u => !filter || u.username.includes(filter)).forEach(u => {
      const s = u.gameState || {};
      const row = document.createElement('div');
      row.className = 'admin-user-row' + (online.has(u.username) ? ' online' : '');
      row.innerHTML = `
        <div>
          <div class="uname">${u.username} ${u.banned ? '🚫' : ''}</div>
          <div class="ustats">💩 ${fmt(s.poop||0)} • Total ${fmt(s.totalPoop||0)} • 🧻 ${fmt(s.pd||0)} • ✨ ${fmt(s.ap||0)}</div>
        </div>
        <div class="ustats">${online.has(u.username) ? 'En ligne' : 'Hors-ligne'}</div>
        <div class="uonline"></div>
      `;
      row.addEventListener('click', () => openAdminUserModal(u.username, s));
      adminUsersListEl.appendChild(row);
    });
    if (!users.length) {
      adminUsersListEl.innerHTML = '<p class="shop-sub" style="text-align:center;padding:20px">Aucun compte enregistré pour le moment.</p>';
    }
  } catch(e) {
    console.error('Error loading admin users:', e);
    adminUsersListEl.innerHTML = '<p class="shop-sub" style="text-align:center;padding:20px">Erreur de chargement des utilisateurs.</p>';
  }
}
adminUserSearch.addEventListener('input', renderAdminUsers);

// ----- User modal -----
let adminCurrentUser = null;
let adminCurrentUserData = null;
async function openAdminUserModal(user, gameState = null) {
  adminCurrentUser = user;
  const s = gameState || {};
  const banned = s.banned || false;
  adminUserModalTitle.textContent = (banned ? '🚫 ' : '👤 ') + user;
  adminCurrentUserData = s;
  adminUserModalInfo.innerHTML = `
    <div>💩 Caca : <b>${fmt(s.poop||0)}</b> &nbsp; • &nbsp; 📈 Total : <b>${fmt(s.totalPoop||0)}</b></div>
    <div>🧻 Papier Doré : <b>${fmt(s.pd||0)}</b> &nbsp; • &nbsp; ♻️ Total PD à vie : <b>${fmt(s.totalPdEarned||0)}</b></div>
    <div>🚽 Toilettes : <b>${Object.values(s.toilets||{}).reduce((a,b)=>a+b,0)}</b> &nbsp; • &nbsp; ⚡ Améliorations : <b>${Object.keys(s.upgrades||{}).length}</b> + <b>${Object.keys(s.prestigeUpgrades||{}).length}</b> perm.</div>
    <div>💎 Gems : <b>${fmt(s.gems||0)}</b> &nbsp; • &nbsp; ✨ AP : <b>${fmt(s.ap||0)}</b> &nbsp; • &nbsp; 🐾 Pets : <b>${Object.values(s.pets||{}).reduce((a,b)=>a+b,0)}</b></div>
    <div>🎨 Skin : <b>${s.skin||'default'}</b> &nbsp; • &nbsp; 🆙 Ascensions : <b>${s.ascensionCount||0}</b></div>
    <div>🎁 Gamepass : <b>${Object.keys(s.premium||{}).filter(k=>s.premium[k]).length}/${PREMIUM_ITEMS.length}</b> &nbsp; • &nbsp; Statut : <b style="color:${banned?'var(--bad)':'var(--good)'}">${banned?'BANNI':'OK'}</b></div>
  `;
  // Populate toilet select
  const sel = document.getElementById('adminToiletSelect');
  sel.innerHTML = TOILETS.map(t => `<option value="${t.id}">${t.icon} ${t.name} (possède ${s.toilets?.[t.id]||0})</option>`).join('');
  // Populate pet select
  const petSel = document.getElementById('adminPetSelect');
  if (petSel) {
    petSel.innerHTML = PETS.map(p => `<option value="${p.id}">${p.icon} ${p.name} [${RARITY_LABEL[p.rarity]}] (×${(s.pets?.[p.id]||0)})</option>`).join('');
  }
  // Populate gamepass row
  const gpRow = document.getElementById('adminGamepassRow');
  gpRow.innerHTML = '';
  PREMIUM_ITEMS.forEach(it => {
    const active = !!(s.premium && s.premium[it.id]);
    const btn = document.createElement('button');
    btn.className = 'gamepass-btn' + (active ? ' active' : '');
    btn.innerHTML = `${it.icon} ${active ? '✓ ' : ''}${it.name}`;
    btn.addEventListener('click', () => toggleGamepass(user, it.id));
    gpRow.appendChild(btn);
  });
  adminGiveAmount.value = '';
  document.getElementById('adminMsgInput').value = '';
  document.getElementById('adminNewPass').value = '';
  document.getElementById('adminNewName').value = '';
  adminUserModal.classList.remove('hidden');
}

function toggleGamepass(user, itemId) {
  const s = getUserSave(user) || defaultState();
  s.premium = s.premium || {};
  s.premium[itemId] = !s.premium[itemId];
  setUserSave(user, s);
  broadcast({ type: 'admin-modify', user });
  toast(`Gamepass ${itemId} : ${s.premium[itemId] ? 'activé' : 'désactivé'} pour ${user}`);
  openAdminUserModal(user);
}
adminUserModalClose.addEventListener('click', () => adminUserModal.classList.add('hidden'));
adminUserModal.addEventListener('click', (e) => { if (e.target === adminUserModal) adminUserModal.classList.add('hidden'); });

adminUserModal.querySelectorAll('[data-act]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const act = btn.dataset.act;
    if (!adminCurrentUser) return;
    const u = adminCurrentUser;
    const amt = parseFloat(adminGiveAmount.value) || 0;
    let refreshOnly = false;

    try {
      switch (act) {
        // ===== Économie =====
        case 'givePoop':
          if (amt <= 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'givePoop', amount: amt });
          toast(`+${fmt(amt)} 💩 → ${u}`);
          break;
        case 'setPoop':
          if (amt < 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setPoop', amount: amt });
          toast(`Caca de ${u} défini à ${fmt(amt)}`);
          break;
        case 'multPoop':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'multPoop', amount: 10 });
          toast(`Caca de ${u} ×10`);
          break;
        case 'maxPoop':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setPoop', amount: 1e18 });
          toast(`💥 Caca max pour ${u}`);
          break;
        case 'givePD':
          if (amt <= 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'givePD', amount: amt });
          toast(`+${fmt(amt)} 🧻 → ${u}`);
          break;
        case 'setPD':
          if (amt < 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setPD', amount: amt });
          toast(`🧻 de ${u} défini à ${fmt(amt)}`);
          break;
        case 'multPD':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'multPD', amount: 10 });
          toast(`🧻 de ${u} ×10`);
          break;
        case 'maxPD':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setPD', amount: 10000 });
          toast(`💥 🧻 max pour ${u}`);
          break;
        case 'giveGems':
          if (amt <= 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'giveGems', amount: amt });
          toast(`+${fmt(amt)} 💎 → ${u}`);
          break;
        case 'setGems':
          if (amt < 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setGems', amount: amt });
          toast(`💎 de ${u} défini à ${fmt(amt)}`);
          break;
        case 'multGems':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'multGems', amount: 10 });
          toast(`💎 de ${u} ×10`);
          break;
        case 'maxGems':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setGems', amount: 10000 });
          toast(`💥 💎 max pour ${u}`);
          break;
        case 'giveAP':
          if (amt <= 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'giveAP', amount: amt });
          toast(`+${fmt(amt)} ✨ → ${u}`);
          break;
        case 'setAP':
          if (amt < 0) return toast('Montant invalide');
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setAP', amount: amt });
          toast(`✨ de ${u} défini à ${fmt(amt)}`);
          break;
        case 'multAP':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'multAP', amount: 10 });
          toast(`✨ de ${u} ×10`);
          break;
        case 'maxAP':
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'setAP', amount: 100000 });
          toast(`💥 ✨ max pour ${u}`);
          break;
        case 'givePet': {
          const id = document.getElementById('adminPetSelect').value;
          const qty = parseInt(document.getElementById('adminPetQty').value) || 1;
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'givePet', itemId: id, amount: qty });
          const p = PETS.find(x=>x.id===id);
          toast(`+${qty} ${p.icon} ${p.name} → ${u}`);
          break;
        }
        case 'clearPets':
          if (!confirm(`Supprimer tous les pets de ${u} ?`)) return;
          await apiCall('/admin/giveItem', 'POST', { username: u, action: 'clearPets' });
          toast(`Pets de ${u} effacés`);
          break;

        // ===== Toilettes =====
        case 'giveToilet': {
          const id = document.getElementById('adminToiletSelect').value;
          const qty = parseInt(document.getElementById('adminToiletQty').value) || 1;
          const t = TOILETS.find(x=>x.id===id);
          // Note: Toilets not fully implemented in backend API, would need to extend giveItem endpoint
          toast(`+${qty} ${t.icon} ${t.name} → ${u} (non implémenté dans API)`);
          break;
        }
        case 'clearToilets':
          if (!confirm(`Vider toutes les toilettes de ${u} ?`)) return;
          toast(`Toilettes de ${u} vidées (non implémenté dans API)`);
          break;

        // ===== Améliorations =====
        case 'unlockAllUpgrades':
          toast(`🔓 Toutes améliorations débloquées pour ${u} (non implémenté dans API)`);
          break;
        case 'unlockAllPrestige':
          toast(`🔓 Tout le prestige débloqué pour ${u} (non implémenté dans API)`);
          break;
        case 'resetUpgrades':
          if (!confirm(`Reset des améliorations de ${u} ?`)) return;
          toast(`Améliorations reset pour ${u} (non implémenté dans API)`);
          break;
        case 'resetPrestigeUp':
          if (!confirm(`Reset des améliorations prestige de ${u} ?`)) return;
          toast(`Prestige reset pour ${u} (non implémenté dans API)`);
          break;

      // ===== Message privé =====
      case 'sendMsg': {
        const txt = document.getElementById('adminMsgInput').value.trim();
        if (!txt) return toast('Message vide');
        // Store as queued msg for offline users + broadcast for online
        const queue = readJSON('caca-msgs-' + u, []);
        queue.push({ text: txt, ts: Date.now() });
        writeJSON('caca-msgs-' + u, queue);
        broadcast({ type: 'admin-msg', user: u, text: txt });
        toast(`📨 Message envoyé à ${u}`);
        document.getElementById('adminMsgInput').value = '';
        refreshOnly = true;
        break;
      }

      // ===== Sécurité =====
      case 'changePass': {
        const np = document.getElementById('adminNewPass').value;
        if (np.length < 3) return toast('Mdp trop court');
        await apiCall('/admin/changePassword', 'POST', { username: u, newPassword: np });
        toast(`🔑 Mdp de ${u} changé`);
        document.getElementById('adminNewPass').value = '';
        refreshOnly = true;
        break;
      }
      case 'toggleBan': {
        const currentBanned = adminCurrentUserData?.banned || false;
        await apiCall('/admin/ban', 'POST', { username: u, banned: !currentBanned });
        toast(currentBanned ? `✅ ${u} débanni` : `🚫 ${u} banni`);
        refreshOnly = true;
        break;
      }

      // ===== Modération =====
      case 'kick':
        broadcast({ type: 'kick', user: u });
        toast(`👢 Kick demandé pour ${u} (effectif si en ligne)`);
        refreshOnly = true;
        break;
      case 'prestige':
      case 'reset':
      case 'delete':
        toast(`Action non implémentée dans l'API`);
        break;
      }

      if (!refreshOnly) {
        renderAdminUsers();
        openAdminUserModal(u);
      } else {
        renderAdminUsers();
      }
    } catch(e) {
      console.error('Admin action error:', e);
      toast(`Erreur: ${e.message || 'Erreur serveur'}`);
    }
  });
});

// ----- Announcement editor -----
async function renderAdminAnnouncement() {
  await fetchAnnouncement();
  if (cachedAnnouncement && cachedAnnouncement.text) {
    adminAnnounceInput.value = cachedAnnouncement.text;
    adminAnnounceCurrent.textContent = `📢 Active : "${cachedAnnouncement.text}"`;
  } else {
    adminAnnounceCurrent.textContent = 'Aucune annonce active.';
  }
}
adminAnnouncePublish.addEventListener('click', async () => {
  const text = adminAnnounceInput.value.trim();
  if (await setAnnouncement(text)) {
    await renderAdminAnnouncement();
    toast('Annonce publiée !');
  }
});
adminAnnounceClear.addEventListener('click', async () => {
  if (confirm('Supprimer l\'annonce ?')) {
    if (await clearAnnouncement()) {
      await renderAdminAnnouncement();
      adminAnnounceInput.value = '';
      toast('Annonce supprimée');
    }
  }
});

// ----- Poll editor -----
let adminPollDraftOptions = ['', ''];
function renderAdminPollEditor() {
  const poll = readJSON(POLL_KEY, null);
  if (poll) {
    adminPollQuestion.value = poll.question || '';
    adminPollDraftOptions = [...poll.options];
  }
  adminPollOptions.innerHTML = '';
  adminPollDraftOptions.forEach((opt, i) => {
    const row = document.createElement('div');
    row.className = 'admin-poll-row';
    row.innerHTML = `<input class="admin-input" type="text" placeholder="Option ${i+1}" value="${opt.replace(/"/g,'&quot;')}" />
                     <button title="Supprimer">×</button>`;
    const input = row.querySelector('input');
    input.addEventListener('input', () => { adminPollDraftOptions[i] = input.value; });
    row.querySelector('button').addEventListener('click', () => {
      adminPollDraftOptions.splice(i, 1);
      if (adminPollDraftOptions.length < 2) adminPollDraftOptions.push('');
      renderAdminPollEditor();
    });
    adminPollOptions.appendChild(row);
  });
}
adminPollAddOption.addEventListener('click', () => {
  if (adminPollDraftOptions.length >= 8) { toast('Maximum 8 options'); return; }
  adminPollDraftOptions.push('');
  renderAdminPollEditor();
});
adminPollPublish.addEventListener('click', () => {
  const q = adminPollQuestion.value.trim();
  const opts = adminPollDraftOptions.map(o => o.trim()).filter(Boolean);
  if (!q) { toast('Question vide'); return; }
  if (opts.length < 2) { toast('Au moins 2 options'); return; }
  const existing = readJSON(POLL_KEY, null);
  const keepVotes = existing && existing.question === q && JSON.stringify(existing.options) === JSON.stringify(opts);
  writeJSON(POLL_KEY, {
    id: keepVotes ? existing.id : Date.now(),
    question: q,
    options: opts,
    votes: keepVotes ? existing.votes : {},
    ts: Date.now(),
  });
  broadcast({ type: 'poll-update' });
  renderAdminPollResults();
  toast('📊 Sondage publié !');
});
adminPollClear.addEventListener('click', () => {
  if (!confirm('Supprimer le sondage actif et toutes les votes ?')) return;
  localStorage.removeItem(POLL_KEY);
  adminPollDraftOptions = ['', ''];
  adminPollQuestion.value = '';
  broadcast({ type: 'poll-update' });
  renderAdminPollEditor();
  renderAdminPollResults();
  toast('Sondage supprimé');
});

function renderAdminPollResults() {
  const poll = readJSON(POLL_KEY, null);
  adminPollResults.innerHTML = '';
  if (!poll) return;
  const votes = poll.votes || {};
  const counts = poll.options.map((_, i) => Object.values(votes).filter(v => v === i).length);
  const total = counts.reduce((a,b)=>a+b, 0);
  const header = document.createElement('p');
  header.className = 'shop-sub';
  header.style.margin = '4px 0';
  header.innerHTML = `<b>"${poll.question}"</b> — ${total} vote${total>1?'s':''}`;
  adminPollResults.appendChild(header);
  poll.options.forEach((opt, i) => {
    const pct = total ? Math.round(counts[i]/total*100) : 0;
    const div = document.createElement('div');
    div.className = 'admin-poll-result';
    div.innerHTML = `
      <div class="bar" style="width:${pct}%"></div>
      <span>${opt}</span>
      <span class="count">${counts[i]} (${pct}%)</span>
    `;
    adminPollResults.appendChild(div);
  });
}

function renderAdminEvents() {
  if (!adminEventListEl) return;
  const active = getActiveEvents();
  adminEventListEl.innerHTML = '';
  ADMIN_EVENTS.forEach(evt => {
    const isOn = !!active[evt.id];
    const div = document.createElement('div');
    div.className = 'admin-event-item' + (isOn ? ' active' : '');
    div.innerHTML = `
      <div class="evt-icon">${evt.icon}</div>
      <div class="evt-info">
        <div class="evt-name">${evt.name}</div>
        <div class="evt-desc">${evt.desc}</div>
      </div>
      <button class="evt-toggle" data-id="${evt.id}">${isOn ? 'Actif ✅' : 'Inactif'}</button>
    `;
    const btn = div.querySelector('.evt-toggle');
    btn.addEventListener('click', () => {
      const on = !isEventOn(evt.id);
      toggleBackendEvent(evt.id, on).then(() => {
        renderAdminEvents();
        renderEventBanner();
        if (document.getElementById('eggList')) renderEggs();
      });
    });
    adminEventListEl.appendChild(div);
  });
}

adminEvtClearAll && adminEvtClearAll.addEventListener('click', async () => {
  if (!confirm('Désactiver tous les événements globaux ?')) return;
  await clearBackendEvents();
  renderAdminEvents();
  renderEventBanner();
  if (document.getElementById('eggList')) renderEggs();
});

adminEvtRefresh && adminEvtRefresh.addEventListener('click', async () => {
  await fetchActiveEvents();
  renderAdminEvents();
  renderEventBanner();
  if (document.getElementById('eggList')) renderEggs();
});

// =====================================================
// ===== Premium / PayPal checkout =====================
// =====================================================
function startPaypalCheckout(item) {
  if (!CURRENT_USER) { toast('Connecte-toi pour acheter'); return; }
  if (state.premium && state.premium[item.id]) { toast('Déjà acquis'); return; }
  if (!confirm(`Acheter "${item.name}" pour ${item.price.toFixed(2)} € via PayPal ?\n\nTu vas être redirigé(e) vers PayPal.com. Une fois le paiement validé, tu reviens automatiquement et le bonus est appliqué.`)) return;

  // Build a return URL with a token marker so we can detect a successful payment
  const baseUrl = location.origin + location.pathname;
  const token = btoa(`${CURRENT_USER}|${item.id}|${Date.now()}`);
  const returnUrl = `${baseUrl}?paid=${encodeURIComponent(token)}`;
  const cancelUrl = `${baseUrl}?cancel=1`;

  // PayPal Standard "Buy Now" form
  const form = document.createElement('form');
  form.action = 'https://www.paypal.com/cgi-bin/webscr';
  form.method = 'post';
  form.target = '_top';
  const fields = {
    cmd: '_xclick',
    business: PAYPAL_EMAIL,
    item_name: `Caca Simulator - ${item.name}`,
    item_number: item.id,
    amount: item.price.toFixed(2),
    currency_code: PAYPAL_CURRENCY,
    no_shipping: '1',
    no_note: '1',
    rm: '1', // return method GET
    return: returnUrl,
    cancel_return: cancelUrl,
    custom: CURRENT_USER,
    lc: 'FR',
    bn: 'CacaSim_BuyNow',
  };
  for (const [k,v] of Object.entries(fields)) {
    const inp = document.createElement('input');
    inp.type = 'hidden'; inp.name = k; inp.value = v;
    form.appendChild(inp);
  }
  document.body.appendChild(form);
  form.submit();
}

// On return from PayPal: detect ?paid=<token> in URL and grant the boost
function handlePaypalReturn() {
  const params = new URLSearchParams(location.search);
  if (params.get('cancel')) {
    toast('Paiement annulé');
    history.replaceState({}, '', location.pathname);
    return;
  }
  const token = params.get('paid');
  if (!token) return;
  try {
    const decoded = atob(token);
    const [user, itemId] = decoded.split('|');
    if (!user || !itemId) return;
    const item = PREMIUM_ITEMS.find(p => p.id === itemId);
    if (!item) return;
    // Apply on the current logged-in account if it matches
    if (CURRENT_USER && CURRENT_USER === user) {
      if (!state.premium) state.premium = {};
      if (!state.premium[itemId]) {
        state.premium[itemId] = true;
        save();
        renderShop(); updateStats();
        toast(`💎 Merci ! "${item.name}" activé !`);
        spawnConfetti(120); screenFlash();
      }
    } else {
      // Apply directly to the target user's save (admin not logged in scenario)
      const targetSave = getUserSave(user);
      if (targetSave) {
        targetSave.premium = targetSave.premium || {};
        targetSave.premium[itemId] = true;
        setUserSave(user, targetSave);
      }
      toast(`💎 Achat enregistré pour ${user}. Connecte-toi pour profiter du bonus.`);
    }
  } catch(e) { console.warn('Invalid paid token', e); }
  // Clean URL
  history.replaceState({}, '', location.pathname);
}

// =====================================================
// ===== Leaderboard ===================================
// =====================================================
async function getLeaderboardData(type = 'pd') {
  try {
    const data = await apiCall(`/leaderboard?type=${type}&limit=10`);
    return data.map(d => ({
      user: d.username,
      score: d.score
    }));
  } catch(e) {
    console.error('Leaderboard fetch error:', e);
    return [];
  }
}
function renderLbList(el, data, key, fmtVal) {
  if (!el) return;
  el.innerHTML = '';
  if (!data || !data.length) {
    const li = document.createElement('li');
    li.className = 'lb-empty';
    li.textContent = 'Aucun joueur classé pour le moment.';
    el.appendChild(li);
    return;
  }
  data.forEach((d, i) => {
    const li = document.createElement('li');
    const rank = i + 1;
    const isMe = CURRENT_USER && d.user === CURRENT_USER;
    li.className = `rank-${rank}` + (isMe ? ' me' : '');
    li.innerHTML = `
      <span class="lb-name${isMe?' me':''}">${d.user}${isMe?' (toi)':''}</span>
      <span class="lb-value">${fmtVal(d.score)}</span>
    `;
    el.appendChild(li);
  });
}
async function renderLeaderboard() {
  const pdData = await getLeaderboardData('pd');
  const apData = await getLeaderboardData('ap');
  renderLbList(document.getElementById('lbPD'), pdData, 'score', v => fmt(v) + ' 🧻');
  renderLbList(document.getElementById('lbPrestige'), pdData, 'score', v => fmt(v) + ' 🧻');
  renderLbList(document.getElementById('lbAP'), apData, 'score', v => fmt(v) + ' ✨');
  // Poop leaderboard no longer supported in API, use PD instead
  renderLbList(document.getElementById('lbPoop'), pdData, 'score', v => fmt(v) + ' 💩');
}

// Auto-login from session
const savedSession = localStorage.getItem(SESSION_KEY);
if (savedSession === '__admin__') {
  authOverlay.classList.add('hidden');
  openAdminPanel();
} else if (savedSession) {
  // Check if saved session is a JWT token
  if (savedSession.startsWith('eyJ')) {
    AUTH_TOKEN = savedSession;
    // Try to fetch username from backend or decode token
    try {
      const tokenPayload = JSON.parse(atob(savedSession.split('.')[1]));
      CURRENT_USER = tokenPayload.username;
      startGame(CURRENT_USER);
    } catch(e) {
      localStorage.removeItem(SESSION_KEY);
      startGame(null);
    }
  } else {
    // Legacy localStorage session (backward compatibility)
    const accounts = getAccounts();
    if (accounts[savedSession]) {
      startGame(savedSession);
    }
  }
}

// Handle PayPal return (after potential auto-login so CURRENT_USER is set)
handlePaypalReturn();

// Periodic refresh for player UIs
setInterval(() => {
  if (adminPanelEl.classList.contains('hidden')) {
    refreshAnnouncement();
    refreshPoll();
    refreshOnlineCount();
  }
}, 4000);
