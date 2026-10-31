// Roborock Buddy Card for Home Assistant - https://github.com/spikey1965/ha-roborock-buddy-card
// Guide and live demo: https://mymediabuild.uk/home-assistant-roborock-buddy-card/
// MIT licence. Made by My Media Build.
//
// A dashboard card for Roborock vacuums on Home Assistant's own Roborock integration: a cartoon of your robot and its dock
// that follows what it's doing, the live map, tap-to-pick rooms, controls, mop and dock status, brush and filter life,
// and a schedule of cleaning programmes saved as normal Home Assistant automations.
//
// type: custom:roborock-buddy-card   (every option is optional - see the README)
const ROBOROCK_BUDDY_VERSION = "0.1.0";

// Roborock's own replacement intervals, in hours
const LIFE = { main_brush: ["Main brush", 300, "mdi:brush"], side_brush: ["Side brush", 200, "mdi:fan"], filter: ["Filter", 150, "mdi:air-filter"],
  sensor: ["Sensors", 30, "mdi:eye-outline"], dock_strainer: ["Dock strainer", 150, "mdi:filter-outline"] };
const STATES = {
  cleaning: ["Cleaning", "run"], returning: ["Going home", "warn"], paused: ["Paused", "warn"], docked: ["Docked", "ok"],
  idle: ["Idle", ""], error: ["Needs help", "bad"],
};
// sensor.<robot>_status says more than the vacuum state (charging, washing the mop, emptying the bin...)
const DETAIL = { charging: "Charging", charging_complete: "Fully charged", emptying_the_bin: "Emptying the bin", washing_the_mop: "Washing the mops",
  going_to_wash_the_mop: "Going to wash the mops", air_drying_stopping: "Drying the mops", returning_home: "Going home", docking: "Docking",
  mapping: "Mapping", segment_cleaning: "Cleaning", zoned_cleaning: "Cleaning", spot_cleaning: "Spot cleaning", segment_mopping: "Mopping",
  zoned_mopping: "Mopping", robot_status_mopping: "Mopping", updating: "Updating" };
// options the Roborock integration lists that only make sense in its app
const HIDE = new Set(["off", "custom", "smart_mode", "custom_water_flow"]);
const ICON = {
  quiet: "mdi:fan-speed-1", balanced: "mdi:fan-speed-2", turbo: "mdi:fan-speed-3", max: "mdi:fan-chevron-up", max_plus: "mdi:fan-plus",
  vacuum: "mdi:robot-vacuum", vac_and_mop: "mdi:water-plus-outline", mop: "mdi:water-outline",
  low: "mdi:water-minus-outline", medium: "mdi:water-outline", high: "mdi:water-plus-outline",
  standard: "mdi:map-marker-path", deep: "mdi:layers-outline", deep_plus: "mdi:layers-plus", fast: "mdi:run-fast",
};
const NICE = { vac_and_mop: "Vac + mop", max_plus: "Max+", deep_plus: "Deep+" };
const ROOM_ICONS = [[/kitchen/i, "mdi:countertop-outline"], [/living|lounge|front room/i, "mdi:sofa-outline"], [/dining/i, "mdi:table-chair"],
  [/bed/i, "mdi:bed-outline"], [/\bwc\b|toilet|loo|cloak/i, "mdi:toilet"], [/bath|shower/i, "mdi:shower"], [/corridor|hall|landing|stairs/i, "mdi:door-open"],
  [/utility|laundry/i, "mdi:washing-machine"], [/conservatory|sun ?room|garden room/i, "mdi:flower-outline"], [/office|study/i, "mdi:desk"]];
const roomIcon = n => (ROOM_ICONS.find(([re]) => re.test(n)) || [0, "mdi:floor-plan"])[1];
// name ideas for the "Name your robot" pop-up, or type your own
const ROBOT_NAMES = [
  ["Funny & puns", ["Dustbin Hoffman", "Sweepie Sheila", "Sir Cleansalot", "Sir Sucks-a-Lot", "Vac Efron", "Hairy Botter", "Meryl Sweep", "Suck Norris", "Dustin Bieber", "Cleanopatra"]],
  ["Sci-fi & pop culture", ["WALL-E", "R2-D2", "R2-Clean2", "Rosie", "Baymax", "Moptimus Prime", "GLaDOS", "Dust Vader"]],
  ["Cute & pet-inspired", ["Dusty", "Dee Dee", "Biscuit", "M-O", "K-9", "Waffles"]],
  ["Formal butlers & classy", ["Alfred", "Jeeves", "Mr. Carson", "Winston"]],
];
const toH = (v, u) => v * ({ s: 1 / 3600, min: 1 / 60, h: 1, d: 24 }[u] ?? 1);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nice = o => NICE[o] || o.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());

// a cartoon of the robot and its dock that changes with what it's doing
// Drawn for this card (not Roborock's artwork): a round robot with a lidar turret, and a tall dock with two water tanks on top
const ART_INK = "#1d2733";
const artRobot = (st, cx, cy, r, mood) => {
  const h = r * 0.33, ry = r * 0.34, tr = r * 0.3, th = r * 0.17, ty = cy - r * 0.1;
  const line = `stroke="${ART_INK}" stroke-width="2.5" stroke-linejoin="round"`;
  const side = "#d5dde7", top = "#ffffff";
  const band = (x, y, rr, hh, rry, fill) => `<path d="M${x - rr} ${y}V${y + hh}A${rr} ${rry} 0 0 0 ${x + rr} ${y + hh}V${y}Z" fill="${fill}" ${line}/>`;
  let s = `<ellipse cx="${cx}" cy="${cy + h + 4}" rx="${r * 1.04}" ry="${ry * 0.55}" fill="#00000038"/>`;
  s += `<g class="sbrush" style="transform-origin:${cx - r * 0.72}px ${cy + h + 2}px"><path d="M${cx - r * 0.72} ${cy + h + 2}l-${r * 0.3} ${r * 0.06}M${cx - r * 0.72} ${cy + h + 2}l${r * 0.12} -${r * 0.22}M${cx - r * 0.72} ${cy + h + 2}l${r * 0.2} ${r * 0.16}" stroke="${ART_INK}" stroke-width="${2}" stroke-linecap="round"/></g>`;
  s += band(cx, cy, r, h, ry, side);
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}" fill="${top}" ${line}/>`;
  s += `<path d="M${cx - r * 0.93} ${cy + h * 0.45}A${r} ${ry} 0 0 0 ${cx + r * 0.93} ${cy + h * 0.45}" fill="none" stroke="${ART_INK}" stroke-width="${2}" opacity="${.55}"/>`;
  s += band(cx, ty, tr, th, tr * 0.42, "#3b4656");
  s += `<ellipse cx="${cx}" cy="${ty}" rx="${tr}" ry="${tr * 0.42}" fill="${"#4d5a6c"}" ${line}/>`;
  s += `<ellipse class="lidar" cx="${cx}" cy="${ty}" rx="${tr * 0.38}" ry="${tr * 0.16}"/>`;
  {   // cartoon face on the bumper
    const ey = cy + ry + h * 0.42, ex = r * 0.24;
    if (mood === "bad") s += `<path d="M${cx - ex - 3} ${ey - 3}l6 6M${cx - ex + 3} ${ey - 3}l-6 6M${cx + ex - 3} ${ey - 3}l6 6M${cx + ex + 3} ${ey - 3}l-6 6" stroke="${ART_INK}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M${cx - 6} ${ey + 8}q6 -4 12 0" fill="none" stroke="${ART_INK}" stroke-width="2" stroke-linecap="round"/>`;
    else if (mood === "sleep") s += `<path d="M${cx - ex - 4} ${ey}q4 3 8 0M${cx + ex - 4} ${ey}q4 3 8 0" fill="none" stroke="${ART_INK}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M${cx - 5} ${ey + 6}q5 3 10 0" fill="none" stroke="${ART_INK}" stroke-width="2" stroke-linecap="round"/>`;
    else s += `<ellipse cx="${cx - ex}" cy="${ey}" rx="3" ry="3.8" fill="${ART_INK}"/><ellipse cx="${cx + ex}" cy="${ey}" rx="3" ry="3.8" fill="${ART_INK}"/>
      <circle cx="${cx - ex + 1}" cy="${ey - 1.3}" r="1" fill="#fff"/><circle cx="${cx + ex + 1}" cy="${ey - 1.3}" r="1" fill="#fff"/>
      <path d="M${cx - 6} ${ey + 6}q6 5 12 0" fill="none" stroke="${ART_INK}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return s;
};
// four robot types (dock: wash / empty / charger / none) - mop-wash dock, self-empty dock, plain charger, or no dock at all
const DUST = { wash: `<path class="puff l" style="animation-delay:0s" d="M186 123a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/><path class="puff l" style="animation-delay:0.9s" d="M188 97a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/><path class="puff r" style="animation-delay:0.45s" d="M260 123a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/><path class="puff r" style="animation-delay:1.35s" d="M258 97a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/>`, empty: `<path class="puff l" style="animation-delay:0s" d="M196 123a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/><path class="puff l" style="animation-delay:0.9s" d="M198 97a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/><path class="puff r" style="animation-delay:0.45s" d="M250 123a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/><path class="puff r" style="animation-delay:1.35s" d="M248 97a8 8 0 0 1 4-15a11 11 0 0 1 21-4a8 8 0 0 1 11 12a7 7 0 0 1-4 7Z"/>` };
const artDock = (st, mode, kind = "wash") => {
  const line = `stroke="${ART_INK}" stroke-width="2.5" stroke-linejoin="round"`;
  // dust clouds puff out of both sides while it empties the bin (drawn first, so they come out from behind the dock)
  let s = mode === "emptying" && DUST[kind] ? `<g class="fx dust" fill="#ddd6c8" stroke="${ART_INK}" stroke-width="2.2" stroke-linejoin="round">${DUST[kind]}</g>` : "";
  const bolt = y => `<path class="fx bolt" transform="translate(0 ${y})" d="M243 6l-9 13h6l-3 10 10 -14h-6l3 -9Z" fill="#ffd166" stroke="${ART_INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
  if (kind === "charger") {   // a small low charging pad; the robot parks in front of it
    s += `<path d="M206 151H274L269 144H211Z" fill="#5d6a7c" ${line}/>`;
    s += `<rect x="218" y="88" width="44" height="58" rx="10" fill="#f4f7fb" ${line}/>`;
    s += `<path d="M227 104h26" stroke="${ART_INK}" stroke-width="1.5" opacity=".4"/><circle class="led" cx="240" cy="96" r="2.6"/>`;
    if (mode === "charging") s += bolt(58);
    return s;
  }
  if (kind === "empty") {   // self-empty dock: a shorter tower with a dust bin window on top
    s += `<path d="M180 151H300L293 140H187Z" fill="#5d6a7c" ${line}/>`;
    s += `<rect x="202" y="50" width="76" height="92" rx="11" fill="#f4f7fb" ${line}/>`;
    s += `<rect x="211" y="57" width="58" height="32" rx="6" fill="#aeb8c4" ${line}/><path d="M213 80h54v3a4 4 0 0 1-4 4h-46a4 4 0 0 1-4-4Z" fill="#b9a988"/>`;
    s += `<rect x="209" y="98" width="62" height="40" rx="7" fill="#2b3442" ${line}/><circle class="led" cx="240" cy="94" r="2.4"/>`;
    if (mode === "emptying") s += `<g class="fx swirl" style="transform-origin:240px 73px" fill="none" stroke="#ffd166" stroke-width="2.4" stroke-linecap="round"><path d="M230 69a11 11 0 0 1 19 -3"/><path d="M250 77a11 11 0 0 1 -19 3"/></g>`;
    if (mode === "charging") s += bolt(22);
    return s;
  }
  s += `<path d="M176 151H294L287 140H183Z" fill="#5d6a7c" ${line}/>`;   // wash dock (Qrevo style): clean + dirty water tanks on top
  s += `<rect x="194" y="28" width="92" height="114" rx="11" fill="#f4f7fb" ${line}/>`;
  s += `<rect x="199" y="32" width="40" height="36" rx="6" fill="#8fd3ff" ${line}/>`;
  s += `<rect x="241" y="32" width="40" height="36" rx="6" fill="#c9bfae" ${line}/>`;
  s += `<path d="M206 46h26M248 46h26" stroke="${ART_INK}" stroke-width="1.5" opacity=".5"/>`;
  s += `<rect x="205" y="80" width="70" height="58" rx="7" fill="#2b3442" ${line}/>`;
  s += `<circle class="led" cx="240" cy="74" r="2.6"/>`;
  if (mode === "drying") s += `<g class="fx warm" fill="none" stroke="#ffb35c" stroke-width="2.4" stroke-linecap="round"><path d="M220 24q-5 -6 0 -12t0 -12"/><path d="M240 22q-5 -6 0 -12t0 -12"/><path d="M260 24q-5 -6 0 -12t0 -12"/></g>`;
  if (mode === "washing") s += `<g class="fx drops" fill="#6fc3ff"><path d="M222 98q3 5 0 7q-3 -2 0 -7Z"/><path d="M240 92q3 5 0 7q-3 -2 0 -7Z"/><path d="M258 98q3 5 0 7q-3 -2 0 -7Z"/></g>`;
  if (mode === "emptying") s += `<g class="fx swirl" style="transform-origin:240px 106px" fill="none" stroke="#ffd166" stroke-width="2.4" stroke-linecap="round"><path d="M228 100a14 14 0 0 1 24 -4"/><path d="M252 112a14 14 0 0 1 -24 4"/><path d="M252 96l1 -6 -6 1M228 116l-1 6 6 -1"/></g>`;
  if (mode === "charging") s += bolt(0);
  return s;
};

// mode: docked / charging / washing / drying / emptying (robot in the dock), cleaning / returning / paused / idle / error (robot out)
const HOME_VIEW = { wash: "62 -6 176 166", empty: "62 18 176 140", charger: "86 56 132 104" };
const robotArt = (style, mode, kind = "wash") => {
  const st = "cartoon";
  if (kind !== "wash" && (mode === "washing" || mode === "drying")) mode = "docked";   // only a wash dock washes and dries mops
  if ((kind === "charger" || kind === "none") && mode === "emptying") mode = "docked";
  let home = ["docked", "charging", "washing", "drying", "emptying"].includes(mode);
  const sleepy = home && kind === "none";   // no dock: on the floor, asleep
  if (kind === "none") home = false;
  const solo = !home && (mode !== "returning" || kind === "none");   // out cleaning / paused / stuck (or no dock): just the robot, zoomed in
  let s = `<svg viewBox="${home ? HOME_VIEW[kind] : solo ? "-2 44 180 114" : "0 0 300 160"}" class="pic" aria-hidden="true">`;   // docked: zoom in on the dock
  s += home ? `<g transform="translate(-88 0)">` : "";
  if (!solo) s += artDock(st, mode, kind);
  if (home) s += artRobot(st, 240, kind === "charger" ? 126 : 120, 32, mode === "docked" ? "sleep" : "ok") + `</g>`;
  else {
    const cx = mode === "returning" && !solo ? 128 : 84;
    if (mode === "cleaning") s += `<g class="fx trail" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity=".55"><path d="M6 152q22 -8 30 -2"/><path d="M2 140q16 -6 24 -2"/></g>`;
    if (mode === "returning" && !solo) s += `<path class="fx dots" d="M${cx + 60} 142H${kind === "charger" ? 206 : 176}" stroke="#ffffff" stroke-width="3" stroke-dasharray="1 9" stroke-linecap="round" opacity=".8"/>`;
    s += `<g class="${sleepy ? "" : "bob"}">${artRobot(st, cx, 112, 52, mode === "error" ? "bad" : sleepy ? "sleep" : "ok")}</g>`;
    if (mode === "error") s += `<g class="fx alertb"><circle cx="${cx + 44}" cy="66" r="12" fill="#ff7a7a" stroke="${ART_INK}" stroke-width="2.5"/><path d="M${cx + 44} 59v8" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="${cx + 44}" cy="72" r="1.8" fill="#fff"/></g>`;
    if (mode === "paused") s += `<g fill="#ffc15e"><rect x="${cx + 38}" y="58" width="5" height="16" rx="2"/><rect x="${cx + 47}" y="58" width="5" height="16" rx="2"/></g>`;
  }
  return s + `</svg>`;
};

const CSS = `
:host { --fg:#ffffff; --muted:#c9d8ea; --ok:#5fd38a; --warn:#ffc15e; --bad:#ff7a7a; --acc:#6fc3ff; --acc2:#9b8cff; display:block; }
[hidden] { display:none !important; }
ha-card { position:relative; overflow:hidden; background:var(--vac-card-bg,#2a2a2a); border:1px solid #ffffff22; border-radius:22px; box-shadow:0 10px 30px #0000002e;
  padding:18px; color:var(--fg); container-type:inline-size; -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); }
ha-card::before { content:""; position:absolute; inset:0 0 auto 0; height:120px; pointer-events:none;
  background:radial-gradient(120% 100% at 0% 0%, var(--tint,#6fc3ff) 0%, transparent 60%); opacity:.18; transition:background .4s; }
ha-card.run { --tint:var(--acc); } ha-card.ok { --tint:var(--ok); } ha-card.warn { --tint:var(--warn); } ha-card.bad { --tint:var(--bad); }
.head { position:relative; display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.scene { position:relative; min-height:200px; display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:12px; align-items:center; border-radius:16px; padding:12px; overflow:hidden; border:1px solid #ffffff14;
  background:radial-gradient(90% 55% at 50% 100%, #ffffff2e 0%, transparent 70%), linear-gradient(#ffffff08,#00000022); }
.sceneart { position:relative; padding-top:46px; align-self:stretch; display:flex; flex-direction:column; justify-content:flex-end; }
.sceneinfo { min-width:0; } .sceneinfo .lbl:first-child { margin-top:0; }
.sceneinfo .chip { font-size:12px; padding:5px 9px 5px 7px; gap:5px; } .sceneinfo .chip ha-icon { --mdc-icon-size:16px; }
.sceneinfo .life { grid-template-columns:repeat(auto-fill,minmax(58px,1fr)); gap:8px 4px; } .sceneinfo .life .g { width:40px; height:40px; } .sceneinfo .life div { font-size:10.5px; }
@container (max-width:560px) { .scene { grid-template-columns:1fr; } }
.nametag { position:absolute; left:0; top:0; display:flex; align-items:center; gap:7px; padding:7px 13px 7px 10px; border-radius:10px;
  background:var(--fg); color:#0b1a2e; font-weight:800; font-size:15px; letter-spacing:-.01em; box-shadow:0 2px 8px #0003; }
.nametag ha-icon { --mdc-icon-size:18px; color:var(--tint,#6fc3ff); }
button.nametag { border:0; cursor:pointer; font-family:inherit; } button.nametag .pen { --mdc-icon-size:15px; color:#0b1a2e66; margin-left:2px; }
.namegrp { margin-top:12px; } .namegrp .chipset button { flex:1 1 auto; font-size:13px; padding:8px 10px; }
.scene .pic { overflow:visible; max-width:440px; margin:0 auto; display:block; width:100%; height:auto; filter:drop-shadow(0 6px 10px #0003); }
.pic .lidar { fill:var(--tint,#6fc3ff); } .pic .led { fill:var(--tint,#5fd38a); }
.pic .sbrush { transform-box:view-box; }
.run .pic .sbrush { animation:spin .5s linear infinite; }
.run .pic .bob { animation:roam 2.6s ease-in-out infinite alternate; }
.pic .fx.trail, .pic .fx.dots { animation:fade 1.4s ease-in-out infinite alternate; }
.pic .fx.warm path { animation:rise 2s ease-in-out infinite; } .pic .fx.warm path:nth-child(2) { animation-delay:.6s; } .pic .fx.warm path:nth-child(3) { animation-delay:1.2s; }
.pic .fx.drops path { animation:drip 1.1s ease-in infinite; } .pic .fx.drops path:nth-child(2) { animation-delay:.35s; } .pic .fx.drops path:nth-child(3) { animation-delay:.7s; }
.pic .fx.swirl { transform-box:view-box; animation:spin 1.6s linear infinite; }
.pic .fx.dust .puff { opacity:0; transform-box:fill-box; transform-origin:center; animation:puff 1.8s ease-out infinite; }
.pic .fx.dust .l { --dx:-34px; } .pic .fx.dust .r { --dx:34px; }
@keyframes puff { 0% { opacity:0; transform:translate(0,0) scale(.5); } 20% { opacity:1; } 100% { opacity:0; transform:translate(var(--dx),-12px) scale(1.25); } }
.pic .fx.bolt, .pic .led, .pic .fx.alertb { animation:blink 1.6s ease-in-out infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes roam { from { transform:translateX(-10px); } to { transform:translateX(14px); } }
@keyframes fade { from { opacity:.15; } to { opacity:.7; } }
@keyframes rise { 0% { opacity:0; transform:translateY(6px); } 40% { opacity:1; } 100% { opacity:0; transform:translateY(-8px); } }
@keyframes drip { 0% { opacity:0; transform:translateY(-6px); } 30% { opacity:1; } 100% { opacity:0; transform:translateY(14px); } }
.title { min-width:0; flex:1; }
.name { font-weight:800; font-size:21px; letter-spacing:-.01em; line-height:1.15; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.status { display:flex; align-items:center; gap:7px; margin-top:3px; font-size:14px; color:var(--muted); min-width:0; }
.status b { color:var(--fg); font-weight:700; white-space:nowrap; } .status span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dot { width:9px; height:9px; border-radius:50%; background:var(--tint,#9fb0c3); flex:none; box-shadow:0 0 0 3px #ffffff14; }
.run .dot { animation:blink 1.2s ease-in-out infinite; } @keyframes blink { 50% { opacity:.35; } }
.ring { position:relative; width:58px; height:58px; flex:none; }
.ring svg { width:100%; height:100%; transform:rotate(-90deg); }
.ring circle { fill:none; stroke-width:5; } .ring .bg { stroke:#ffffff22; } .ring .fg { stroke:var(--ok); stroke-linecap:round; transition:stroke-dashoffset .6s, stroke .3s; }
.ring b { position:absolute; inset:0; display:grid; place-items:center; font-size:14px; font-variant-numeric:tabular-nums; }
.ring ha-icon { position:absolute; right:-2px; bottom:-2px; --mdc-icon-size:18px; color:var(--warn); background:#0b1a2e; border-radius:50%; }
.prog { height:4px; border-radius:2px; background:#ffffff1f; overflow:hidden; margin:-6px 0 14px; }
.prog i { display:block; height:100%; width:0; background:linear-gradient(90deg,var(--acc),var(--acc2)); transition:width .6s; }
.body { position:relative; display:grid; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); grid-template-areas:"map ctrls"; gap:18px; }
.body > .panel { grid-area:map; } .ctrls { grid-area:ctrls; min-width:0; }
@container (max-width:640px) { .body { grid-template-columns:1fr; grid-template-areas:"map" "ctrls"; } .scene { min-height:0; } }
.panel { display:flex; flex-direction:column; background:#0000001f; border:1px solid #ffffff14; border-radius:16px; padding:12px; }
.map { position:relative; flex:1; min-height:var(--vac-map-height,300px); margin-top:14px; border-radius:12px; background:#00000033; min-height:220px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.map img { position:absolute; inset:8px; width:calc(100% - 16px); height:calc(100% - 16px); object-fit:contain; }   /* the map fills its box; its empty border is trimmed off */
.map .none { color:var(--muted); font-size:14px; padding:20px; text-align:center; }
.map .tag { position:absolute; left:10px; top:10px; font-size:12px; font-weight:700; padding:4px 10px; border-radius:999px; background:#0b1a2ecc; color:var(--muted);
  display:flex; align-items:center; gap:5px; } .map .tag ha-icon { --mdc-icon-size:15px; }
.map .tag.live { color:var(--fg); } .map .tag.live::before { content:""; width:7px; height:7px; border-radius:50%; background:var(--bad); animation:blink 1.2s infinite; }
.lbl { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:800; margin:16px 0 8px; display:flex; align-items:center; gap:8px; }
.lbl::after { content:""; flex:1; height:1px; background:#ffffff1a; }
button { font:inherit; color:var(--fg); background:var(--vac-btn-bg,#ffffff1f); border:1px solid #ffffff22; border-radius:12px; cursor:pointer;
  transition:background .15s, border-color .15s, transform .1s; -webkit-tap-highlight-color:transparent; }
button:hover:not(:disabled) { border-color:#ffffff55; } button:active:not(:disabled) { transform:scale(.97); }
button:disabled { opacity:.38; cursor:default; }
button ha-icon { --mdc-icon-size:20px; }
.rooms { display:flex; flex-wrap:wrap; gap:4px; padding:4px; border-radius:14px; background:#0000002e; border:1px solid #ffffff12; }
.rooms button { flex:1 1 84px; min-width:0; display:flex; flex-direction:column; align-items:center; gap:2px; border-radius:10px; padding:7px 4px; font-size:12px; font-weight:700;
  background:transparent; border-color:transparent; color:var(--muted); }
.rooms button ha-icon { --mdc-icon-size:20px; }
.rooms button.on { background:var(--fg); color:#0b1a2e; box-shadow:0 2px 8px #0003; }
.go { width:100%; margin-top:12px; padding:12px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:15px; font-weight:800;
  background:var(--fg); border:0; color:#0b1a2e; box-shadow:0 2px 8px #0003; }
.go:disabled { background:#ffffff14; color:var(--muted); box-shadow:none; opacity:1; }
.acts { display:grid; grid-template-columns:1.6fr 1fr 1fr; gap:8px; }
.acts button { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:10px 6px; font-size:13px; font-weight:700; }
.acts .main { flex-direction:row; gap:8px; font-size:16px; font-weight:800; background:var(--fg); color:#0b1a2e; border-color:var(--fg); }
.acts .main ha-icon { --mdc-icon-size:26px; }
.acts .main.pause { background:var(--warn); border-color:var(--warn); }
.stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:10px; }
.stat { display:flex; gap:8px; align-items:center; background:#ffffff10; border-radius:12px; padding:9px 10px; min-width:0; }
.stat ha-icon { --mdc-icon-size:20px; color:var(--acc); flex:none; }
.stat div { min-width:0; } .stat span { display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.stat b { display:block; font-size:15px; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.seg { display:flex; gap:4px; padding:4px; border-radius:14px; background:#0000002e; border:1px solid #ffffff12; }
.seg button { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; gap:2px; padding:7px 2px; font-size:12px; font-weight:700;
  background:transparent; border-color:transparent; color:var(--muted); border-radius:10px; }
.seg button span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.seg button.on { background:var(--fg); color:#0b1a2e; box-shadow:0 2px 8px #0003; }
.chips { display:flex; flex-wrap:wrap; gap:7px; }
.chip { display:flex; align-items:center; gap:7px; padding:6px 11px 6px 8px; border-radius:999px; background:#ffffff12; font-size:13px; }
.chip ha-icon { --mdc-icon-size:18px; color:var(--ok); } .chip span { color:var(--muted); } .chip b { font-weight:700; }
.chip.warn ha-icon, .chip.warn b { color:var(--warn); } .chip.bad ha-icon, .chip.bad b { color:var(--bad); } .chip.run ha-icon { color:var(--acc); }
.bin { display:flex; align-items:center; gap:10px; margin-top:14px; padding:10px 12px; border-radius:14px; background:#ffffff12; font-size:14px; }
.bin.full { background:#ffc15e2e; color:var(--warn); }
.bin span { flex:1; } .bin button { padding:6px 12px; font-weight:700; }
.bin[hidden] { display:none; }
.life { display:grid; grid-template-columns:repeat(auto-fill,minmax(68px,1fr)); gap:10px 6px; }
.life div { display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; font-size:11.5px; color:var(--muted); }
.life .g { position:relative; width:46px; height:46px; }
.life svg { width:100%; height:100%; transform:rotate(-90deg); } .life circle { fill:none; stroke-width:4; } .life .bg { stroke:#ffffff1c; }
.life .g ha-icon { position:absolute; inset:0; margin:auto; --mdc-icon-size:18px; color:var(--fg); }
.life small { font-size:11px; color:var(--fg); font-weight:700; font-variant-numeric:tabular-nums; }
.alert { display:flex; align-items:center; gap:10px; margin:-4px 0 14px; padding:10px 12px; border-radius:14px; background:#ff7a7a2e; border:1px solid #ff7a7a66; font-size:14px; }
.alert ha-icon { color:var(--bad); --mdc-icon-size:22px; flex:none; } .alert b { color:#fff; }
@container (max-width:420px) { .seg button { font-size:11px; padding:6px 0; } .name { font-size:19px; } }
.err { color:var(--bad); font-size:13px; min-height:1em; margin-top:10px; }
.setup { color:var(--muted); line-height:1.6; font-size:15px; }
@media (prefers-reduced-motion: reduce) { .pic *, .pic, .run .dot, .map .tag.live::before { animation:none !important; } }
`;

// find a vacuum by a regex on its entity id, friendly name or device (name, name_by_user, model) - used when there are two robots
const findVac = (h, find) => {
  const re = new RegExp(find, "i");
  return Object.keys(h.states).find(e => {
    if (!e.startsWith("vacuum.")) return false;
    const d = h.devices?.[h.entities?.[e]?.device_id] || {};
    return [e, h.states[e].attributes.friendly_name, d.name, d.name_by_user, d.model].some(x => x && re.test(x));
  }) || null;
};

class RobotVacCard extends HTMLElement {
  constructor() { super(); this._config = {}; this._sel = new Set(); this._rooms = null; }
  setConfig(c) { this._config = { bin_every: 2, ...c }; }
  getCardSize() { return 10; }
  static getStubConfig() { return {}; }
  set hass(h) { this._hass = h; this._render(); }

  _vac() {
    const h = this._hass;
    if (this._config.entity) return h.states[this._config.entity] ? this._config.entity : null;
    if (this._config.find) return findVac(h, this._config.find);   // two robots: never fall back to the other one
    return Object.keys(h.entities || {}).find(e => e.startsWith("vacuum.") && h.entities[e].platform === "roborock")
      || Object.keys(h.states).find(e => e.startsWith("vacuum."));
  }
  // entities on the vacuum's device, matched by translation_key or entity_id ending
  // + the robot's dock, which Roborock adds as its own device ("<robot> Dock", same model + " Dock") with no link to the robot
  _devs() {
    const h = this._hass, id = h.entities?.[this._v]?.device_id, d = h.devices?.[id], ids = new Set([id]);
    const mine = d ? [d.name, d.name_by_user].filter(Boolean) : [];   // the original name too, so renaming the robot keeps its dock
    if (d) Object.entries(h.devices || {}).forEach(([k, x]) => {
      if (x.via_device_id === id || ([x.name, x.name_by_user].some(n => n && mine.some(m => n.startsWith(m + " "))) && (!d.model || String(x.model || "").startsWith(d.model)))) ids.add(k);
    });
    return ids;
  }
  // Q7 M5 family (B01 protocol, model roborock.vacuum.sc..): different room-clean command, no repeat, no dock status
  _isQ7() { const h = this._hass, d = h.devices?.[h.entities?.[this._v]?.device_id]; return /roborock\.vacuum\.sc\d/i.test(d?.model || ""); }
  _roomCmd(segs, repeat) {
    return this._isQ7() ? { command: "service.set_room_clean", params: { clean_type: 1, ctrl_value: 1, room_ids: segs } }   // python-roborock Q7 clean_segments
      : { command: "app_segment_clean", params: [{ segments: segs, repeat }] };
  }
  // which picture: dock: wash / empty / charger / none in the config, or worked out from the dock's own entities
  _dockKind() {
    const c = this._config.dock;
    if (["wash", "empty", "charger", "none"].includes(c)) return c;
    if (this._config.carry) return "none";   // carried to another floor: no dock there
    if (this._find("switch", /mop_washing/) || this._find("binary_sensor", /clean_water_box/)) return "wash";
    if (this._find("switch", /dust_emptying/) || this._find("select", /empty_mode|dust_collection_mode/)) return "empty";   // Q7: dust collection mode select
    return "charger";
  }
  _find(dom, re) {
    const h = this._hass, devs = this._devs();
    return Object.values(h.entities || {}).find(x => devs.has(x.device_id) && x.entity_id.startsWith(dom + ".")
      && (re.test(x.translation_key || "") || re.test(x.entity_id)))?.entity_id;
  }
  _st(id) { const s = id && this._hass.states[id]; return s && !["unknown", "unavailable"].includes(s.state) ? s : null; }
  _fmt(id) { const s = this._st(id); return s ? (this._hass.formatEntityState?.(s) ?? `${s.state} ${s.attributes.unit_of_measurement || ""}`) : "–"; }

  _build() {
    const r = this.shadowRoot || this.attachShadow({ mode: "open" });
    const C = 2 * Math.PI * 24;
    r.innerHTML = `<style>${CSS}${SCHED_CSS}</style><ha-card id="card">
      <div class="head">
        <div class="title"><div class="name" id="name"></div><div class="status"><i class="dot"></i><b id="st"></b><span id="sub"></span></div></div>
        <div class="ring" title="Battery"><svg viewBox="0 0 58 58"><circle class="bg" cx="29" cy="29" r="24"/><circle class="fg" id="batring" cx="29" cy="29" r="24"
          stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><b id="bat">–</b><ha-icon id="chg" icon="mdi:lightning-bolt" hidden></ha-icon></div>
      </div>
      <div class="prog" id="prog" hidden><i id="progbar"></i></div>
      <div class="alert" id="alert" hidden><ha-icon icon="mdi:alert-circle"></ha-icon><span id="alertT"></span></div>
      <div class="body">
        <div class="panel"><div class="scene" id="scene"><div class="sceneart"><button class="nametag" id="nameBtn" title="Name your robot"><ha-icon icon="mdi:robot-vacuum"></ha-icon><span id="robotName"></span><ha-icon class="pen" icon="mdi:pencil"></ha-icon></button><div id="art"></div></div>
          <div class="sceneinfo"><div id="dockbox" hidden><div class="lbl">Dock</div><div class="chips" id="dock2"></div></div><div class="lbl">Care</div><div class="life" id="life"></div></div></div>
          <div class="lbl">Rooms</div><div class="rooms" id="rooms"><span class="setup">Loading rooms…</span></div>
          <button class="go" id="clean" disabled><ha-icon icon="mdi:gesture-tap"></ha-icon><span id="cleanT">Pick rooms to clean</span></button>
          <div class="map" id="map"><span class="none">No map yet. Let the robot finish a mapping run${this._config.where ? " " + esc(this._config.where) : ""}.</span></div></div>
        <div class="ctrls">
          <div class="acts">
            <button class="main" id="start"><ha-icon id="startI" icon="mdi:play"></ha-icon><span id="startT">Clean all</span></button>
            <button id="dock"><ha-icon icon="mdi:home-import-outline"></ha-icon>Dock</button>
            <button id="find"><ha-icon icon="mdi:map-marker-radius-outline"></ha-icon>Find</button>
          </div>
          <div class="stats">
            <div class="stat"><ha-icon icon="mdi:texture-box"></ha-icon><div><span>Area</span><b id="area">–</b></div></div>
            <div class="stat"><ha-icon icon="mdi:timer-outline"></ha-icon><div><span>Time</span><b id="time">–</b></div></div>
            <div class="stat"><ha-icon icon="mdi:history"></ha-icon><div><span id="lastL">Last run</span><b id="last">–</b></div></div>
          </div>
          <div id="mopbox" hidden><div class="lbl">Clean with</div><div class="seg" id="mopc"></div></div>
          <div class="lbl">Suction</div><div class="seg" id="fan"></div>
          <div id="mopbox2" hidden><div class="lbl">Mop water</div><div class="seg" id="mopi"></div><div class="lbl">Mop route</div><div class="seg" id="mopm"></div></div>
          <div id="schedwrap" hidden><div class="lbl">Schedule</div><div id="schedbox"></div></div>
          <div class="bin" id="bin" hidden><ha-icon icon="mdi:delete-outline"></ha-icon><span id="binT"></span><button id="emptied">Emptied</button></div>
          <div class="err" id="err"></div>
        </div>
      </div></ha-card>`;
    const vac = s => () => this._call("vacuum", s, {}, { entity_id: this._v });
    r.getElementById("start").onclick = async () => {   // one button - Clean all / Pause / Resume
      const st = this._hass.states[this._v]?.state;
      if (st === "cleaning") return vac("pause")();
      if (st === "paused") return vac("start")();
      if (!(await this._prep())) return;   // map/carry/mode first; with skip: "Clean all" = every room except the skipped ones
      const skip = (this._config.skip || []).map(String);
      if (skip.length && this._rooms?.length) this._call("vacuum", "send_command", this._roomCmd(this._rooms.map(([id]) => id).filter(id => !skip.includes(id)).map(Number), 1), { entity_id: this._v });
      else vac("start")();
    };
    r.getElementById("dock").onclick = vac("return_to_base");
    r.getElementById("nameBtn").onclick = () => this._nameOpen();
    r.getElementById("find").onclick = vac("locate");
    r.getElementById("clean").onclick = async () => {
      const segs = [...this._sel].map(Number);
      if (!(await this._prep())) return;
      this._call("vacuum", "send_command", this._roomCmd(segs, 1), { entity_id: this._v })
        .then(ok => { if (ok) { this._sel.clear(); this._drawRooms(); } });
    };
    r.getElementById("emptied").onclick = () => {
      const n = Number(this._st(this._countId)?.state);
      if (this._config.bin_helper && !isNaN(n)) this._call("input_number", "set_value", { value: n }, { entity_id: this._config.bin_helper });
    };
    this._built = true;
  }

  async _call(dom, svc, data, target) {
    const e = this.shadowRoot.getElementById("err"); e.textContent = "";
    try { await this._hass.callService(dom, svc, data, target); return true; }
    catch (x) { e.textContent = `Couldn't send that: ${x.message || x}`; return false; }
  }

  // one robot, two floors. config map: "Map 1" pins this card to a map (rooms + image) and loads that map before
  // cleaning (room ids are reused across maps); carry: true = refuse while docked (it has to be carried there);
  // mode: "vacuum" = set cleaning_mode first (e.g. no dock on that floor to wash the mops)
  _mapN() { const m = String(this._config.map || "").match(/\d+/); return m ? Number(m[0]) : null; }
  async _prep() {
    const c = this._config, e = this.shadowRoot.getElementById("err");
    if (c.carry && this._hass.states[this._v]?.state === "docked") { e.textContent = "It's on the dock. Carry it up first, then press again."; return false; }
    if (c.mode) { const cm = this._find("select", /cleaning_mode/); if (cm && this._st(cm)?.state !== c.mode) await this._call("select", "select_option", { option: c.mode }, { entity_id: cm }); }
    if (c.map) {
      const sel = this._find("select", /selected_map/);
      if (sel && this._st(sel)?.state !== c.map) {
        if (!(await this._call("select", "select_option", { option: c.map }, { entity_id: sel }))) return false;
        e.textContent = `Loading ${c.map}…`; await new Promise(res => setTimeout(res, 15000)); e.textContent = "";
      }
    }
    return true;
  }

  // room names + segment ids from roborock.get_maps (a service that returns data)
  async _loadRooms() {
    if (this._roomsLoading) return; this._roomsLoading = true;
    try {
      const res = await this._hass.callWS({ type: "call_service", domain: "roborock", service: "get_maps",
        target: { entity_id: this._v }, return_response: true });
      const maps = res?.response?.[this._v]?.maps || [];
      const cur = this._st(this._find("select", /selected_map/))?.state;
      const N = this._mapN();   // get_maps names can be "", so match "Map N" by flag (= map number)
      const m = N !== null ? (maps.find(x => x.flag === N) || maps[N])
        : (maps.find(x => x.name && x.name === cur) || maps.find(x => `Map ${x.flag}` === cur) || maps[0]);
      const rooms = m?.rooms || {};
      this._rooms = Array.isArray(rooms) ? rooms.map(x => [String(x.id ?? x.segment_id), x.name]) : Object.entries(rooms);
      const skip = (this._config.skip || []).map(String);   // skip: [19] hides rooms (e.g. a bathroom that may be wet)
      this._rooms = this._rooms.filter(([id]) => !skip.includes(id));
    } catch (x) { this._rooms = []; this._roomsErr = x.message || String(x); }
    this._roomsLoading = false; this._drawRooms();
  }
  _drawRooms() {
    const r = this.shadowRoot, box = r.getElementById("rooms"), go = r.getElementById("clean");
    if (!this._rooms) return;
    if (!this._rooms.length) {
      box.innerHTML = `<span class="setup">${this._roomsErr ? "Couldn't load rooms." : "No rooms yet. Name them in the Roborock app."}</span>`;
    } else {
      box.innerHTML = this._rooms.map(([id, n]) => `<button data-id="${esc(id)}" class="${this._sel.has(id) ? "on" : ""}"><ha-icon icon="${this._sel.has(id) ? "mdi:check-circle" : roomIcon(n)}"></ha-icon>${esc(n)}</button>`).join("");
      box.querySelectorAll("button").forEach(b => b.onclick = () => {
        this._sel.has(b.dataset.id) ? this._sel.delete(b.dataset.id) : this._sel.add(b.dataset.id); this._drawRooms();
      });
    }
    const n = this._sel.size;
    go.disabled = !n; r.getElementById("cleanT").textContent = n ? `Clean ${n} room${n > 1 ? "s" : ""}` : "Pick rooms to clean";
    go.querySelector("ha-icon").setAttribute("icon", n ? "mdi:play-circle" : "mdi:gesture-tap");
  }

  // a segmented control for one of the robot's selects (or the fan list), with app-only options left out
  _seg(boxId, opts, cur, onPick) {
    const box = this.shadowRoot.getElementById(boxId), show = opts.filter(o => !HIDE.has(o)), key = show.join("|") + "/" + cur;
    if (box.dataset.k === key) return;
    box.dataset.k = key;
    box.innerHTML = show.map(o => `<button data-o="${esc(o)}" class="${o === cur ? "on" : ""}" title="${esc(nice(o))}">${ICON[o] ? `<ha-icon icon="${ICON[o]}"></ha-icon>` : ""}<span>${esc(nice(o))}</span></button>`).join("");
    box.querySelectorAll("button").forEach(b => b.onclick = () => onPick(b.dataset.o));
  }
  // Roborock's map picture has a wide empty border; crop to the drawn part so the rooms come out bigger
  _trimMap(src, img) {
    const im = new Image();
    im.onload = () => {
      if (this._mapSrc !== src) return;
      try {
        const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement("canvas"); c.width = w; c.height = h;
        const g = c.getContext("2d"); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, w, h).data;
        const bg = [d[0], d[1], d[2], d[3]], diff = i => Math.abs(d[i + 3] - bg[3]) > 24 || (d[i + 3] > 24 && Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 36);
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (diff((y * w + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) { img.src = src; return; }
        const pad = Math.round(Math.max(w, h) * 0.02); x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
        const o = document.createElement("canvas"); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
        o.getContext("2d").drawImage(im, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        img.src = o.toDataURL("image/png");
      } catch (x) { img.src = src; }   // can't read the pixels: show it as it is
    };
    im.onerror = () => { img.src = src; };
    im.src = src;
  }
  _when(iso) {
    const t = new Date(iso); if (isNaN(t)) return null;
    const d = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
    const hm = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return [d <= 0 ? "Last run · today" : d === 1 ? "Last run · yday" : "Last run · " + t.toLocaleDateString([], { weekday: "short" }), hm];
  }

  _render() {
    const h = this._hass; if (!h) return;
    this._v = this._vac();
    if (!this._v) {
      const r = this.shadowRoot || this.attachShadow({ mode: "open" }); this._built = false;
      r.innerHTML = `<style>${CSS}</style><ha-card><div class="head"><div class="title"><div class="name">${esc(this._config.name || "Vacuum")}</div></div></div>
        <div class="setup">Waiting for the robot. Add it in Settings → Devices &amp; services → Add integration → Roborock.</div></ha-card>`;
      return;
    }
    if (!this._built) this._build();
    if (!this._rooms) this._loadRooms();
    const progKey = this._schedIds().join();   // (re)load programmes when they're added or removed anywhere
    if (progKey !== this._progKey && !this._progsLoading) { this._progKey = progKey; this._progsLoading = true; this._schedLoad().then(() => { this._progsLoading = false; this._schedStrip(); }); }
    const r = this.shadowRoot, v = h.states[this._v], a = v.attributes;
    this._schedStrip();
    r.getElementById("name").textContent = this._config.name || a.friendly_name || "Vacuum";
    if (this._config.map_height) r.getElementById("card").style.setProperty("--vac-map-height", `${parseInt(this._config.map_height, 10)}px`);

    // status line: vacuum state + the richer status sensor, current room while cleaning, error text when stuck
    const [label, cls] = STATES[v.state] || [v.state, ""];
    const err = this._st(this._find("sensor", /vacuum_error/)), status = this._st(this._find("sensor", /(^|\.|_)status$/))?.state;
    const room = this._st(this._find("sensor", /current_room/))?.state, prog = Number(this._st(this._find("sensor", /cleaning_progress/))?.state);
    r.getElementById("card").className = cls;
    r.getElementById("st").textContent = label;
    let sub = "";
    if (v.state === "error") sub = err && err.state !== "none" ? err.state.replace(/_/g, " ") : "";
    else if (v.state === "cleaning") sub = [DETAIL[status] && DETAIL[status] !== "Cleaning" ? DETAIL[status] : "", room].filter(Boolean).join(" · ");
    else if (DETAIL[status] && DETAIL[status] !== label) sub = DETAIL[status];
    r.getElementById("sub").textContent = sub ? "· " + sub : "";
    // say what's wrong and what to do, in a banner you can't miss
    const dockErr = this._st(this._find("sensor", /dock_error/))?.state;
    const alertT = v.state === "error" ? `<b>${esc(sub ? sub[0].toUpperCase() + sub.slice(1) : "It's stuck")}.</b> Sort it out, then press Clean all or Dock.`
      : dockErr && !["ok", "none"].includes(dockErr) ? `<b>Dock: ${esc(dockErr.replace(/_/g, " "))}.</b> Check the dock's tanks.` : "";
    r.getElementById("alert").hidden = !alertT; if (r.getElementById("alertT").innerHTML !== alertT) r.getElementById("alertT").innerHTML = alertT;
    // the picture follows what the robot is doing
    const drying = Number(this._st(this._find("sensor", /mop_drying_remaining_time/))?.state) > 0;
    const mode = v.state === "error" ? "error" : v.state === "cleaning" ? "cleaning" : v.state === "returning" ? "returning" : v.state === "paused" ? "paused"
      : v.state !== "docked" ? "idle" : /wash/.test(status || "") ? "washing" : status === "emptying_the_bin" ? "emptying"
      : drying || status === "air_drying_stopping" ? "drying" : status === "charging" ? "charging" : "docked";
    const kind = this._dockKind(), artBox = r.getElementById("art"), artKey = kind + "/" + mode;
    const dv = h.devices?.[h.entities?.[this._v]?.device_id];   // the robot's own name (renamed from the card = device name_by_user)
    r.getElementById("robotName").textContent = this._config.robot_name || dv?.name_by_user || dv?.name || a.friendly_name || "Robot";
    if (artBox.dataset.k !== artKey) {
      artBox.dataset.k = artKey;
      artBox.innerHTML = robotArt("cartoon", mode, kind);
    }
    const pg = r.getElementById("prog"); pg.hidden = !(v.state === "cleaning" && prog > 0);
    r.getElementById("progbar").style.width = `${Math.min(100, prog || 0)}%`;

    const N = this._mapN(), imgs = Object.values(h.entities).filter(x => x.device_id === h.entities[this._v]?.device_id && x.entity_id.startsWith("image."));
    const pick = (N !== null && imgs.find(x => x.entity_id.endsWith(`_map_${N}`))) || imgs[0];
    const map = this._st(pick?.entity_id);
    const mapBox = r.getElementById("map");
    if (map?.attributes.entity_picture) {
      const src = `${map.attributes.entity_picture}&t=${encodeURIComponent(map.state)}`;
      let img = mapBox.querySelector("img");
      if (!img) { mapBox.innerHTML = `<span class="tag" id="tag"></span>`; img = document.createElement("img"); img.alt = "Map"; mapBox.prepend(img); }
      if (this._mapSrc !== src) { this._mapSrc = src; this._trimMap(src, img); }
      const tag = r.getElementById("tag"), live = v.state === "cleaning";
      tag.className = `tag${live ? " live" : ""}`;
      tag.innerHTML = live ? `Live${room ? " · " + esc(room) : ""}` : `<ha-icon icon="mdi:map-outline"></ha-icon>${esc(this._config.where ? this._config.where[0].toUpperCase() + this._config.where.slice(1) : (map.attributes.friendly_name || "Map").replace(/^.*?(Map \d+)$/, "$1"))}`;
    }

    const batId = this._find("sensor", /battery/);
    const bat = Number(this._st(batId)?.state ?? a.battery_level), C = 2 * Math.PI * 24;
    r.getElementById("bat").textContent = isNaN(bat) ? "–" : `${bat}%`;
    const br = r.getElementById("batring");
    br.style.strokeDashoffset = C * (1 - (isNaN(bat) ? 0 : bat) / 100); br.style.stroke = bat < 20 ? "var(--bad)" : bat < 40 ? "var(--warn)" : "var(--ok)";
    r.getElementById("chg").hidden = this._st(this._find("binary_sensor", /(^|_)charging$/))?.state !== "on";
    r.getElementById("area").textContent = this._fmt(this._find("sensor", /(^|\.|_)cleaning_area$/));
    r.getElementById("time").textContent = this._fmt(this._find("sensor", /(^|\.|_)cleaning_time$/));
    const [lastL, last] = this._when(this._st(this._find("sensor", /last_clean_begin/))?.state) || [];
    r.getElementById("lastL").textContent = lastL || "Last run"; r.getElementById("last").textContent = last || "–";

    const busy = v.state === "cleaning", paused = v.state === "paused";
    const sb = r.getElementById("start");
    sb.className = `main${busy ? " pause" : ""}`;
    r.getElementById("startI").setAttribute("icon", busy ? "mdi:pause" : "mdi:play");
    r.getElementById("startT").textContent = busy ? "Pause" : paused ? "Resume" : "Clean all";
    r.getElementById("dock").disabled = v.state === "docked";

    this._seg("fan", a.fan_speed_list || [], a.fan_speed, f => this._call("vacuum", "set_fan_speed", { fan_speed: f }, { entity_id: this._v }));

    // mop: the Roborock integration's own selects on this device
    const segSel = (boxId, id) => {
      const s = this._st(id); if (!s) { r.getElementById(boxId).innerHTML = ""; r.getElementById(boxId).dataset.k = ""; return false; }
      this._seg(boxId, s.attributes.options || [], s.state, o => this._call("select", "select_option", { option: o }, { entity_id: id }));
      return true;
    };
    const cmId = this._find("select", /cleaning_mode/), mc = segSel("mopc", cmId);
    const mopping = !mc || this._st(cmId).state !== "vacuum";   // water + route only matter when it mops
    const mi = segSel("mopi", this._find("select", /mop_intensity/)), mm = segSel("mopm", this._find("select", /mop_mode/));
    r.getElementById("mopbox").hidden = !mc;
    r.getElementById("mopbox2").hidden = !(mopping && (mi || mm));
    r.getElementById("mopi").previousElementSibling.hidden = r.getElementById("mopi").hidden = !mi;
    r.getElementById("mopm").previousElementSibling.hidden = r.getElementById("mopm").hidden = !mm;

    // dock (self-empty / mop-wash docks): whatever of these the integration exposes for this robot
    const dockRows = [
      ["Dock", "mdi:home-outline", this._find("sensor", /dock_error/), s => s.state === "ok" || s.state === "none" ? ["OK", ""] : [s.state.replace(/_/g, " "), "bad"]],
      ["Mops", "mdi:weather-windy", this._find("sensor", /mop_drying_remaining_time/), s => Number(s.state) > 0 ? ["Drying, " + this._fmt(s.entity_id) + " left", "run"] : ["Dry", ""]],
      ["Clean water", "mdi:cup-water", this._find("binary_sensor", /water_shortage/), s => s.state === "on" ? ["Refill", "warn"] : ["OK", ""]],
      ["Water box", "mdi:water-check-outline", this._find("binary_sensor", /water_box_attached/), s => s.state === "on" ? ["Fitted", ""] : ["Not fitted", "warn"]],
      ["Mop pads", "mdi:checkbox-blank-circle-outline", this._find("binary_sensor", /mop_attached/), s => s.state === "on" ? ["Fitted", ""] : ["Not fitted", "warn"]],
    ].map(([n, icon, id, f]) => { const s = this._st(id); if (!s) return ""; const [t, c] = f(s); return `<div class="chip ${c}"><ha-icon icon="${icon}"></ha-icon><span>${n}</span><b>${esc(t)}</b></div>`; }).join("");
    const d2 = r.getElementById("dock2"); if (d2.dataset.k !== dockRows) { d2.dataset.k = dockRows; d2.innerHTML = dockRows; }
    r.getElementById("dockbox").hidden = !dockRows;

    // bin: runs since it was last emptied = lifetime clean count - count saved when "Emptied" was pressed
    this._countId = this._find("sensor", /clean(ing)?_count/);
    const count = Number(this._st(this._countId)?.state), at = Number(this._st(this._config.bin_helper)?.state);
    const bin = r.getElementById("bin");
    bin.hidden = isNaN(count) || isNaN(at);
    if (!bin.hidden) {
      const runs = Math.max(0, count - at), full = runs >= this._config.bin_every;
      bin.className = `bin${full && at > 0 ? " full" : ""}`;
      // helper starts at 0, and a second-hand robot already has a big lifetime count
      r.getElementById("binT").textContent = at === 0 ? "Press Emptied the next time you empty the bin" : full ?`Empty the bin: ${runs} runs since it was last emptied`
        : runs ? `${runs} run since the bin was emptied` : "Bin emptied";
    }

    const LC = 2 * Math.PI * 20;
    const life = Object.entries(LIFE).map(([k, [name, total, icon]]) => {
      const s = this._st(this._find("sensor", new RegExp(`${k}_time_left`)));
      if (!s) return "";
      const left = toH(Number(s.state), s.attributes.unit_of_measurement), pct = Math.max(0, Math.min(100, left / total * 100));
      const col = pct < 15 ? "var(--bad)" : pct < 35 ? "var(--warn)" : "var(--ok)";
      return `<div><div class="g"><svg viewBox="0 0 46 46"><circle class="bg" cx="23" cy="23" r="20"/><circle cx="23" cy="23" r="20" stroke="${col}" stroke-linecap="round"
        stroke-dasharray="${LC}" stroke-dashoffset="${LC * (1 - pct / 100)}"/></svg><ha-icon icon="${icon}"></ha-icon></div>${name}<small>${Math.round(left)} h</small></div>`;
    }).join("");
    const lb = r.getElementById("life"); if (lb.dataset.k !== life) { lb.dataset.k = life; lb.innerHTML = life; }
  }
}

// ---------- schedules ----------
// Each programme is a normal HA automation (id mmb_vac_<robot>_<n>), so it runs with no dashboard open and shows in Settings → Automations.
// The programme itself is kept as JSON in the automation's description, so the pop-up can open it again exactly as saved.
// Steps run one after another: load the map, set the mode, send the rooms,
// wait for it to leave the dock, then wait until it's docked and settled for 90 s before the next step.
const DAYS = [["mon", "M"], ["tue", "T"], ["wed", "W"], ["thu", "T"], ["fri", "F"], ["sat", "S"], ["sun", "S"]];
const MODES = [["vacuum", "Hoover", "mdi:robot-vacuum"], ["vac_and_mop", "Hoover + mop", "mdi:water-plus-outline"], ["mop", "Mop", "mdi:water-outline"]];
const SCHED_TAG = "mmb-vac:";
const daysText = d => d.length === 7 ? "Every day" : d.join() === "mon,tue,wed,thu,fri" ? "Weekdays" : d.join() === "sat,sun" ? "Weekends"
  : d.map(x => x[0].toUpperCase() + x.slice(1, 3)).join(", ");
const SUGGEST = rooms => {
  const f = re => rooms.filter(([, n]) => re.test(n)).map(([id]) => Number(id));
  const living = f(/living|lounge|front room/i), kitchen = f(/kitchen/i), all = rooms.map(([id]) => Number(id));
  return [
    { name: "Morning hoover", icon: "mdi:weather-sunset-up", time: "07:00", days: ["mon", "tue", "wed", "thu", "fri"], steps: [{ rooms: living.length ? living : all.slice(0, 1), mode: "vacuum", fan: "balanced", water: "medium", passes: 1 }] },
    { name: "Lunchtime kitchen", icon: "mdi:silverware-fork-knife", time: "12:00", days: DAYS.map(([d]) => d), steps: [{ rooms: kitchen.length ? kitchen : all.slice(-1), mode: "vacuum", fan: "turbo", water: "medium", passes: 1 }] },
    { name: "Weekend deep clean", icon: "mdi:calendar-weekend-outline", time: "10:00", days: ["sat"], steps: [{ rooms: all, mode: "vacuum", fan: "max", water: "medium", passes: 2 }, { rooms: all, mode: "mop", fan: "balanced", water: "high", passes: 1 }] },
  ];
};
const SCHED_CSS = `
.nextline { display:flex; align-items:center; gap:8px; font-size:14px; margin:0 0 8px; color:var(--muted); } .nextline ha-icon { color:var(--acc); --mdc-icon-size:20px; } .nextline b { color:var(--fg); }
/* schedule in the same style as the Clean with / Suction controls */
#schedbox .prog-list { gap:4px; padding:4px; border-radius:14px; background:#0000002e; border:1px solid #ffffff12; margin-bottom:8px; }
#schedbox .pg { padding:9px 10px; gap:10px; border-radius:10px; background:transparent; border:0; }
#schedbox .pg + .pg { box-shadow:0 -1px 0 #ffffff12; }
#schedbox .pg .t { font-size:20px; } #schedbox .pg .n { font-size:14px; } #schedbox .pg .d, #schedbox .pg .s, #schedbox .ro { font-size:12px; }
#schedbox .pg .acts2 button:not(.sw) { background:transparent; border-color:transparent; color:var(--muted); }
#schedbox .pg .acts2 button:not(.sw):hover { background:#ffffff14; color:var(--fg); }
#schedbox .sw { width:40px; height:24px; } #schedbox .sw::after { width:18px; height:18px; } #schedbox .sw.on::after { left:19px; }
#schedbox .prog-list > .ro { padding:8px 10px; }
.sched { width:100%; margin-top:10px; display:flex; align-items:center; gap:10px; padding:11px 12px; text-align:left; font-size:14px; }
.sched > ha-icon { color:var(--acc); --mdc-icon-size:22px; } .sched span { flex:1; min-width:0; } .sched small { display:block; color:var(--muted); font-size:12px; }
.sched b { font-weight:800; } .sched em { font-style:normal; color:var(--acc); font-weight:800; white-space:nowrap; }
.modal { position:fixed; inset:0; z-index:9; background:#06101dcc; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); display:flex; align-items:flex-start; justify-content:center; padding:4vh 12px; overflow:auto; }
.sheet { width:min(640px,100%); background:#14263f; border:1px solid #ffffff26; border-radius:22px; box-shadow:0 20px 60px #0008; padding:18px; color:var(--fg); }
.sheet h3 { margin:0; font-size:20px; font-weight:800; flex:1; } .shead { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.shead button { padding:7px 10px; } .x { border-radius:50%; width:40px; height:40px; display:grid; place-items:center; padding:0; }
.prog-list { display:grid; gap:10px; }
.pg { display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; padding:12px 14px; border-radius:16px; background:#ffffff10; border:1px solid #ffffff14; }
.pg.off { opacity:.5; } .pg .t { font-size:26px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.pg .n { font-weight:800; } .pg .d { color:var(--muted); font-size:13px; } .pg .s { font-size:13px; margin-top:3px; color:#dce9f7; }
.pg .acts2 { display:flex; gap:6px; align-items:center; } .pg .acts2 button { padding:8px; border-radius:10px; display:grid; place-items:center; }
.sw { position:relative; width:46px; height:28px; border-radius:999px; background:#ffffff26; border:0; padding:0; flex:none; }
.sw::after { content:""; position:absolute; left:3px; top:3px; width:22px; height:22px; border-radius:50%; background:#fff; transition:left .2s; }
.sw.on { background:var(--ok); } .sw.on::after { left:21px; }
.ro { font-size:12px; color:var(--muted); }
.addrow { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; } .addrow button { display:flex; align-items:center; gap:6px; padding:9px 13px; font-weight:700; font-size:14px; border-radius:12px; }
.addrow .new { background:var(--fg); color:#0b1a2e; border-color:var(--fg); }
.fld { display:grid; gap:6px; margin-bottom:14px; } .fld > label { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:800; }
.fld input[type=text], .fld input[type=time] { font:inherit; font-size:16px; color:var(--fg); background:#0000002e; border:1px solid #ffffff26; border-radius:12px; padding:10px 12px; width:100%; box-sizing:border-box; color-scheme:dark; }
.fld input[type=time] { font-size:28px; font-weight:800; width:auto; justify-self:start; padding:6px 12px; }
.days, .chipset { display:flex; flex-wrap:wrap; gap:4px; padding:4px; border-radius:14px; background:#0000002e; border:1px solid #ffffff12; }
.days button { flex:1; min-width:0; height:38px; border-radius:10px; padding:0; font-weight:800; background:transparent; border-color:transparent; color:var(--muted); }
.days button.on, .chipset button.on { background:var(--fg); border-color:var(--fg); color:#0b1a2e; box-shadow:0 2px 8px #0003; }
.chipset button { flex:1 1 46px; min-width:0; padding:7px 4px; border-radius:10px; font-size:12px; font-weight:700; display:flex; flex-direction:column; align-items:center; gap:2px;
  background:transparent; border-color:transparent; color:var(--muted); white-space:nowrap; }
.chipset button ha-icon { --mdc-icon-size:19px; }
.step .row2 > div { flex:1 1 260px; } .step .row2 > .wide { flex-basis:100%; }
.step { position:relative; padding:12px; border-radius:16px; background:#ffffff0d; border:1px solid #ffffff1a; margin-bottom:10px; display:grid; gap:10px; }
.step .sh { display:flex; align-items:center; gap:8px; font-weight:800; } .step .sh span { flex:1; }
.step .sh button { padding:5px 8px; border-radius:9px; display:grid; place-items:center; } .step .sh ha-icon { --mdc-icon-size:18px; }
.step .row2 { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:flex-start; } .step .row2 > div { display:grid; gap:6px; }
.step small { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:800; }
.note { font-size:13px; color:var(--warn); background:#ffc15e1f; border-radius:12px; padding:8px 10px; display:flex; gap:8px; align-items:flex-start; }
.note ha-icon { --mdc-icon-size:18px; flex:none; }
.foot { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; } .foot button { padding:11px 16px; font-weight:800; display:flex; align-items:center; gap:6px; }
.foot .save { flex:1; justify-content:center; background:var(--fg); border:0; color:#0b1a2e; box-shadow:0 2px 8px #0003; }
.foot .del { color:var(--bad); }
.serr { color:var(--bad); font-size:13px; margin-top:8px; min-height:1em; }
`;
const SchedMixin = {
  _schedIds() {   // this robot's programmes = automations whose id starts mmb_vac_<robot>_
    const pre = `mmb_vac_${this._v.split(".")[1]}_`;
    return Object.keys(this._hass.states).filter(e => e.startsWith("automation.") && String(this._hass.states[e].attributes.id || "").startsWith(pre));
  },
  async _schedLoad() {
    const out = [];
    for (const e of this._schedIds()) {
      const id = this._hass.states[e].attributes.id;
      try {
        const cfg = await this._hass.callApi("GET", `config/automation/config/${id}`);
        const p = JSON.parse(String(cfg.description || "").split(SCHED_TAG)[1] || "null");
        if (p) out.push({ ...p, id, entity: e });
      } catch (x) { /* not readable (not an admin) - the list below falls back to the automation's own name */ }
    }
    this._progs = out.sort((a, b) => a.time.localeCompare(b.time));
  },
  _nextRun() {
    const now = new Date(); let best = null;
    for (const p of this._progs || []) {
      if (this._hass.states[p.entity]?.state !== "on") continue;
      const [h, m] = p.time.split(":").map(Number);
      for (let i = 0; i < 8; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(h, m, 0, 0);
        if (d <= now || !p.days.includes(DAYS[(d.getDay() + 6) % 7][0])) continue;
        if (!best || d < best.at) best = { at: d, p }; break;
      }
    }
    return best;
  },
  // the schedule lives on the card under the controls; only the editor is a pop-up
  _schedStrip() {
    const box = this.shadowRoot.getElementById("schedbox"); if (!box) return;
    const off = !!this._config.carry || this._config.schedule === false;
    this.shadowRoot.getElementById("schedwrap").hidden = off; if (off) return;
    const nx = this._nextRun(), extra = (this._config.also_show || []).filter(e => this._hass.states[e]);
    const when = nx ? (nx.at.toDateString() === new Date().toDateString() ? "today" : nx.at.toDateString() === new Date(Date.now() + 864e5).toDateString() ? "tomorrow" : nx.at.toLocaleDateString([], { weekday: "long" })) : "";
    const row = p => { const on = this._hass.states[p.entity]?.state === "on";
      return `<div class="pg ${on ? "" : "off"}"><div class="t">${esc(p.time)}</div><div><div class="n">${esc(p.name)}</div><div class="d">${daysText(p.days)}</div>
        <div class="s">${p.steps.map((s, i) => `${i + 1}. ${esc(this._stepText(s))}`).join(" → ")}</div></div>
        <div class="acts2"><button class="sw ${on ? "on" : ""}" data-tog="${p.entity}" title="${on ? "On" : "Off"}"></button><button data-ed="${p.id}" title="Edit"><ha-icon icon="mdi:pencil"></ha-icon></button></div></div>`; };
    const other = e => { const s = this._hass.states[e], on = s.state === "on";
      return `<div class="pg ${on ? "" : "off"}"><div class="t"><ha-icon icon="mdi:cog-outline"></ha-icon></div><div><div class="n">${esc(s.attributes.friendly_name || e)}</div><div class="ro">Set up separately in Home Assistant</div></div>
        <div class="acts2"><button class="sw ${on ? "on" : ""}" data-tog="${e}"></button></div></div>`; };
    const html = `${nx ? `<div class="nextline"><ha-icon icon="mdi:calendar-clock"></ha-icon><span>Next: <b>${esc(nx.p.name)}</b> · ${when} ${nx.p.time}</span></div>` : ""}
      <div class="prog-list">${(this._progs || []).map(row).join("") || `<div class="ro" style="padding:2px">No programmes yet. Start from a suggestion or make your own.</div>`}${extra.map(other).join("")}</div>
      <div class="seg addseg"><button class="on" id="snew" title="New programme"><ha-icon icon="mdi:plus"></ha-icon><span>New</span></button>
        ${(this._progs || []).length < 3 ? SUGGEST(this._rooms || []).map((s, i) => `<button data-sg="${i}" title="${esc(s.name)}"><ha-icon icon="${s.icon}"></ha-icon><span>${esc(s.name.split(" ")[0])}</span></button>`).join("") : ""}</div>`;
    if (box.dataset.k === html) return;
    box.dataset.k = html; box.innerHTML = html;
    box.querySelector("#snew").onclick = () => this._schedEdit({ name: "", time: "09:00", days: ["mon", "tue", "wed", "thu", "fri"], steps: [{ rooms: [], mode: "vacuum", fan: "balanced", water: "medium", passes: 1 }] });
    box.querySelectorAll("[data-sg]").forEach(b => b.onclick = () => this._schedEdit(JSON.parse(JSON.stringify(SUGGEST(this._rooms || [])[b.dataset.sg]))));
    box.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => this._schedEdit(JSON.parse(JSON.stringify(this._progs.find(p => p.id === b.dataset.ed)))));
    box.querySelectorAll("[data-tog]").forEach(b => b.onclick = () => this._call("automation", this._hass.states[b.dataset.tog].state === "on" ? "turn_off" : "turn_on", {}, { entity_id: b.dataset.tog }));
  },
  _roomName(id) { return (this._rooms || []).find(([r]) => Number(r) === Number(id))?.[1] || `Room ${id}`; },
  _stepText(s) { return `${MODES.find(m => m[0] === s.mode)?.[1] || s.mode} ${s.rooms.length === (this._rooms || []).length ? "everywhere" : s.rooms.map(r => this._roomName(r)).join(", ")}${s.passes > 1 ? " ×" + s.passes : ""}`; },
  _modalOpen() {
    this._modal = this._modal || document.createElement("div");
    this._modal.className = "modal"; if (!this._modal.isConnected) this.shadowRoot.appendChild(this._modal);
    this._modal.onclick = e => { if (e.target === this._modal) this._schedClose(); };
  },
  _schedClose() { this._modal?.remove(); this._edit = null; this.shadowRoot.getElementById("schedbox").dataset.k = ""; this._schedStrip(); },
  // "Name your robot" - pick from the list or type your own; saved as the device's name in Home Assistant
  _nameOpen() {
    const h = this._hass, id = h.entities?.[this._v]?.device_id, d = h.devices?.[id] || {}, cur = d.name_by_user || d.name || "";
    this._modalOpen();
    this._modal.innerHTML = `<div class="sheet"><div class="shead"><ha-icon icon="mdi:robot-vacuum"></ha-icon><h3>Name your robot</h3><button class="x" id="sx"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="fld"><label>Name</label><input type="text" id="rname" maxlength="40" value="${esc(cur)}" placeholder="Type your own"></div>
      ${ROBOT_NAMES.map(([g, list]) => `<div class="namegrp fld"><label>${esc(g)}</label><div class="chipset">${list.map(n => `<button data-nm="${esc(n)}" class="${n === cur ? "on" : ""}">${esc(n)}</button>`).join("")}</div></div>`).join("")}
      <div class="foot"><button class="save" id="nsave"><ha-icon icon="mdi:content-save-outline"></ha-icon>Save</button>
        ${d.name_by_user ? `<button id="nreset" title="Back to ${esc(d.name || "")}"><ha-icon icon="mdi:undo"></ha-icon>Original name</button>` : ""}</div>
      <div class="ro" style="margin-top:8px">Changes the name in Home Assistant. The Roborock app keeps its own name.</div><div class="serr" id="serr"></div></div>`;
    const m = this._modal, inp = m.querySelector("#rname");
    m.querySelector("#sx").onclick = () => this._schedClose();
    m.querySelectorAll("[data-nm]").forEach(b => b.onclick = () => { inp.value = b.dataset.nm; m.querySelectorAll("[data-nm]").forEach(x => x.classList.toggle("on", x === b)); });
    inp.oninput = () => m.querySelectorAll("[data-nm]").forEach(x => x.classList.toggle("on", x.dataset.nm === inp.value.trim()));
    const save = async v => {
      try { await h.callWS({ type: "config/device_registry/update", device_id: id, name_by_user: v }); this._schedClose(); }
      catch (x) { m.querySelector("#serr").textContent = /unauthorized|admin/i.test(x.code || x.message || "") ? "Only a Home Assistant admin can rename it." : `Couldn't save: ${x.message || x}`; }
    };
    m.querySelector("#nsave").onclick = () => { const v = inp.value.trim(); if (!v) return m.querySelector("#serr").textContent = "Pick or type a name."; save(v === d.name ? null : v); };
    if (d.name_by_user) m.querySelector("#nreset").onclick = () => save(null);
  },
  _schedEdit(p) {
    this._edit = p; this._modalOpen();
    const fans = (this._hass.states[this._v].attributes.fan_speed_list || []).filter(f => !HIDE.has(f));
    const waters = (this._st(this._find("select", /mop_intensity/))?.attributes.options || []).filter(o => !HIDE.has(o));
    const canMop = !!this._find("select", /cleaning_mode/);
    const chips = (key, i, opts, cur, icons) => `<div class="chipset">${opts.map(([v, t, ic]) => `<button data-k="${key}" data-i="${i}" data-v="${esc(v)}" class="${String(v) === String(cur) ? "on" : ""}">${ic ? `<ha-icon icon="${ic}"></ha-icon>` : ""}${esc(t)}</button>`).join("")}</div>`;
    const steps = p.steps.map((s, i) => `<div class="step"><div class="sh"><span>Step ${i + 1}</span>
        ${i ? `<button data-up="${i}" title="Move up"><ha-icon icon="mdi:arrow-up"></ha-icon></button>` : ""}${p.steps.length > 1 ? `<button data-rm="${i}" title="Remove step"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>` : ""}</div>
      <div><small>Rooms</small><div class="chipset">${(this._rooms || []).map(([id, n]) => `<button data-room="${id}" data-i="${i}" class="${s.rooms.includes(Number(id)) ? "on" : ""}"><ha-icon icon="${roomIcon(n)}"></ha-icon>${esc(n)}</button>`).join("")}</div></div>
      ${canMop ? `<div><small>Clean with</small>${chips("mode", i, MODES, s.mode)}</div>` : ""}
      <div class="row2">${s.mode !== "mop" ? `<div class="wide"><small>Suction</small>${chips("fan", i, fans.map(f => [f, nice(f), ICON[f]]), s.fan)}</div>` : ""}
        ${s.mode !== "vacuum" && waters.length ? `<div><small>Mop water</small>${chips("water", i, waters.map(w => [w, nice(w), ICON[w]]), s.water)}</div>` : ""}
        <div><small>Passes</small>${chips("passes", i, [[1, "Once"], [2, "Twice"]], s.passes)}</div></div>
      ${s.mode !== "vacuum" ? `<div class="note"><ha-icon icon="mdi:power-plug-outline"></ha-icon><span>Mopping needs the dock switched on, so it can wash the pads afterwards.${this._config.dock_hours ? ` Yours has power ${esc(this._config.dock_hours)}.` : ""}</span></div>` : ""}
    </div>`).join("");
    this._modal.innerHTML = `<div class="sheet"><div class="shead"><button id="sback"><ha-icon icon="mdi:arrow-left"></ha-icon></button><h3>${p.id ? "Edit programme" : "New programme"}</h3><button class="x" id="sx"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <div class="fld"><label>Name</label><input type="text" id="pname" maxlength="40" placeholder="e.g. Morning hoover" value="${esc(p.name)}"></div>
      <div class="fld"><label>Time</label><input type="time" id="ptime" value="${esc(p.time)}"></div>
      <div class="fld"><label>Days</label><div class="days">${DAYS.map(([d, l]) => `<button data-day="${d}" class="${p.days.includes(d) ? "on" : ""}" title="${d}">${l}</button>`).join("")}</div></div>
      <div class="fld"><label>Steps (one after another)</label>${steps}<div class="addrow" style="margin-top:0"><button id="sadd"><ha-icon icon="mdi:plus"></ha-icon>Add a step</button></div></div>
      <div class="foot"><button class="save" id="ssave"><ha-icon icon="mdi:content-save-outline"></ha-icon>Save</button>
        ${p.id ? `<button id="srun"><ha-icon icon="mdi:play"></ha-icon>Run now</button><button class="del" id="sdel"><ha-icon icon="mdi:trash-can-outline"></ha-icon>Delete</button>` : ""}</div>
      <div class="serr" id="serr"></div></div>`;
    const m = this._modal, keep = () => { p.name = m.querySelector("#pname").value; p.time = m.querySelector("#ptime").value || p.time; };
    const redo = () => { keep(); this._schedEdit(p); };
    m.querySelector("#sx").onclick = () => this._schedClose();
    m.querySelector("#sback").onclick = () => this._schedClose();
    m.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { const d = b.dataset.day; p.days = p.days.includes(d) ? p.days.filter(x => x !== d) : DAYS.map(([x]) => x).filter(x => x === d || p.days.includes(x)); redo(); });
    m.querySelectorAll("[data-room]").forEach(b => b.onclick = () => { const s = p.steps[b.dataset.i], r = Number(b.dataset.room); s.rooms = s.rooms.includes(r) ? s.rooms.filter(x => x !== r) : [...s.rooms, r]; redo(); });
    m.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const s = p.steps[b.dataset.i]; s[b.dataset.k] = b.dataset.k === "passes" ? Number(b.dataset.v) : b.dataset.v; redo(); });
    m.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { p.steps.splice(Number(b.dataset.rm), 1); redo(); });
    m.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { const i = Number(b.dataset.up); [p.steps[i - 1], p.steps[i]] = [p.steps[i], p.steps[i - 1]]; redo(); });
    m.querySelector("#sadd").onclick = () => { const l = p.steps[p.steps.length - 1]; p.steps.push({ ...l, rooms: [...l.rooms], mode: canMop && l.mode === "vacuum" ? "mop" : l.mode }); redo(); };
    m.querySelector("#ssave").onclick = () => { keep(); this._schedSave(p); };
    if (p.id) {
      m.querySelector("#sdel").onclick = async () => {
        if (!confirm(`Delete "${p.name}"?`)) return;
        try { await this._hass.callApi("DELETE", `config/automation/config/${p.id}`); await new Promise(r => setTimeout(r, 600)); await this._schedLoad(); this._schedClose(); }
        catch (x) { m.querySelector("#serr").textContent = `Couldn't delete it: ${x.message || x.body?.message || x}`; }
      };
      m.querySelector("#srun").onclick = () => { this._call("automation", "trigger", { skip_condition: true }, { entity_id: p.entity }); this._schedClose(); };
    }
  },
  async _schedSave(p) {
    const e = this._modal.querySelector("#serr");
    if (!p.name.trim()) return e.textContent = "Give it a name.";
    if (!p.days.length) return e.textContent = "Pick at least one day.";
    if (p.steps.some(s => !s.rooms.length)) return e.textContent = "Every step needs at least one room.";
    const id = p.id || `mmb_vac_${this._v.split(".")[1]}_${Date.now()}`;
    const { id: _a, entity: _b, ...keepP } = p;
    try {
      await this._hass.callApi("POST", `config/automation/config/${id}`, this._schedAutomation(keepP));
      await new Promise(r => setTimeout(r, 800)); await this._schedLoad(); this._schedClose();
    } catch (x) { e.textContent = x.status_code === 401 || x.status === 401 ? "Only a Home Assistant admin can change schedules." : `Couldn't save: ${x.message || x.body?.message || x}`; }
  },
  // the automation that runs a programme
  _schedAutomation(p) {
    const V = this._v, ent = re => this._find("select", re), status = this._find("sensor", /(^|\.|_)status$/), map = this._config.map;
    const cm = ent(/cleaning_mode/), mi = ent(/mop_intensity/), sel = ent(/selected_map/), dry = this._find("switch", /mop_drying/);
    const q7 = this._isQ7();   // Q7: its status names differ, so wait on the vacuum itself being docked for 90 s
    const settled = q7 || !status ? `{{ is_state('${V}','docked') and (now() - states.${V}.last_changed).total_seconds() > 90 }}`
      : `{{ is_state('${V}','docked') and states('${status}') in ['charging','charging_complete','idle'] and (now() - states.${status}.last_changed).total_seconds() > 90 }}`;
    const seq = [{ alias: "Only if it's on its dock", if: [{ condition: "not", conditions: [{ condition: "state", entity_id: V, state: "docked" }] }],
      then: [{ action: "persistent_notification.create", data: { title: `${p.name} skipped`, message: `The robot wasn't on its dock ({{ states('${V}') }}), so "${p.name}" didn't run.`, notification_id: "mmb_vac_skipped" } },
        ...(this._config.notify ? [{ action: this._config.notify, data: { title: `${p.name} skipped`, message: `The robot wasn't on its dock, so "${p.name}" didn't run.` }, continue_on_error: true }] : []),
        { stop: "Not on the dock" }] }];
    if (map && sel) seq.push({ if: [{ condition: "not", conditions: [{ condition: "state", entity_id: sel, state: map }] }],
      then: [{ action: "select.select_option", target: { entity_id: sel }, data: { option: map }, continue_on_error: true }, { delay: "00:00:15" }] });
    p.steps.forEach((s, i) => {
      if (i) seq.push({ delay: "00:00:30" });
      if (cm) seq.push({ action: "select.select_option", target: { entity_id: cm }, data: { option: s.mode } });
      if (s.mode !== "mop") seq.push({ action: "vacuum.set_fan_speed", target: { entity_id: V }, data: { fan_speed: s.fan } });
      if (s.mode !== "vacuum" && mi) seq.push({ action: "select.select_option", target: { entity_id: mi }, data: { option: s.water } });
      for (let n = 0; n < (q7 ? s.passes : 1); n++) {   // Q7 has no repeat: run the step again for "Twice"
        if (n) seq.push({ delay: "00:00:30" });
        seq.push({ delay: "00:00:30" },
          { alias: `Step ${i + 1}: ${this._stepText(s)}${q7 && s.passes > 1 ? ` (pass ${n + 1})` : ""}`, action: "vacuum.send_command", target: { entity_id: V }, data: this._roomCmd(s.rooms, s.passes) },
          { wait_template: `{{ not is_state('${V}','docked') }}`, timeout: "00:02:00", continue_on_timeout: false },
          { wait_template: settled, timeout: "01:30:00", continue_on_timeout: false });
      }
    });
    if (!q7 && p.steps.some(s => s.mode !== "vacuum")) seq.push(...(dry ? [{ action: "switch.turn_on", target: { entity_id: dry }, continue_on_error: true }] : []),
      { action: "vacuum.send_command", target: { entity_id: V }, data: { command: "app_set_dryer_status", params: { status: 1 } }, continue_on_error: true });
    return { alias: `Robot: ${p.name}`, description: `Made by the Roborock Buddy Card's schedule. Edit it there. ${SCHED_TAG}${JSON.stringify(p)}`,
      mode: "single", max_exceeded: "silent", triggers: [{ trigger: "time", at: `${p.time}:00` }],
      conditions: p.days.length === 7 ? [] : [{ condition: "time", weekday: p.days }], actions: seq };
  },
};
Object.assign(RobotVacCard.prototype, SchedMixin);

if (!customElements.get("roborock-buddy-card")) customElements.define("roborock-buddy-card", RobotVacCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "roborock-buddy-card"))
  window.customCards.push({ type: "roborock-buddy-card", name: "Roborock Buddy Card", description: "Cartoon robot, live map, rooms, controls, dock and care, and a cleaning schedule", preview: false,
    documentationURL: "https://github.com/spikey1965/ha-roborock-buddy-card" });
console.info(`%c ROBOROCK-BUDDY-CARD %c ${ROBOROCK_BUDDY_VERSION} `, "background:#ffcc00;color:#0f1012;font-weight:700", "background:#0f1012;color:#ffcc00");
