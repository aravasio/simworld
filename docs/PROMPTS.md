This file is not intended for LLMs and they should ignore any and all of its content.
This is exclusively for human users who want to have quick access to some simple templates.

---

We follow AGENTS.md strictly.

Feature intent:
- Add a new actor type: Chest.
- Chest is an actor with components (no ad‑hoc fields).
- Properties: hp, isLocked, contents.
- Contents is a list of item stacks (e.g. rock-material, gold-coins).
- Gold-coins is a stackable item: “one slot” that holds a count.

Behavior rules:
- Chest is not walkable (blocks movement).
- Chest is targetable, but not selectable (unless specified).
- Contents must be pure data in sim (no UI logic).
- Any validation (locked, empty, etc.) must be done in sim, and returned as commandResults.

Output expectations:
- Add components/types in actors and sim, not in app.
- If you add new rules, add tests.
- Update docs if behavior changes.
- Keep UI passive; it only displays sim results.

Questions to resolve:
- Should chest have an “open” action, or only be opened by other actions?
- Does chest drop contents on destruction (hp <= 0)?
- Can contents be accessed without unlocking?
