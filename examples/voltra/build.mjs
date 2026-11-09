import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 780;
const HEIGHT = 470;

// World: 1 unit = 1 mm, x along the unit and the cable, y toward the viewer's left, z up.
const BASE = { x: -245, y: -115, w: 725, d: 190, r: 10 };
const BASE_H = 10;
const FOOT_H = 4;
const POST = { x: -215, y: -55, w: 40, d: 70, r: 3 };
const POST_TOP = 240;
const COLLAR = { x: -230, y: -72, w: 70, d: 104, r: 4 };
const PLATE = { x: -175, y: -85, w: 14, d: 130, r: 5 };
const PLATE_Z0 = 100;
const PLATE_Z1 = 226;

const UNIT = { x: -161, y: -90, w: 323, d: 139, r: 12 };
const ZB = 110;
const FL = 6;
const FZ = ZB + FL;
const ZT = 210;
const WALL = 4;
const BACK = { x: -161, y: -90, w: 323, d: WALL, r: 0.6 };
const LEFT = { x: -161, y: -90, w: WALL, d: 139, r: 0.6 };
const FRONT = { x: -161, y: 45, w: 99, d: WALL, r: 1 };
const FRONT_TOP = 176;
const FRONT_FACE = FRONT.y + WALL;

const AXX = 70;
const AXY = -40;
const AXZ = 160;
const R_FL = 44;
const R_DR = 32;
const CABLE_Z = AXZ + R_DR;
const CABLE_Y = -8;
const SP_FACE_Y = AXY + 64;
const NOSE = { x: 126, y: -32, w: 36, d: 48, r: 6 };
const NOSE_H = 90;
const BOOT_X = 162 + 9;

const EXT_MAX = 180;
const X0 = 200;
const RULER = { x: X0, y: -22, w: EXT_MAX, d: 20, r: 1 };

const FORCE = 60 * 0.45359237 * 9.80665;
const KG = 60 * 0.45359237;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -FOOT_H, BASE_H),
    ...k.boxCorners(POST, BASE_H, POST_TOP),
    ...k.boxCorners(UNIT, ZB, ZT),
    ...k.boxCorners({ x: X0, y: -70, w: EXT_MAX + 80, d: 124 }, BASE_H, CABLE_Z + 14),
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 62, elevation: 42 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const faceY = (y, list, closed = true) => k.pathOf(list.map(([u, z]) => at([u, y, z])), closed);
const faceX = (x, list, closed = true) => k.pathOf(list.map(([u, z]) => at([x, u, z])), closed);
const rrect = (u0, z0, u1, z1, r, steps = 4) => k.roundedPlan({ x: u0, y: z0, w: u1 - u0, d: z1 - z0, r }, steps);
const slab = (plan, z, h, tone, steps = 4, bevel = 0, extra = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...extra });
const cable = (a, b) => `${L(k.pathOf([at(a), at(b)]), { tone: "lit", className: "cable" })}${D([at(a)], { size: 1.3, tone: "lit" })}`;

// ---------------------------------------------------------------- floor, post and mount

function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -FOOT_H, BASE_H + FOOT_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
    out.push(S(k.cylinder(x, y, 9, -FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 7, -FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(slab(BASE, 0, BASE_H, "mid", 8, 1.2));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), BASE_H, P), { tone: "faint" }));
  out.push(D(k.corners(BASE, 9).map(([x, y]) => at([x, y, BASE_H])), { size: 0.5 }));
  const slots = [{ x: -205, y: 48, w: 40, d: 9, r: 4.5 }, { x: -125, y: 48, w: 40, d: 9, r: 4.5 }, { x: 300, y: 48, w: 40, d: 9, r: 4.5 }];
  out.push(L(slots.map((slot) => k.planOutline(slot, BASE_H, P, 4)).join(""), { tone: "faint" }));
  const label = { x: 360, y: 40, w: 90, d: 22, r: 2 };
  out.push(slab(label, BASE_H, 1.2, "lo", 3, 0, { crease: "none" }));
  out.push(L([46, 51, 56].map((y, i) => k.lineOnTop([370, y], [370 + [52, 62, 38][i], y], BASE_H + 1.2, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([440, 46, BASE_H + 1.2]), at([440, 56, BASE_H + 1.2])], { size: 0.45 }));
  return out.join("");
}

function ruler() {
  const out = [];
  out.push(slab(RULER, BASE_H, 3, "lo", 3, 0.3));
  const t = k.topTicks(X0, X0 + EXT_MAX, 10, 5, RULER.y, BASE_H + 3, [3, 6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  for (const x of [X0 - 14, X0 + EXT_MAX + 8]) {
    out.push(slab({ x, y: RULER.y - 4, w: 6, d: RULER.d + 8, r: 1.5 }, BASE_H, 7, "mid", 3, 0.4));
    out.push(D([at([x + 3, RULER.y + 2, BASE_H + 7]), at([x + 3, RULER.y + RULER.d - 2, BASE_H + 7])], { size: 0.42 }));
  }
  return out.join("");
}

function post() {
  const out = [];
  out.push(slab(COLLAR, BASE_H, 6, "lo", 4, 0.5));
  out.push(D(k.corners(COLLAR, 7).map(([x, y]) => at([x, y, BASE_H + 6])), { size: 0.5 }));
  out.push(slab(POST, BASE_H + 6, POST_TOP - BASE_H - 6, "mid", 3, 0.8, { crease: "faint" }));
  const front = POST.y + POST.d;
  const holesFront = [];
  for (let cz = 40; cz <= 215; cz += 25) holesFront.push(faceY(front, rrect(-201, cz - 6, -189, cz + 6, 1.6, 3)));
  out.push(L(holesFront.join(""), { tone: "faint" }));
  const side = POST.x + POST.w;
  const holesSide = [];
  for (const cz of [40, 65, 90]) holesSide.push(faceX(side, rrect(-26, cz - 6, -14, cz + 6, 1.6, 3)));
  out.push(L(holesSide.join(""), { tone: "faint" }));
  return out.join("");
}

function mount() {
  const out = [];
  out.push(slab(PLATE, PLATE_Z0, PLATE_Z1 - PLATE_Z0, "mid", 5, 0.8, { crease: "faint" }));
  const face = PLATE.y + PLATE.d;
  const screws = [];
  for (const z of [PLATE_Z0 + 6, PLATE_Z0 + 18, PLATE_Z1 - 18, PLATE_Z1 - 6]) screws.push(at([PLATE.x + PLATE.w / 2, face, z]));
  out.push(D(screws, { size: 0.55 }));
  return out.join("");
}

// ---------------------------------------------------------------- the unit, opened like a cutaway

function shell() {
  const out = [`<path class="iso-halo" d="${k.haloOf(UNIT, ZB - 2, 6, P)}" style="filter:blur(6px)"/>`];
  out.push(slab(UNIT, ZB, FL, "mid", 8, 1.2));
  out.push(L(k.planOutline(k.insetPlan(UNIT, 5), FZ, P), { tone: "faint" }));
  out.push(D(k.corners(UNIT, 9).map(([x, y]) => at([x, y, FZ])), { size: 0.5 }));
  return out.join("");
}

function backWall() {
  const out = [];
  out.push(slab(BACK, FZ, ZT - FZ, "mid", 2, 0.4));
  const y = BACK.y + WALL;
  const slots = [];
  for (let x = -34; x <= 18; x += 9) slots.push(faceY(y, rrect(x - 1, 190, x + 1, 204, 1, 3)));
  out.push(L(slots.join(""), { tone: "faint" }));
  const label = { x: -150, y, w: 50, d: 0.8, r: 1.2 };
  out.push(slab(label, 195, 11, "lo", 3, 0, { crease: "none" }));
  out.push(L([198, 201, 204].map((z, i) => k.segment([-147, y + 0.8, z], [-147 + [32, 40, 24][i], y + 0.8, z], P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([-107, y + 0.8, 198]), at([-107, y + 0.8, 203])], { size: 0.42 }));
  out.push(D([at([-120, y, FZ + 4]), at([120, y, FZ + 4]), at([-120, y, ZT - 3]), at([120, y, ZT - 3])].slice(0, 2).concat([at([60, y, FZ + 4]), at([-60, y, FZ + 4])]), { size: 0.5 }));
  return out.join("");
}

function shield() {
  const out = [];
  const y = BACK.y + WALL;
  const plate = { x: -62, y, w: 60, d: 3, r: 2 };
  out.push(slab(plate, 142, 50, "hi", 3, 0.4, { crease: "faint" }));
  const face = y + 3;
  const grooves = [];
  for (let x = -52; x <= -12; x += 10) grooves.push(k.segment([x, face, 142], [x, face, 192], P));
  out.push(L(grooves.join(""), { tone: "faint" }));
  out.push(D([at([-58, face, 146]), at([-6, face, 146]), at([-58, face, 188]), at([-6, face, 188])], { size: 0.5 }));
  return out.join("");
}

function charger() {
  const out = [];
  const mod = { x: -58, y: 14, w: 30, d: 30, r: 2 };
  out.push(slab(mod, FZ, 9, "mid", 3, 0.5, { crease: "faint" }));
  const face = mod.y + mod.d;
  out.push(L(faceY(face, rrect(-50, FZ + 3, -36, FZ + 6.6, 1.6, 3)), { tone: "lo" }));
  out.push(D([at([-54, face, FZ + 7.4]), at([-32, face, FZ + 7.4])], { size: 0.45 }));
  out.push(D([at([mod.x + 15, mod.y + 15, FZ + 9])], { size: 0.5 }));
  return out.join("");
}

function leftWall() {
  const out = [];
  out.push(slab(LEFT, FZ, ZT - FZ, "mid", 2, 0.4));
  const x = LEFT.x + WALL;
  const slots = [];
  for (let y = -66; y <= 24; y += 18) slots.push(faceX(x, rrect(y - 1, 192, y + 1, 205, 1, 3)));
  out.push(L(slots.join(""), { tone: "faint" }));
  return out.join("");
}

// ---------------------------------------------------------------- battery pack: 16 cells, 57.6 V

const CELL_X = [-140.5, -121.5, -102.5, -83.5];
const CELL_Y = [-72.5, -53.5, -34.5, -15.5];
const CELL_R = 8.4;
const CELL_TOP = 184;

function battery() {
  const out = [];
  const holder = { x: -152, y: -84, w: 80, d: 80, r: 3 };
  out.push(slab(holder, FZ, 3, "lo", 4, 0.4));
  const cells = [];
  for (const y of CELL_Y) for (const x of CELL_X) cells.push([x, y]);
  for (const [x, y] of byDepth(cells)) {
    out.push(S(k.cylinder(x, y, CELL_R, FZ + 3, CELL_TOP - FZ - 3, P, 22, 0.3), { tone: "hi", crease: "faint" }));
    out.push(L(k.sideArc(x, y, CELL_R, FZ + 9, P, 12) + k.sideArc(x, y, CELL_R, CELL_TOP - 6, P, 12), { tone: "faint" }));
  }
  const bars = [
    [0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [1, 3],
  ];
  for (const [i, j] of bars) {
    const bar = { x: CELL_X[i] - 6, y: CELL_Y[j] - 3.5, w: 31, d: 7, r: 2 };
    out.push(slab(bar, CELL_TOP, 1, "mid", 3, 0));
  }
  for (const [x, y] of byDepth(cells)) out.push(S(k.cylinder(x, y, 3.6, CELL_TOP, 1.6, P, 14), { tone: "lo", crease: "none" }));
  return out.join("");
}

// ---------------------------------------------------------------- driver board

const PCB = { x: -66, y: -82, w: 52, d: 56, r: 2 };
const PCB_Z = FZ + 6;
const PCB_TOP = PCB_Z + 2.4;
const BAT_CONN = { x: -66, y: -62, w: 8, d: 16, r: 1.2 };
const MOT_CONN = { x: -24, y: -70, w: 10, d: 18, r: 1.2 };
const CHG_CONN = { x: -24, y: -46, w: 10, d: 8, r: 1.2 };
const BAT_TOP = PCB_TOP + 8;
const MOT_TOP = PCB_TOP + 9;

function board() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(PCB, 5))) out.push(S(k.cylinder(x, y, 2.6, FZ, 6, P, 12), { tone: "lo", crease: "none" }));
  out.push(slab(PCB, PCB_Z, 2.4, "mid", 3, 0.3, { crease: "faint" }));
  out.push(D(k.corners(PCB, 5).map(([x, y]) => at([x, y, PCB_TOP])), { size: 0.5 }));
  out.push(slab({ x: -49, y: -42, w: 7, d: 7, r: 1 }, PCB_TOP, 1.4, "lo", 2, 0));
  out.push(slab({ x: -57, y: -42, w: 5, d: 5, r: 0.8 }, PCB_TOP, 1.2, "lo", 2, 0));
  const sink = { x: -40, y: -76, w: 12, d: 44, r: 1.2 };
  const sinkTop = PCB_TOP + 12;
  out.push(slab(sink, PCB_TOP, 12, "hi", 2, 0.4));
  const grooves = [];
  for (let y = -70; y <= -42; y += 7) grooves.push(k.segment([sink.x + sink.w, y, PCB_TOP], [sink.x + sink.w, y, sinkTop], P));
  out.push(L(grooves.join(""), { tone: "faint" }));
  const caps = [[-50, -72], [-50, -60], [-50, -48]].map(([x, y]) => [x, y]);
  for (const [x, y] of byDepth(caps)) {
    out.push(S(k.cylinder(x, y, 4.6, PCB_TOP, 13, P, 18, 0.3), { tone: "hi", crease: "faint" }));
    out.push(L(k.sideArc(x, y, 4.6, PCB_TOP + 10, P, 10), { tone: "faint" }));
  }
  out.push(slab(BAT_CONN, PCB_TOP, 8, "lo", 2, 0.3));
  out.push(slab(MOT_CONN, PCB_TOP, 9, "lo", 2, 0.3));
  out.push(slab(CHG_CONN, PCB_TOP, 7, "lo", 2, 0.3));
  out.push(D([at([BAT_CONN.x + 4, BAT_CONN.y + 8, BAT_TOP]), at([MOT_CONN.x + 5, MOT_CONN.y + 9, MOT_TOP]), at([CHG_CONN.x + 5, CHG_CONN.y + 4, PCB_TOP + 7])], { size: 0.5 }));
  return out.join("");
}

// ---------------------------------------------------------------- direct drive motor, spool, nose

const SPOOL_FRAME = G.frameAlong([AXX, AXY, AXZ], [0, 1, 0]);
const MOTOR_FRAME = G.frameAlong([AXX, -86, AXZ], [0, 1, 0]);
const HUB_FRAME = G.frameAlong([AXX, -50, AXZ], [0, 1, 0]);

function motor() {
  const out = [];
  out.push(S(G.solidOf([[0, 42], [36, 42]], MOTOR_FRAME, P), { tone: "mid", crease: "lo", inner: L([6, 15, 24, 33].map((s) => G.arcOf(MOTOR_FRAME, s, 42, P)).join(""), { tone: "faint" }) }));
  out.push(S(G.solidOf([[0, 20], [10, 20]], HUB_FRAME, P), { tone: "lo", crease: "faint" }));
  return out.join("");
}

function spool() {
  const out = [];
  const wraps = [];
  for (let s = 7; s <= 57; s += 3.2) wraps.push(G.arcOf(SPOOL_FRAME, s, R_DR, P));
  out.push(S(G.solidOf([[0, R_FL], [4, R_FL]], SPOOL_FRAME, P), { tone: "hi", crease: "faint" }));
  out.push(S(G.solidOf([[4, R_DR], [60, R_DR]], SPOOL_FRAME, P), { tone: "hi", crease: "faint", inner: L(wraps.join(""), { tone: "faint" }) }));
  out.push(S(G.solidOf([[60, R_FL], [64, R_FL]], SPOOL_FRAME, P), { tone: "hi", crease: "faint" }));
  return out.join("");
}

function noseBlock() {
  const out = [];
  out.push(slab(NOSE, FZ, NOSE_H, "mid", 4, 0.8, { crease: "faint", inner: L(k.sideSeam(NOSE, FZ + 40, P, 4), { tone: "faint" }) }));
  const topScrews = [at([NOSE.x + 8, NOSE.y + 8, FZ + NOSE_H]), at([NOSE.x + NOSE.w - 8, NOSE.y + NOSE.d - 8, FZ + NOSE_H])];
  out.push(D(topScrews, { size: 0.5 }));
  const boot = G.frameAlong([NOSE.x + NOSE.w, CABLE_Y, CABLE_Z], [1, 0, 0]);
  out.push(S(G.solidOf([[0, 9], [3, 9], [3, 6.4], [9, 6.4]], boot, P), { tone: "lo", crease: "faint" }));
  return out.join("");
}

function frontWall() {
  const out = [];
  out.push(slab(FRONT, FZ, FRONT_TOP - FZ, "mid", 3, 0.5));
  const y = FRONT_FACE;
  out.push(L(faceY(y, rrect(-153, 121, -79, 171, 3)), { tone: "faint" }));
  out.push(slab({ x: -150, y, w: 68, d: 0.8, r: 2 }, 124, 44, "lo", 3, 0, { crease: "none" }));
  out.push(L(faceY(y + 0.8, rrect(-148, 126, -84, 166, 1.6)), { tone: "faint" }));
  out.push(S(k.cylinder(-71, y + 1.4, 3.6, 150, 2, P, 14), { tone: "hi", crease: "none" }));
  out.push(D([at([-71, y, 166])], { size: 0.6, tone: "lit" }));
  out.push(L(faceY(y, rrect(-75, 129, -67, 134, 1.6, 3)), { tone: "faint" }));
  out.push(D([at([-157, y, FZ + 4]), at([-66, y, FZ + 4]), at([-157, y, FRONT_TOP - 4]), at([-66, y, FRONT_TOP - 4])], { size: 0.5 }));
  return out.join("");
}

// ---------------------------------------------------------------- harness

function harness() {
  const wire = (route, tone = "mid") => k.wireSvg(at(route[0]), at(route[route.length - 1]), { via: route.slice(1, -1).map(at), tone, size: 0.9 });
  const cell = [CELL_X[3], CELL_Y[1], CELL_TOP + 1.6];
  const bat = [BAT_CONN.x + 4, BAT_CONN.y + 8, BAT_TOP];
  const power = [cell, [cell[0], cell[1], 196], [bat[0], bat[1], 196], bat];
  const mot = [MOT_CONN.x + 5, MOT_CONN.y + 9, MOT_TOP];
  const lead = (dy) => [[AXX - 6, -62 + dy, AXZ + 41.5], [AXX - 6, -62 + dy, 218], [mot[0], -62 + dy, 218], [mot[0], -62 + dy, mot[2] + 6], [mot[0], mot[1] + dy * 0.6 + 4, mot[2]]];
  void lead;
  const chg = [CHG_CONN.x + 5, CHG_CONN.y + 4, PCB_TOP + 7];
  const charge = [[-43, 29, FZ + 9], [-43, 29, 146], [chg[0], 29, 146], [chg[0], chg[1], 146], chg];
  const motorLead = [[AXX - 6, -66, AXZ + 41.6], [AXX - 6, -66, 218], [mot[0], -66, 218], mot];
  return wire(power) + wire(motorLead) + wire(charge);
}

// ---------------------------------------------------------------- live parts

function comma(value, digits) {
  return value.toFixed(digits).replace(".", ",");
}

function spoolMarks(theta) {
  const Y = SP_FACE_Y;
  const ringPts = (cx, cz, r) => Array.from({ length: 20 }, (_, i) => [cx + Math.cos((i / 20) * Math.PI * 2) * r, cz + Math.sin((i / 20) * Math.PI * 2) * r]);
  const out = [];
  const holes = [];
  const bolts = [];
  for (let n = 0; n < 6; n++) {
    const a = theta + (n * Math.PI * 2) / 6;
    holes.push(k.pathOf(ringPts(AXX + Math.sin(a) * 27, AXZ + Math.cos(a) * 27, 7.5).map(([u, z]) => at([u, Y, z])), true));
    bolts.push(at([AXX + Math.sin(a + 0.52) * 14, Y, AXZ + Math.cos(a + 0.52) * 14]));
  }
  out.push(L(holes.join(""), { tone: "lo" }));
  out.push(D(bolts, { size: 0.45 }));
  out.push(L(k.pathOf([at([AXX + Math.sin(theta) * 37.5, Y, AXZ + Math.cos(theta) * 37.5]), at([AXX + Math.sin(theta) * 44, Y, AXZ + Math.cos(theta) * 44])]), { tone: "hi" }));
  out.push(D([at([AXX, Y, AXZ])], { size: 0.9, tone: "hi" }));
  return out.join("");
}

function screenText(v) {
  const out = [];
  const line = (text, z, size, tone) => k.faceTextSvg(k.sideMatrix([-116, FRONT_FACE + 0.8], z, P, "left"), text, { size, tone, anchor: "middle" });
  out.push(line("60 lb", 150, 14, "hi"));
  out.push(line(comma(KG, 1) + " kg", 140, 6.6, "mid"));
  out.push(line(comma(Math.abs(v), 2) + " m/s", 131, 6.4, "lo"));
  return out.join("");
}

function cableOut(ext) {
  const a = [BOOT_X, CABLE_Y, CABLE_Z];
  const b = [X0 + ext, CABLE_Y, CABLE_Z];
  return L(k.pathOf([at(a), at(b)]), { tone: "lit", className: "cable" }) + D([at(a)], { size: 1.3, tone: "lit" });
}

function handleGroup() {
  const out = [];
  const x = X0;
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x + 56, y: -66, w: 24, d: 116, r: 12 }, BASE_H, 2, P)}"/>`);
  out.push(slab({ x, y: CABLE_Y - 8, w: 16, d: 16, r: 3 }, CABLE_Z - 8, 16, "hi", 3, 0.5, { crease: "faint" }));
  out.push(slab({ x: x + 16, y: CABLE_Y - 4, w: 43, d: 8, r: 2 }, CABLE_Z - 4, 8, "mid", 2, 0.3));
  const F = G.frameAlong([x + 68, -66, CABLE_Z], [0, 1, 0]);
  out.push(S(G.solidOf([[0, 9], [3, 12], [114, 12], [117, 9]], F, P), { tone: "hi", crease: "faint", inner: L([14, 24, 34, 44, 54, 64, 74, 84, 94, 103].map((s) => G.arcOf(F, s, 12, P)).join(""), { tone: "faint" }) }));
  return out.join("");
}

function marker() {
  const out = [];
  const m = { x: X0 - 6, y: RULER.y - 4, w: 12, d: RULER.d + 8, r: 2 };
  out.push(slab(m, BASE_H + 3, 4, "hi", 3, 0.3));
  out.push(L(k.lineOnTop([X0, m.y], [X0, m.y + m.d], BASE_H + 7, P), { tone: "lit" }));
  return out.join("");
}

// ---------------------------------------------------------------- assemble

const EXT0 = 90;
const THETA = (ext) => ext / R_DR;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A cutaway of a Voltra I portable cable trainer clamped to a rack upright. Inside the open case a lithium battery pack of sixteen cells, a driver board, a direct drive motor and a cable spool are visible, with the touchscreen on the front wall. The cable leaves the nose over a ruler on the floor and ends at a handle that moves with the pointer, turning the spool as it goes.",
  body: [
    `<style>.iso-svg .cable{stroke-width:1.7}</style>`,
    floor(),
    ruler(),
    post(),
    mount(),
    shell(),
    backWall(),
    shield(),
    leftWall(),
    battery(),
    board(),
    motor(),
    spool(),
    `<g data-part="marks">${spoolMarks(THETA(EXT0))}</g>`,
    cable([AXX, CABLE_Y, CABLE_Z], [NOSE.x, CABLE_Y, CABLE_Z]),
    noseBlock(),
    charger(),
    harness(),
    frontWall(),
    `<g data-part="screen">${screenText(0)}</g>`,
    `<g data-part="marker" transform="${k.translateAlong(P, [EXT0, 0, 0])}">${marker()}</g>`,
    `<g data-part="cable">${cableOut(EXT0)}</g>`,
    `<g data-part="handle" transform="${k.translateAlong(P, [EXT0, 0, 0])}">${handleGroup()}</g>`,
  ],
});

const dynamicSource = [comma, spoolMarks, screenText, cableOut].map((fn) => fn.toString()).join("\n");

const live = `
const P = ${JSON.stringify(P)};
const k = { iso, pathOf, faceTextSvg, sideMatrix, translateAlong };
const at = (point) => iso(point, P);
const L = (d, style) => lineSvg(d, style);
const D = (points, style) => dotsSvg(points, style);
const AXX = ${AXX}, AXZ = ${AXZ}, R_FL = ${R_FL}, SP_FACE_Y = ${SP_FACE_Y}, FRONT_FACE = ${FRONT_FACE};
const CABLE_Y = ${CABLE_Y}, CABLE_Z = ${CABLE_Z}, BOOT_X = ${BOOT_X}, X0 = ${X0}, KG = ${KG};
${dynamicSource}
const FORCE = ${FORCE}, EXT_MAX = ${EXT_MAX}, R_DR = ${R_DR};
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const marksEl = svgEl.querySelector('[data-part="marks"]');
const screenEl = svgEl.querySelector('[data-part="screen"]');
const cableEl = svgEl.querySelector('[data-part="cable"]');
const handleEl = svgEl.querySelector('[data-part="handle"]');
const markerEl = svgEl.querySelector('[data-part="marker"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const REP = 2.6;
let ext = ${EXT0}, target = ext, vel = 0, clock = 0, touring = true, visible = false, frame = 0, last = 0, idleTimer = 0, lastText = "", lastScreen = "";
function draw() {
  marksEl.innerHTML = spoolMarks(ext / R_DR);
  cableEl.innerHTML = cableOut(ext);
  const move = translateAlong(P, [ext, 0, 0]);
  handleEl.setAttribute("transform", move);
  markerEl.setAttribute("transform", move);
  const text = "cabo " + Math.round(ext / 10) + " cm · 60 lb · " + comma(Math.abs(vel) / 1000, 2) + " m/s · " + Math.round(FORCE * Math.abs(vel) / 1000) + " W";
  if (text !== lastText) { readout.textContent = text; lastText = text; stage.setAttribute("aria-valuenow", String(Math.round(ext / 10))); stage.setAttribute("aria-valuetext", text); }
  const shown = comma(Math.abs(vel) / 1000, 2);
  if (shown !== lastScreen) { screenEl.innerHTML = screenText(vel / 1000); lastScreen = shown; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && !calm) { clock += dt; target = (EXT_MAX * (1 - Math.cos((clock / REP) * Math.PI * 2))) / 2; }
  const before = ext;
  ext = calm ? target : ext + (target - ext) * (1 - Math.exp(-dt / (touring ? 0.04 : 0.14)));
  if (Math.abs(target - ext) < 0.02) ext = target;
  const raw = (ext - before) / dt;
  vel += (raw - vel) * (1 - Math.exp(-dt / 0.09));
  if (calm || Math.abs(vel) < 0.5) vel = calm ? 0 : vel * 0.9;
  draw();
  const settled = !touring && ext === target && Math.abs(vel) < 0.5;
  frame = visible && !(settled && calm) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = Math.min(EXT_MAX, Math.max(0, next)); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; if (touring) clock = Math.acos(1 - (2 * ext) / EXT_MAX) / (Math.PI * 2) * REP; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.2) / 0.6));
  steer(share * EXT_MAX);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.round(target / 30) * 30 + 30;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.round(target / 30) * 30 - 30;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = EXT_MAX;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Voltra I",
  hint: "Mouse puxa o cabo",
  readout: `cabo ${EXT0 / 10} cm · 60 lb · 0,00 m/s · 0 W`,
  keys: [
    { mark: "lit", label: "Cabo: sai junto com a alça e gira o tambor (raio de 32 mm, ilustrativo)" },
    { mark: "dim", label: "Régua no piso: marca fina a cada 1 cm, grossa a cada 5 cm" },
  ],
  caption:
    "Corte ilustrativo do Voltra I, treinador de cabo portátil da Beyond Power (323 × 139 × 100 mm, 5,8 kg) preso a um montante de rack. Em vez de anilhas, um motor de acionamento direto cria a resistência, de 5 a 230 lb (2 a 104 kg) em passos de 1 lb, tanto ao puxar quanto ao voltar. O cabo sintético tem 3 mm e 2,6 m; a figura mostra só os primeiros 18 cm. A bateria é de íons de lítio, 57,6 V × 1,7 Ah (97,9 Wh). A Beyond não publica o arranjo interno, então tambor, motor e placa são desenhados só para explicar. Aqui, no modo Weight Training a 60 lb (267 N constantes), a velocidade vem do movimento do cabo e a potência é força × velocidade.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Voltra I: o mouse ou as setas puxam o cabo" aria-valuemin="0" aria-valuemax="${EXT_MAX / 10}" aria-valuenow="${EXT0 / 10}">${svg}</div>`,
});

const file = theme === "light" ? "voltra-light.html" : "voltra.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Voltra I", theme, body, script: kitScript() + live }));
console.log("wrote", file);
