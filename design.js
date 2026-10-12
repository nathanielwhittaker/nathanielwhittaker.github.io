// Content for design.html. Every decision is sourced from the ARPG's Architecture Decision Records (ADRs);
// quotes are verbatim from those records unless quoteSrc marks them as a design principle.
const DECISIONS = [
  // ---- Technical design ----
  {
    id: 'fixed-point',
    kind: 'technical',
    adr: 'ADR-0002',
    date: 'Aug 11, 2026',
    title: 'A deterministic fixed-point simulation, from day one',
    problem: 'Multiplayer is planned as Factorio-style lockstep: clients replicate inputs, not state. That only works if the simulation produces bit-identical results on every machine.',
    options: [
      ['Use Godot’s built-in physics', 'not deterministic across platforms or lockstep-safe'],
      ['Floats now, migrate to fixed-point before multiplayer', 'risks baking float assumptions into every system'],
      ['Custom 2D sim on 64-bit fixed-point math, from day one', null],
    ],
    decision: 'All gameplay runs in a custom simulation library on Q32.32 fixed-point numbers, with no engine dependency. The renderer can use floats freely, but the simulation never does.',
    tradeoff: 'I had to build and exhaustively test my own number type (rounding, overflow, trig through lookup tables) before anything could depend on it. It pays off even in single player: replays, reliable saves, headless tests, and a determinism oracle that runs the same seed twice and compares state hashes.',
    quote: 'integer (fixed-point) math is bit-for-bit deterministic everywhere',
  },
  {
    id: 'first-mod',
    kind: 'technical',
    adr: 'ADR-0004',
    date: 'Aug 11, 2026',
    title: 'The base game is the first mod',
    problem: 'Moddability is a core pillar. I had to decide how strictly to separate the engine from the game.',
    options: [
      ['Pragmatic split: the engine owns the primitives, not every subsystem', 'risks a two-tier API where mods are second-class'],
      ['Moddable data, native behavior', 'too limiting for behavior and theorycraft mods'],
      ['Full purity: the engine is mechanism only, all content is a mod', null],
    ],
    decision: 'The engine provides only mechanism: the deterministic runtime, the mod loader, the view, and persistence. Every class, monster, affix and damage type, including the base game’s, is mod data. There is no privileged content path.',
    tradeoff: 'It costs more up-front plumbing, and the ADR says so: “Accepted deliberately.” It paid off later, when the alpha test build shipped as an overlay mod instead of `if (alpha)` branches scattered through the code.',
    quote: 'It forces the mod API to be honestly complete',
  },
  {
    id: 'view-sim',
    kind: 'technical',
    adr: 'ADR-0005',
    date: 'Aug 11, 2026',
    title: 'Draw in 3D, simulate in 2D',
    problem: 'I wanted modern 3D visuals, but gameplay on the simpler, proven 2D plane the genre is built on.',
    options: [
      ['3D gameplay and collision', 'brings a whole class of 3D-physics determinism problems'],
      ['3D rendering, with all gameplay on the 2D ground plane', null],
    ],
    decision: 'The world is rendered in 3D, but movement, collision, targeting and area effects all run in 2D. Height belongs to the view (jump arcs, projectile lofts, terrain) and gameplay never reads it.',
    tradeoff: 'This gives up height-based gameplay. The ADR states that reversing it would require a new ADR, and that later happened (see “How the design changed”).',
    quote: 'the 3D scene is a slaved projection, so it can be as rich as we like without affecting determinism',
  },
  {
    id: 'secret-seed',
    kind: 'technical',
    adr: 'ADR-0006',
    date: 'Aug 11, 2026',
    title: 'Crafting rolls on a secret seed',
    problem: 'In lockstep, every client knows the shared random seed. That is fine for combat rolls, which nobody can predict in the moment. Crafting is different: a modified client could pre-scan outcomes before spending currency.',
    options: [
      ['Craft inside lockstep on a public seed', 'outcomes can be pre-scanned (kept only as a co-op toggle)'],
      ['Craft on the client and announce the result', 'a modified client can fabricate outcomes'],
      ['Host resolves the craft, then injects the result as a command', null],
    ],
    decision: 'There are two consistency domains. Real-time gameplay is lockstep, using counter-based RNG substreams keyed by seed, entity, tick and purpose, so one system’s rolls never shift another’s. Crafting and trading are authoritative transactions: the host rolls on a secret seed and injects the result back into the command stream.',
    tradeoff: 'There are two consistency models to maintain, plus an RPC channel separate from the command stream. Single player is just the case where you are the host.',
    quote: 'compute was never the real concern — predictability and authority were',
  },
  {
    id: 'lua',
    kind: 'technical',
    adr: 'ADR-0019',
    date: 'Aug 12, 2026',
    title: 'Mod scripting in Lua, sandboxed by hand',
    problem: 'Mod scripts are downloaded automatically and run inside the lockstep sim. They have to be sandboxed and deterministic, and still easy to write.',
    options: [
      ['WASM + AssemblyScript (the first pick)', 'a toolchain and a compile step before you can test a one-line tweak'],
      ['Native Lua 5.4 via NLua', 'per-platform native binaries, and a C interop path that opens a sandbox hole'],
      ['MoonSharp, a pure-C# Lua interpreter', null],
    ],
    decision: 'Behavior mods are plain `.lua` files with no build step. Lua numbers are doubles, so all gameplay math has to go through a host-provided fixed-point API.',
    tradeoff: 'WASM provided isolation for free. With MoonSharp, containment depends on building the interpreter correctly on four fronts: a module whitelist, removing `math.random` (which is seeded from the wall clock, so it would guarantee a desync), no reflection-based access to .NET objects, and an instruction and allocation budget for each handler.',
    quote: 'We accept this as the price of the lower modder barrier.',
  },

  // ---- Game design ----
  {
    id: 'increased-more',
    kind: 'game',
    adr: 'ADR-0007',
    date: 'Aug 11, 2026',
    title: 'Increased vs. more: depth with a rationing rule',
    problem: 'The way modifiers stack defines how all build math feels, and theorycrafting is a top pillar.',
    options: [
      ['Diablo II-style additive', 'simpler and easier to balance, but far less build depth'],
      ['A separate hybrid model', 'folded into the chosen model as a balance lever instead'],
      ['Path of Exile-style layers: added, increased, more', null],
    ],
    decision: '`final = (base + Σ added) × (1 + Σ increased) × ∏ (1 + more)`. To control power creep I ration *more*: most affixes use *increased*, and *more* is reserved for skills, supports and keystones.',
    tradeoff: 'Multiplicative stacking is harder to balance. The rationing rule contains it, and an Explain breakdown shows every contribution to a stat, so outliers are easy to spot.',
    quote: 'A flat additive model collapses most choices into “add all the percents.”',
  },
  {
    id: 'loot',
    kind: 'game',
    adr: 'ADR-0010',
    date: 'Aug 11, 2026',
    title: 'Loot with no dead stats',
    problem: 'Many ARPGs make items rare through dilution: affix pools full of stats nobody wants. I wanted to remove that, which meant rarity needed a new source.',
    options: [
      ['Path of Exile-style dilution', 'dead stats are exactly what I wanted to get rid of'],
      ['Copy Last Epoch tiers, Diablo II runewords or PoE influence 1:1', 'borrowed in spirit only'],
      ['A bespoke locked/fractured-mod system', 'unnecessary once the crafting rule below exists'],
    ],
    decision: 'The affix pool is curated, with no stat types that are useless at every roll. Drop-only “anchor” mods can’t be created, changed or removed by crafting, so you craft around them. Runewords forge a fixed unique plus a random stat inherited from the consumed base. Trading is first-class and dupe-proof.',
    tradeoff: 'Every affix pool needs a “no dead types” review, and items need rich serialization (anchors, origins, runes) from the start, before target farming exists.',
    quote: 'An add/remove transaction may control … either the removed mod or the added mod — never both.',
  },
  {
    id: 'defenses',
    kind: 'game',
    adr: 'ADR-0013',
    date: 'Aug 12, 2026',
    title: 'Anti-immortality through opportunity cost',
    problem: 'Defenses in the genre tend toward an arms race: players stack every layer until they are immortal, and developers respond with untelegraphed one-shots.',
    options: [
      ['Flat-subtraction armour', 'only matters against small hits and overlaps evasion'],
      ['Linear armour to a cap', 'creates a hard breakpoint (rush to cap, then worthless)'],
      ['Path of Exile’s hit-size armour formula', 'opaque, and weak against big hits'],
      ['A hard “no full-to-dead” floor', 'would rule out rare, readable instant deaths'],
    ],
    decision: 'Armour reduces all hit damage on an asymptotic curve with a reachable cap. Evasion is honest: the tooltip shows the true average. Energy Shield is dropped in favour of Mind over Matter on mana. All defensive layers compete for the same finite resources, so no build covers everything. Instant death is allowed, but only when rare and telegraphed.',
    tradeoff: 'Balance depends on defensive investment being genuinely zero-sum, and every encounter carries a “telegraph the one-shot” obligation.',
    quote: 'Untelegraphed burst is the only thing considered unfair.',
  },
  {
    id: 'classes',
    kind: 'game',
    adr: 'ADR-0014',
    date: 'Aug 12, 2026',
    title: 'Asymmetric classes, one job per layer',
    problem: 'Base classes, ascendancies and passive-tree masteries risked overlapping, with three systems all handing out power.',
    options: [
      ['Symmetric class balance', 'no strengths and weaknesses, so less identity'],
      ['Masteries as buff or unlock domains', 'redundant with ascendancies and passives'],
      ['Big-power base classes', 'power should come from progression, not the starting pick'],
    ],
    decision: 'Each layer gets one job. The base class is a small, asymmetric tilt with real penalties. The ascendancy adds power. Masteries *mutate* the tree, for example converting fire clusters to lightning. Skills are gated by attributes and weapon, never locked to a class.',
    tradeoff: 'Masteries need a data-driven tree-mutation system, and content grows with classes × eras × ascendancies, so base packages are kept deliberately small.',
    quote: 'Balance = asymmetric by design (D1/D2), not symmetric parity',
  },
  {
    id: 'no-cooldowns',
    kind: 'game',
    adr: 'ADR-0070',
    date: 'Aug 16, 2026',
    title: 'No cooldowns, ever',
    problem: 'Cooldowns turn many ARPGs into a skill piano. Diablo III had damage cycles where you could only do real damage for about 4 seconds out of every 16. Diablo IV can feel like a “Wait For My Cooldown Role Playing Game” more than an action RPG.',
    options: [
      ['Per-skill cooldowns (the modern genre default)', 'cooldown reduction becomes a mandatory stat on many builds, and damage becomes conditional, so you play rotations'],
      ['Keep a cooldown only on the skills that “need” one', 'a skill that needs a cooldown to be balanced is a skill that is too strong'],
      ['Balance the skill itself: cast time, mana cost, damage, and what it does', null],
    ],
    decision: 'There are no cooldowns on skills or potions. A cast costs mana, and the cost scales with skill level. How fast you can recast is set by the cast’s action-lock × action speed. Later systems stay inside the rule: Teleport is a slow, mana-gated cast, and warcries are long buffs paced only by mana and cast time.',
    tradeoff: 'Every powerful effect needs another brake: mana cost, cast time, duration, or the opportunity cost of a limited slot. What I get in return: power comes from the build, not finger speed. A game that rewards mechanical dexterity over smart builds gets played once or twice. A game where a strong build carries you is one people keep replaying.',
    quote: 'Builds first, gameplay second.',
    quoteSrc: 'Design principle',
  },
];

// Decisions that were later reversed or amended — each a short chain of dated steps.
const EVOLUTIONS = [
  {
    kind: 'technical',
    title: 'Which language mods are written in',
    steps: [
      { adr: 'ADR-0003', date: 'Aug 11', head: 'WASM + AssemblyScript', body: 'A sandbox with no ambient authority, and native integer types that make fixed-point math natural.' },
      { adr: 'ADR-0019', date: 'Aug 12', head: 'Lua (MoonSharp)', body: 'Replaced one day later. The compile step undercut the goal of the lowest possible barrier for modders, so I took on the harder sandboxing work.' },
    ],
    lesson: 'The first choice suited me and the math. The second suited the people who will actually write mods.',
  },
  {
    kind: 'technical',
    title: 'Whether height matters',
    steps: [
      { adr: 'ADR-0005', date: 'Aug 11', head: 'Height is cosmetic', body: 'Gameplay never reads height, and this was written down as an invariant.' },
      { adr: 'ADR-0128', date: 'Aug 24', head: 'Elevation layers are gameplay', body: 'Cliff edges block movement, you can shoot down across a ledge but never up, and ramps become chokepoints.' },
    ],
    lesson: 'Changing an invariant took a new ADR and four staged slices. The first slice left the world byte-identical whenever a map defined no layers, so no determinism test moved.',
  },
  {
    kind: 'game',
    title: 'What attributes do for defense',
    steps: [
      { adr: 'ADR-0011', date: 'Aug 11', head: 'Intelligence → Energy Shield', body: 'The usual genre mapping.' },
      { adr: 'ADR-0013', date: 'Aug 12', head: 'Energy Shield dropped', body: 'Casters defend with Mind over Matter on a large mana pool instead. Strength → Armour, Dexterity → Evasion.' },
      { adr: 'ADR-0053', date: 'Aug 15', head: 'Defenses come from gear', body: 'The Strength/Dexterity mapping was never built. I ratified the simpler model the code already had: those attributes are equip requirements only.' },
      { adr: 'ADR-0244', date: 'Oct 8', head: 'Dexterity drives accuracy', body: 'When attacks began contesting evasion, Dexterity got a job again.' },
    ],
    lesson: 'When the code had quietly drifted from the spec, I decided the spec explicitly instead of letting the docs lie.',
  },
];

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Light inline markup: `code` and *emphasis*, applied after escaping.
  const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const KIND = { technical: 'Technical design', game: 'Game design' };

  $('#year').textContent = new Date().getFullYear();

  // ---------- Theme ----------
  $('.theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    root.dataset.theme = current === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
  if (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.dataset.theme = 'light';
  }

  // ---------- Decision cards ----------
  $('#decisions').innerHTML = DECISIONS.map(d => `
    <article class="adr" data-kind="${d.kind}" id="${d.id}">
      <header>
        <span class="adr-meta"><span class="adr-kind ${d.kind}">${KIND[d.kind]}</span>${esc(d.adr)} · ${esc(d.date)}</span>
        <h3>${esc(d.title)}</h3>
      </header>
      <dl>
        <dt>Problem</dt><dd>${md(d.problem)}</dd>
        <dt>Options weighed</dt>
        <dd><ul class="opts">${d.options.map(([o, why]) => why
          ? `<li class="no"><b>${md(o)}</b> <span>${md(why)}</span></li>`
          : `<li class="yes"><b>${md(o)}</b> <span>chosen</span></li>`).join('')}</ul></dd>
        <dt>Decision</dt><dd>${md(d.decision)}</dd>
        <dt>Trade-off</dt><dd>${md(d.tradeoff)}</dd>
      </dl>
      <blockquote>“${esc(d.quote)}”<cite>${esc(d.quoteSrc || d.adr)}</cite></blockquote>
    </article>`).join('');

  // ---------- Evolution timeline ----------
  $('#evolutions').innerHTML = EVOLUTIONS.map(e => `
    <article class="evo" data-kind="${e.kind}">
      <h3><span class="adr-kind ${e.kind}">${KIND[e.kind]}</span>${esc(e.title)}</h3>
      <ol>${e.steps.map((s, i) => `
        <li class="${i === e.steps.length - 1 ? 'now' : ''}">
          <span class="when">${esc(s.date)} · ${esc(s.adr)}</span>
          <b>${esc(s.head)}</b>
          <p>${md(s.body)}</p>
        </li>`).join('')}</ol>
      <p class="lesson">${md(e.lesson)}</p>
    </article>`).join('');

  // ---------- Filter chips (All / Technical / Game), deep-linkable via #technical / #game ----------
  const FILTERS = [['all', 'All'], ['technical', KIND.technical], ['game', KIND.game]];
  const bar = $('.filters');
  const count = k => DECISIONS.filter(d => k === 'all' || d.kind === k).length;
  bar.innerHTML = FILTERS.map(([k, label]) =>
    `<button class="chip" data-f="${k}" aria-pressed="false">${esc(label)}<span class="n">${count(k)}</span></button>`).join('');

  const apply = (k, push) => {
    bar.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.f === k));
    document.querySelectorAll('[data-kind]').forEach(el => el.classList.toggle('hide', k !== 'all' && el.dataset.kind !== k));
    if (push) history.replaceState(null, '', k === 'all' ? location.pathname : `#${k}`);
  };
  bar.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) apply(c.dataset.f, true); });
  const initial = location.hash.slice(1);
  apply(initial === 'technical' || initial === 'game' ? initial : 'all', false);
})();
