import type { ActionHintsContext, InspectorContext, InspectorElements } from './types';

export interface InspectorApi {
  elements: InspectorElements;
  updateInspector: (context: InspectorContext) => void;
  updateActionHints: (context: ActionHintsContext) => void;
  setStatus: (message: string) => void;
}

export function createInspector(doc: Document): InspectorApi {
  const elements: InspectorElements = {
    name: doc.getElementById('inspector-name'),
    glyph: doc.getElementById('inspector-glyph'),
    avatar: doc.getElementById('inspector-avatar'),
    pos: doc.getElementById('inspector-pos'),
    hp: doc.getElementById('inspector-hp'),
    mp: doc.getElementById('inspector-mp'),
    stamina: doc.getElementById('inspector-stamina'),
    vitals: doc.getElementById('inspector-vitals'),
    actionHints: doc.getElementById('action-hints'),
    status: doc.getElementById('status-message'),
  };

  let statusTimer: number | null = null;

  const updateInspector = (context: InspectorContext) => {
    if (!elements.name || !elements.glyph || !elements.pos || !elements.avatar || !elements.hp || !elements.mp || !elements.stamina || !elements.vitals) {
      return;
    }

    if (context.actor) {
      if (context.kind === 'rock') {
        elements.name.textContent = 'Rock';
      } else if (context.kind === 'rock-material') {
        elements.name.textContent = 'Rock Material';
      } else if (context.kind === 'chest') {
        elements.name.textContent = 'Chest';
      } else if (context.kind === 'gold-coin') {
        elements.name.textContent = 'Gold Coin';
      } else {
        elements.name.textContent = context.tags?.has('dwarf') ? `Dwarf ${context.actor.id}` : `Creature ${context.actor.id}`;
      }
      const glyphId = context.renderable?.glyphId ?? 0;
      const char = context.glyphChar(glyphId);
      elements.glyph.textContent = char;
      elements.avatar.textContent = char;
      elements.avatar.style.color = context.glyphColor(glyphId);
      if (context.vitals) {
        elements.vitals.style.display = 'block';
        elements.hp.textContent = `${context.vitals.hitPoints.hp}/${context.vitals.hitPoints.maxHp}`;
        elements.mp.textContent = `${context.vitals.manaPoints.mp}/${context.vitals.manaPoints.maxMp}`;
        elements.stamina.textContent = `${context.vitals.staminaPoints.stamina}/${context.vitals.staminaPoints.maxStamina}`;
      } else {
        elements.vitals.style.display = 'none';
      }
    } else {
      elements.name.textContent = 'None';
      elements.glyph.textContent = '-';
      elements.avatar.textContent = '?';
      elements.avatar.style.color = '#9ca3af';
      elements.vitals.style.display = 'none';
    }

    elements.pos.textContent = `${context.cursor.x}, ${context.cursor.y}`;
  };

  const updateActionHints = (context: ActionHintsContext) => {
    if (!elements.actionHints) return;
    if (context.hasSelectable) {
      elements.actionHints.style.display = 'block';
      const moveLabel = context.mode === 'move' ? 'Enter: Confirm Move' : 'Enter: Move';
      elements.actionHints.innerHTML = [
        `<span class="action">${moveLabel}</span>`,
        context.hasTarget ? '<span class="action">I: Mine</span>' : '<span class="action">I: Mine (adjacent rock)</span>',
        context.hasTarget ? '<span class="action">O: Fight</span>' : '<span class="action">O: Fight (adjacent target)</span>',
        '<span class="action">Esc: Cancel Move</span>',
      ].join(' ');
      return;
    }
    if (context.hasTargetable) {
      elements.actionHints.style.display = 'none';
      return;
    }
    elements.actionHints.style.display = 'none';
  };

  const setStatus = (message: string) => {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.style.opacity = '1';
    if (statusTimer !== null) window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      if (elements.status) elements.status.style.opacity = '0';
    }, 1500);
  };

  return {
    elements,
    updateInspector,
    updateActionHints,
    setStatus,
  };
}
