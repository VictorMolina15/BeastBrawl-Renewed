import { create } from 'zustand';

// --- CONFIGURACIÓN ESTÁTICA ---
export type AppMode = 'EDITOR' | 'COMBAT';
export type GameMode = 'CLASSIC' | 'BATTLE_ROYALE' | 'TRAINING';
export type TurnPhase = 'IDLE' | 'MOVING' | 'AIMING' | 'ACTION' | 'ENDED';
export type WeaponId = keyof typeof WEAPONS_DB;

export interface Weapon {
  id: WeaponId;
  name: string;
  staminaCost: number;
  cooldown: number; // En segundos (para BR)
  damage: number;
  blastRadius: number; // Radio de destrucción de terreno
}

export const WEAPONS_DB = {
  SLINGSHOT: { id: 'SLINGSHOT', name: 'Resortera', staminaCost: 2, cooldown: 2, damage: 15, blastRadius: 0},
  RPG: { id: 'RPG', name: 'RPG', staminaCost: 7, cooldown: 7, damage: 50, blastRadius: 2 },
  MELEE: { id: 'MELEE', name: 'Ataque Melee', staminaCost: 1, cooldown: 1, damage: 20, blastRadius: 0 }
} as const;

const MAX_STAMINA = 10;
const MOVEMENT_YIELD = 10; // Pasos otorgados por 1 de estamina

// --- ESTADO DINÁMICO ---
interface CombatState {
  mode: GameMode;
  appMode: AppMode;
  turnPhase: TurnPhase;
  
  // Recursos
  currentStamina: number;
  movementAllowance: number; // "Pasos" restantes disponibles
  
  // Armas
  selectedWeapon: WeaponId | null;
  cooldowns: Record<WeaponId, number>; // Timestamp de cuándo estará lista el arma (para BR)

  // Acciones de Turno/Recursos
  setAppMode: (mode: AppMode) => void;
  setMode: (mode: GameMode) => void;
  buyMovement: () => boolean;
  consumeMovement: (distance: number) => void;
  rest: () => void;
  endTurn: () => void;
  
  // Acciones de Combate
  selectWeapon: (id: WeaponId) => void;
  canUseWeapon: (id: WeaponId) => boolean;
  executeWeaponAction: (id: WeaponId) => boolean;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  appMode: 'EDITOR',
  mode: 'CLASSIC',
  turnPhase: 'IDLE',
  currentStamina: MAX_STAMINA,
  movementAllowance: 0,
  selectedWeapon: null,
  cooldowns: { SLINGSHOT: 0, RPG: 0, MELEE: 0 },

  setAppMode: (mode) => set({ appMode: mode }),
  setMode: (mode) => set({ mode }),

  buyMovement: () => {
    const { currentStamina, mode, movementAllowance } = get();
    if (mode === 'BATTLE_ROYALE') return true; // Movimiento libre en BR

    if (currentStamina >= 1) {
      set({ 
        currentStamina: currentStamina - 1,
        movementAllowance: movementAllowance + MOVEMENT_YIELD 
      });
      return true;
    }
    return false;
  },

  consumeMovement: (distance) => {
    const { movementAllowance, mode } = get();
    if (mode === 'BATTLE_ROYALE') return;
    set({ movementAllowance: Math.max(0, movementAllowance - distance) });
  },

  rest: () => {
    const { currentStamina, mode } = get();
    if (mode === 'BATTLE_ROYALE') return;
    set({ 
      currentStamina: Math.min(currentStamina + 2, MAX_STAMINA),
      turnPhase: 'ENDED',
      movementAllowance: 0 // Pierde el movimiento no usado
    });
  },

  endTurn: () => set({ 
    turnPhase: 'ENDED', 
    movementAllowance: 0 
  }), // La estamina se reiniciaría al iniciar el turno del siguiente jugador

  selectWeapon: (id) => set({ selectedWeapon: id }),

  canUseWeapon: (id) => {
    const { currentStamina, mode, cooldowns } = get();
    const weapon = WEAPONS_DB[id];
    
    if (mode === 'TRAINING') return true; // Munición/Estamina infinita
    if (mode === 'CLASSIC') return currentStamina >= weapon.staminaCost;
    return Date.now() >= cooldowns[id];
  },

  executeWeaponAction: (id) => {
    const { currentStamina, mode, canUseWeapon, cooldowns } = get();
    const weapon = WEAPONS_DB[id];

    if (!canUseWeapon(id)) return false;

    if (mode === 'CLASSIC') {
      set({ currentStamina: currentStamina - weapon.staminaCost });
    } else {
      set({ cooldowns: { ...cooldowns, [id]: Date.now() + (weapon.cooldown * 1000) } });
    }
    return true;
  }
}));