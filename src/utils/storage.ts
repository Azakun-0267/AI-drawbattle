import { MonsterData, SavedMonsterEntry } from '../types';
import { generateBotMonster } from './monsterAnalyzer';

const STORAGE_KEY = 'ai_monster_battle_saved_monsters_v2';

/**
 * Creates default preset monsters if storage is empty
 */
function createInitialPresets(): SavedMonsterEntry[] {
  const m1 = generateBotMonster('炎', 0, 1);
  m1.name = '紅蓮竜サラマンダー';
  m1.isPlayer = true;

  const m2 = generateBotMonster('雷', 0, 0);
  m2.name = '迅雷獣ボルトガル';
  m2.isPlayer = true;

  const m3 = generateBotMonster('水', 0, 2);
  m3.name = '海神タイダルレクス';
  m3.isPlayer = true;

  return [
    {
      id: m1.id,
      name: m1.name,
      savedAt: Date.now() - 3600000 * 2,
      monster: m1,
      wins: 3,
      battles: 3,
    },
    {
      id: m2.id,
      name: m2.name,
      savedAt: Date.now() - 3600000,
      monster: m2,
      wins: 2,
      battles: 2,
    },
    {
      id: m3.id,
      name: m3.name,
      savedAt: Date.now(),
      monster: m3,
      wins: 1,
      battles: 1,
    },
  ];
}

/**
 * Retrieves all saved monsters from localStorage.
 */
export function getSavedMonsters(): SavedMonsterEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const presets = createInitialPresets();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      return presets;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const presets = createInitialPresets();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return presets;
  } catch (err) {
    console.error('Failed to load saved monsters:', err);
    return createInitialPresets();
  }
}

/**
 * Saves or updates a monster in the save storage.
 */
export function saveMonsterToStorage(monster: MonsterData): SavedMonsterEntry {
  const list = getSavedMonsters();
  const existingIdx = list.findIndex((item) => item.id === monster.id);

  const entry: SavedMonsterEntry = {
    id: monster.id,
    name: monster.name,
    savedAt: Date.now(),
    monster: JSON.parse(JSON.stringify(monster)),
    wins: existingIdx >= 0 ? list[existingIdx].wins || 0 : 0,
    battles: existingIdx >= 0 ? list[existingIdx].battles || 0 : 0,
  };

  let updatedList: SavedMonsterEntry[];
  if (existingIdx >= 0) {
    updatedList = [...list];
    updatedList[existingIdx] = entry;
  } else {
    updatedList = [entry, ...list];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Failed to save monster to storage:', err);
  }

  return entry;
}

/**
 * Deletes a saved monster by ID.
 */
export function deleteSavedMonster(id: string): SavedMonsterEntry[] {
  const list = getSavedMonsters();
  const filtered = list.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete monster:', err);
  }
  return filtered;
}

/**
 * Increments battle stats for a monster.
 */
export function recordBattleStats(monsterId: string, isVictory: boolean) {
  const list = getSavedMonsters();
  const updated = list.map((entry) => {
    if (entry.id === monsterId || entry.monster.id === monsterId) {
      return {
        ...entry,
        battles: (entry.battles || 0) + 1,
        wins: isVictory ? (entry.wins || 0) + 1 : (entry.wins || 0),
      };
    }
    return entry;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update stats:', err);
  }
}
