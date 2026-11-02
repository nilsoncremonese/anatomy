import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 680;
const HEIGHT = 460;

const PAN = { x: -150, y: -110, w: 300, d: 220, r: 6 };
const PAN_H = 8;
const FOOT_H = 4;
const FLOOR = PAN_H;
const CEIL = 140;
const TOP_H = 6;
const TOP = CEIL + TOP_H;
const WALL = 3;

const BACK = { x: -150, y: -110, w: 300, d: WALL, r: 0.6 };
const LEFT = { x: -150, y: -110, w: WALL, d: 220, r: 0.6 };
const PART = { x: 85, y: -107, w: WALL, d: 214, r: 0.6 };
const PART_TOP = 60;
const FRONT_Y = 110;
const CPANEL = { x: 88, y: 107, w: 62, d: 3, r: 1 };
const SILL = { x: -147, y: 103, w: 232, d: 7, r: 1 };
const LINTEL = { x: -147, y: 103, w: 232, d: 7, r: 1 };
const SILL_TOP = 18;
const LINTEL_BOT = 128;

const CX = -31;
const CY = 0;
const PLATE_R = 88;
const PLATE_Z = 28;
const PLATE_H = 2.5;
const PLATE_TOP = PLATE_Z + PLATE_H;
const TRACK_R = 79;
const PUCK_ORBIT = 55;
const PUCK_R = 8;
const PUCK_H = 9;
const PUCK_TOP = PLATE_TOP + PUCK_H;
const PUCKS = 6;
const RPM = 5;
const TURN_SECONDS = 60 / RPM;

const CAV = { x0: -147, y0: -107, a: 232, b: 214 };
const MODE = [6, 5];
const spots = [];
for (let i = 0; i < MODE[0]; i++) {
  for (let j = 0; j < MODE[1]; j++) {
    const x = CAV.x0 + ((i + 0.5) / MODE[0]) * CAV.a;
    const y = CAV.y0 + ((j + 0.5) / MODE[1]) * CAV.b;
    if (Math.hypot(x - CX, y - CY) < PLATE_R - 9) spots.push([x, y]);
  }
}
function field(x, y) {
  return Math.sin((MODE[0] * Math.PI * (x - CAV.x0)) / CAV.a) ** 2 * Math.sin((MODE[1] * Math.PI * (y - CAV.y0)) / CAV.b) ** 2;
}

const HINGE = [-150, 110];
const OPEN = (96 * Math.PI) / 180;
const DOOR_L = 236;
const DOOR_T = 8;
const DOOR_Z0 = 10;
const DOOR_Z1 = 142;
const doorXY = (u, v) => [HINGE[0] + u * Math.cos(OPEN) - v * Math.sin(OPEN), HINGE[1] + u * Math.sin(OPEN) + v * Math.cos(OPEN)];
const doorAt = (u, v, z) => [...doorXY(u, v), z];

const DUCT = { x: 85, y: -104, w: 32, d: 114, r: 2 };
const DUCT_Z = 60;
const DUCT_H = 28;
const DUCT_TOP = DUCT_Z + DUCT_H;
const MAG = [101, -72];
const FINS = 7;
const CAP = [130, -72];
const CAP_H = 36;
const TRANS = { x: 102, y: 16, w: 32, d: 34, r: 2 };
const BLOWER = [128, -28];

const P = k.fitProjection(
  [
    ...k.boxCorners(PAN, -FOOT_H, 0),
    [-150, -110, CEIL],
    [150, -110, CEIL],
    [150, 110, CEIL],
    [-150, 110, CEIL],
    ...[0, 1].flatMap((side) => [doorAt(0, 0, side ? DOOR_Z1 : DOOR_Z0), doorAt(DOOR_L, 0, side ? DOOR_Z1 : DOOR_Z0), doorAt(DOOR_L, DOOR_T, side ? DOOR_Z1 : DOOR_Z0), doorAt(0, DOOR_T, side ? DOOR_Z1 : DOOR_Z0)]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 50, elevation: 44 },
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
function around(cx, cy, length, width, angle, r) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return k.roundedPlan({ x: -length / 2, y: -width / 2, w: length, d: width, r }, 3).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAN, -FOOT_H, PAN_H + FOOT_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PAN, 18))) {
    out.push(S(k.cylinder(x, y, 7, -FOOT_H, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -FOOT_H + 1.4, FOOT_H - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(slab(PAN, 0, PAN_H, "mid", 8, 1.2));
  out.push(L(k.planOutline(k.insetPlan(PAN, 4), PAN_H, P), { tone: "faint" }));
  const screws = k.corners(PAN, 8);
  out.push(D(screws.map(([x, y]) => at([x, y, PAN_H])), { size: 0.5 }));
  out.push(L(k.ring(CX, CY, TRACK_R, FLOOR, P, 72), { tone: "faint" }));
  return out.join("");
}

function leftWall() {
  const out = [];
  out.push(slab(LEFT, FLOOR, CEIL - FLOOR, "mid", 2, 0.4));
  for (const z of [44, 68]) {
    out.push(slab({ x: -147, y: -96, w: 2.2, d: 192, r: 0.9 }, z, 4, "lo", 3, 0.3, { crease: "faint" }));
    out.push(D([at([-144.8, -92, z + 2]), at([-144.8, 92, z + 2])], { size: 0.4 }));
  }
  const lamp = { x: -147, y: -22, w: 1.6, d: 44, r: 1.2 };
  out.push(slab(lamp, 92, 28, "lo", 3, 0.3, { crease: "faint" }));
  const lampDots = [];
  for (let y = -17; y <= 17; y += 5) for (let z = 97; z <= 115; z += 5) lampDots.push(at([-145.4, y, z]));
  out.push(D(lampDots, { size: 0.36, tone: "lo" }));
  out.push(L(faceX(-145.4, rrect(-19, 94.5, 19, 117.5, 1.6)), { tone: "faint" }));
  out.push(D([at([-145.4, -20.5, 94.5]), at([-145.4, 20.5, 94.5]), at([-145.4, -20.5, 117.5]), at([-145.4, 20.5, 117.5])], { size: 0.45 }));
  return out.join("");
}

function backWall() {
  const out = [];
  out.push(slab(BACK, FLOOR, CEIL - FLOOR, "mid", 2, 0.4));
  const y = BACK.y + WALL;
  const slots = [];
  for (let x = -110; x <= 40; x += 10) slots.push(faceY(y, rrect(x - 0.9, 100, x + 0.9, 124, 0.9, 3)));
  out.push(L(slots.join(""), { tone: "faint" }));
  out.push(L(faceY(y, rrect(-128, 46, 56, 90, 6)) + faceY(y, rrect(-122, 52, 50, 84, 4)), { tone: "faint" }));
  const probe = { x: -52, y, w: 14, d: 3.4, r: 1.2 };
  out.push(slab(probe, 60, 12, "mid", 3, 0.3));
  out.push(D([at([-45, y + 3.4, 64]), at([-45, y + 3.4, 68])], { size: 0.42 }));
  const rating = { x: 100, y, w: 40, d: 0.8, r: 1.2 };
  out.push(slab(rating, 96, 14, "lo", 3, 0, { crease: "none" }));
  out.push(L([103.5, 108.5, 113.5].map((z, i) => k.segment([103, y + 0.8, z], [103 + [24, 31, 18][i], y + 0.8, z], P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([136, y + 0.8, 101.5]), at([136, y + 0.8, 106.5])], { size: 0.42 }));
  return out.join("");
}

function liner() {
  const out = [];
  const liner = { x: CAV.x0 + 3, y: CAV.y0 + 3, w: CAV.a - 6, d: CAV.b - 6, r: 3 };
  out.push(slab(liner, FLOOR, 1.2, "lo", 5, 0, { crease: "none" }));
  out.push(D(k.corners(liner, 4).map(([x, y]) => at([x, y, FLOOR + 1.2])), { size: 0.45 }));
  out.push(S(k.cylinder(CX, CY, 9, FLOOR + 1.2, PLATE_Z - FLOOR - 1.2, P, 28), { tone: "mid", crease: "faint" }));
  out.push(L(k.sideArc(CX, CY, 9, FLOOR + 6, P, 14), { tone: "faint" }));
  return out.join("");
}

function spider(theta) {
  const items = [];
  for (let n = 0; n < 3; n++) {
    const a = theta / 2 + (n * Math.PI * 2) / 3;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const arm = around(CX + dx * 41, CY + dy * 41, 66, 6, Math.atan2(dy, dx), 1.4);
    items.push({ depth: k.depthOf([CX + dx * 41, CY + dy * 41, 0], P) - 3, svg: S(k.extrude(arm, FLOOR + 1.2, 3, P, { bevel: 0.3 }), { tone: "mid" }) });
    const roller = around(CX + dx * TRACK_R, CY + dy * TRACK_R, 12, 6, Math.atan2(dy, dx) + Math.PI / 2, 3);
    items.push({ depth: k.depthOf([CX + dx * TRACK_R, CY + dy * TRACK_R, 0], P), svg: S(k.extrude(roller, FLOOR + 1.2, PLATE_Z - FLOOR - 1.2, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }) });
  }
  return items.sort((a, b) => a.depth - b.depth).map((item) => item.svg).join("");
}

function plateStatic() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.cylinder(CX, CY, PLATE_R, PLATE_Z, 2, P, 64).fill}" style="filter:blur(4px)"/>`);
  out.push(S(k.cylinder(CX, CY, PLATE_R, PLATE_Z, PLATE_H, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(CX, CY, PLATE_R - 2, PLATE_TOP, P, 72), { tone: "faint" }));
  out.push(L(k.ring(CX, CY, 12, PLATE_TOP, P, 32), { tone: "lo" }));
  out.push(L(k.ring(CX, CY, 3.2, PLATE_TOP, P, 16), { tone: "mid" }));
  out.push(L(spots.map(([x, y]) => k.ring(x, y, 6.6, PLATE_TOP, P, 24)).join(""), { tone: "lo" }));
  out.push(L(spots.map(([x, y]) => k.ring(x, y, 3, PLATE_TOP, P, 20)).join(""), { tone: "mid" }));
  out.push(D(spots.map(([x, y]) => at([x, y, PLATE_TOP])), { size: 0.7, tone: "mid" }));
  return out.join("");
}

function plateMarks(theta) {
  const out = [];
  const t = k.radialTicks(CX, CY, PLATE_R, 72, 6, PLATE_TOP, [1.2, 2.6], P, theta);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const dx = Math.sin(theta);
  const dy = -Math.cos(theta);
  out.push(L(k.lineOnTop([CX + dx * 12, CY + dy * 12], [CX + dx * 30, CY + dy * 30], PLATE_TOP, P), { tone: "hi" }));
  out.push(D([at([CX + dx * 30, CY + dy * 30, PLATE_TOP])], { size: 0.8, tone: "hi" }));
  return out.join("");
}

function pucks(theta) {
  const list = [];
  for (let n = 0; n < PUCKS; n++) {
    const a = theta + (n * Math.PI * 2) / PUCKS;
    const x = CX + Math.sin(a) * PUCK_ORBIT;
    const y = CY - Math.cos(a) * PUCK_ORBIT;
    list.push({ x, y, depth: k.depthOf([x, y, 0], P), heat: field(x, y) });
  }
  list.sort((p, q) => p.depth - q.depth);
  const svg = list
    .map(({ x, y, heat }) => {
      const body = S(k.cylinder(x, y, PUCK_R, PLATE_TOP, PUCK_H, P, 28, 0.5), { tone: "hi", crease: "lo" });
      const glow = S(k.cylinder(x, y, PUCK_R - 1.2, PUCK_TOP, 0.5, P, 24), { tone: "hi", crease: "none", lit: true });
      const halo = L(k.ring(x, y, PUCK_R + 2.4, PLATE_TOP, P, 32), { tone: "lit" });
      return `<g style="opacity:${(heat * heat).toFixed(2)}">${halo}</g>` + body + `<g style="opacity:${(0.08 + 0.92 * heat).toFixed(2)}">${glow}</g>`;
    })
    .join("");
  const hot = list.filter((p) => p.heat > 0.5).length;
  const mean = list.reduce((sum, p) => sum + p.heat, 0) / list.length;
  return { svg, hot, mean };
}

function blower(psi) {
  const [x, y] = BLOWER;
  const out = [];
  const z = 24;
  for (let n = 0; n < 14; n++) {
    const a = psi + (n * Math.PI * 2) / 14;
    const b = a + 0.55;
    out.push(k.lineOnTop([x + Math.sin(a) * 4.5, y - Math.cos(a) * 4.5], [x + Math.sin(b) * 12.6, y - Math.cos(b) * 12.6], z, P));
  }
  return L(out.join(""), { tone: "mid" });
}

function blowerStatic() {
  const [x, y] = BLOWER;
  const out = [];
  out.push(S(k.cylinder(x, y, 16, FLOOR, 16, P, 36, 0.6), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 16, FLOOR + 5, P, 16), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 12.6, FLOOR + 16, 0.01, P, 36), { tone: "lo", crease: "none", flat: true }));
  out.push(L(k.ring(x, y, 12.6, 24, P, 36) + k.ring(x, y, 4.5, 24, P, 18), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 3, 24, 2.4, P, 16), { tone: "hi" }));
  out.push(D([at([x, y, 26.4])], { size: 0.5 }));
  return out.join("");
}

function partition() {
  const out = [];
  out.push(slab(PART, FLOOR, PART_TOP - FLOOR, "mid", 2, 0.4));
  const x = PART.x + WALL;
  const slots = [];
  for (let y = -96; y <= 8; y += 8) slots.push(faceX(x, rrect(y - 0.9, 22, y + 0.9, 44, 0.9, 3)));
  out.push(L(slots.join(""), { tone: "faint" }));
  return out.join("");
}

function duct() {
  const out = [];
  out.push(slab(DUCT, DUCT_Z, DUCT_H, "hi", 3, 0.6, { crease: "lo", inner: L(k.sideSeam(DUCT, DUCT_Z + 14, P, 3), { tone: "faint" }) }));
  const flanges = [
    { x: DUCT.x, y: DUCT.y + DUCT.d, w: DUCT.w + 1.6, d: 3, r: 1 },
    { x: DUCT.x, y: DUCT.y + 40, w: DUCT.w + 1.6, d: 3, r: 1 },
  ];
  for (const flange of flanges) {
    out.push(slab(flange, DUCT_Z - 2, DUCT_H + 4, "mid", 3, 0.4));
    out.push(D([at([flange.x + flange.w - 4, flange.y + 3, DUCT_Z + 1.5]), at([flange.x + flange.w - 4, flange.y + 3, DUCT_TOP - 1.5])], { size: 0.45 }));
  }
  const port = { x: DUCT.x + DUCT.w, y: DUCT.y + 14, w: 0.01, d: 1, r: 0 };
  void port;
  return out.join("");
}

function magnetron() {
  const [cx, cy] = MAG;
  const out = [];
  const base = { x: cx - 15, y: cy - 17, w: 30, d: 34, r: 3 };
  out.push(slab(base, DUCT_TOP, 3, "mid", 4, 0.4));
  out.push(D(k.corners(base, 3).map(([x, y]) => at([x, y, DUCT_TOP + 3])), { size: 0.45 }));
  for (const side of [-1, 1]) {
    const magnet = { x: cx - 9, y: side < 0 ? cy - 23 : cy + 17, w: 18, d: 6, r: 1.4 };
    out.push(slab(magnet, DUCT_TOP + 3, 20, "lo", 3, 0.4));
  }
  out.push(S(k.cylinder(cx, cy, 9.4, DUCT_TOP + 3, 9, P, 28), { tone: "hi" }));
  out.push(L(k.sideArc(cx, cy, 9.4, DUCT_TOP + 7, P, 12), { tone: "faint" }));
  const fin0 = DUCT_TOP + 12;
  for (let n = 0; n < FINS; n++) out.push(S(k.cylinder(cx, cy, 13, fin0 + n * 3.2, 1.4, P, 32), { tone: "mid", crease: "faint" }));
  const finTop = fin0 + (FINS - 1) * 3.2 + 1.4;
  out.push(S(k.cylinder(cx, cy, 6.4, finTop, 5, P, 24), { tone: "hi" }));
  const box = { x: cx + 2, y: cy - 6, w: 13, d: 12, r: 1.6 };
  out.push(slab(box, finTop, 7, "mid", 3, 0.4));
  out.push(D([at([box.x + box.w - 2.5, cy, finTop + 7]), at([box.x + 2.5, cy, finTop + 7])], { size: 0.45 }));
  return { svg: out.join(""), finTop, box };
}

function capacitor() {
  const [cx, cy] = CAP;
  const out = [];
  out.push(S(k.cylinder(cx, cy, 9, FLOOR, CAP_H, P, 32, 0.4), { tone: "hi" }));
  out.push(L(k.sideArc(cx, cy, 9, FLOOR + 6, P, 14) + k.sideArc(cx, cy, 9, FLOOR + CAP_H - 6, P, 14), { tone: "faint" }));
  out.push(S(k.cylinder(cx, cy, 7.4, FLOOR + CAP_H, 1.4, P, 28), { tone: "mid" }));
  for (const dx of [-4, 4]) out.push(S(k.cylinder(cx + dx, cy, 1.9, FLOOR + CAP_H + 1.4, 3.6, P, 14), { tone: "lo" }));
  const clamp = { x: cx - 4, y: cy + 8, w: 8, d: 3, r: 0.8 };
  out.push(slab(clamp, FLOOR + 10, 8, "mid", 2, 0));
  return out.join("");
}

function transformer() {
  const out = [];
  const core = TRANS;
  const top = FLOOR + 30;
  out.push(slab(core, FLOOR, 30, "mid", 3, 0.6));
  const laminations = [];
  for (let x = core.x + 3; x < core.x + core.w - 2; x += 3) laminations.push(k.lineOnTop([x, core.y], [x, core.y + core.d], top, P));
  out.push(L(laminations.join(""), { tone: "faint" }));
  const winding = { x: core.x + 6, y: core.y + 6, w: core.w + 8, d: core.d - 12, r: 4 };
  out.push(slab(winding, FLOOR + 5, 20, "hi", 5, 0.6, { crease: "lo" }));
  const wires = [];
  for (let z = FLOOR + 9; z < FLOOR + 24; z += 4) wires.push(k.sideSeam(winding, z, P, winding.r));
  out.push(L(wires.join(""), { tone: "faint" }));
  out.push(D([at([core.x + 3, core.y + 3, top]), at([core.x + core.w - 3, core.y + 3, top]), at([core.x + 3, core.y + core.d - 3, top]), at([core.x + core.w - 3, core.y + core.d - 3, top])], { size: 0.45 }));
  const post = [core.x + 12, core.y + 17];
  out.push(S(k.cylinder(post[0], post[1], 2.2, top, 4, P, 14), { tone: "lo" }));
  return { svg: out.join(""), post: [...post, top + 4] };
}

function harness(mag, trans) {
  const [cx, cy] = CAP;
  const wireA = [
    [cx + 4, cy, FLOOR + CAP_H + 5],
    [cx + 4, cy, mag.finTop + 3.5],
    [cx + 4, MAG[1], mag.finTop + 3.5],
    [mag.box.x + mag.box.w, MAG[1], mag.finTop + 3.5],
  ];
  const wireB = [trans.post, [trans.post[0], trans.post[1], 50], [cx - 4, trans.post[1], 50], [cx - 4, cy, 50], [cx - 4, cy, FLOOR + CAP_H + 5]];
  const draw = (route) => k.wireSvg(at(route[0]), at(route[route.length - 1]), { via: route.slice(1, -1).map(at), tone: "mid", size: 0.9 });
  return draw(wireA) + draw(wireB);
}

function bayWall() {
  const out = [];
  const y = BACK.y + WALL;
  out.push(D([at([142, y, 128]), at([142, y, 20]), at([94, y, 128]), at([94, y, 20])], { size: 0.5 }));
  return out.join("");
}

function frontFrame() {
  const out = [];
  out.push(slab(SILL, FLOOR, SILL_TOP - FLOOR, "mid", 3, 0.5));
  const slots = [];
  for (const x of [58, 70]) slots.push(faceY(FRONT_Y, rrect(x - 3, 10.5, x + 3, 14.5, 1.4, 3)));
  out.push(L(slots.join(""), { tone: "lo" }));
  out.push(D([at([-140, FRONT_Y, 13]), at([-70, FRONT_Y, 13]), at([-10, FRONT_Y, 13]), at([40, FRONT_Y, 13]), at([78, FRONT_Y, 13])], { size: 0.5 }));
  return out.join("");
}

const KNOB = [119, 46];
const POWER_LEVEL = 8;

function controls() {
  const out = [];
  out.push(slab(CPANEL, FLOOR, CEIL - FLOOR, "mid", 3, 0.5));
  out.push(`<g>${L(faceY(FRONT_Y, rrect(CPANEL.x + 4, FLOOR + 4, CPANEL.x + CPANEL.w - 4, CEIL - 4, 4)), { tone: "faint" })}</g>`);
  const display = { x: 94, y: FRONT_Y, w: 50, d: 0.8, r: 2 };
  out.push(slab(display, 112, 17, "lo", 3, 0, { crease: "none" }));
  out.push(L(faceY(FRONT_Y + 0.8, rrect(96, 114, 142, 127, 1.4)), { tone: "faint" }));
  out.push(k.faceTextSvg(k.sideMatrix([119, FRONT_Y + 0.8], 117.5, P, "left"), "0:12", { size: 7.4, tone: "hi", anchor: "middle" }));
  const cols = [99, 113, 127];
  const rows = [99, 88, 77, 66];
  for (const z of rows) for (const x of cols) out.push(slab({ x, y: FRONT_Y, w: 12, d: 1.4, r: 1 }, z, 8, "mid", 2, 0.3, { crease: "faint" }));
  const ticks = [];
  for (let n = 0; n <= 10; n++) {
    const a = ((-135 + n * 27) * Math.PI) / 180;
    const len = n % 5 === 0 ? 4 : 2.4;
    ticks.push(k.segment([KNOB[0] + Math.sin(a) * 13.4, FRONT_Y, KNOB[1] + Math.cos(a) * 13.4], [KNOB[0] + Math.sin(a) * (14.2 + len), FRONT_Y, KNOB[1] + Math.cos(a) * (14.2 + len)], P));
  }
  out.push(L(ticks.join(""), { tone: "lo" }));
  const F = G.frameAlong([KNOB[0], FRONT_Y, KNOB[1]], [0, 1, 0]);
  out.push(S(G.solidOf([[0, 14], [1.6, 14], [1.6, 10.6], [7.4, 10.6], [8.8, 9.2, 1]], F, P), { tone: "hi", crease: "lo" }));
  const a = ((-135 + POWER_LEVEL * 27) * Math.PI) / 180;
  const faceY0 = FRONT_Y + 8.8;
  out.push(L(k.segment([KNOB[0], faceY0, KNOB[1]], [KNOB[0] + Math.sin(a) * 9.2, faceY0, KNOB[1] + Math.cos(a) * 9.2], P), { tone: "hi" }));
  out.push(D([at([KNOB[0], faceY0, KNOB[1]])], { size: 0.7, tone: "hi" }));
  out.push(slab({ x: 94, y: FRONT_Y, w: 22, d: 1.6, r: 2 }, 15, 9, "mid", 3, 0.3));
  out.push(slab({ x: 122, y: FRONT_Y, w: 22, d: 1.6, r: 2 }, 15, 9, "mid", 3, 0.3));
  out.push(L(faceY(FRONT_Y + 1.6, rrect(98, 17.4, 112, 20.6, 1, 3)) + faceY(FRONT_Y + 1.6, rrect(126, 17.4, 140, 20.6, 1, 3)), { tone: "faint" }));
  return out.join("");
}

function topPanel() {
  const out = [];
  const plan = { x: -150, y: -110, w: 300, d: 220, r: 6 };
  out.push(slab(plan, CEIL, TOP_H, "mid", 8, 1.2, { crease: "faint", inner: L(k.sideSeam(plan, CEIL + 3, P, 8), { tone: "faint" }) }));
  const slots = [];
  for (let x = -128; x <= 128; x += 11) slots.push(k.planOutline({ x: x - 0.8, y: -96, w: 1.6, d: 26, r: 0.8 }, TOP, P, 3));
  out.push(L(slots.join(""), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 6), TOP, P, 8), { tone: "faint" }));
  out.push(D(k.corners(plan, 10).map(([x, y]) => at([x, y, TOP])), { size: 0.5 }));
  return out.join("");
}

function door() {
  const out = [];
  const ring = [doorXY(0, 0), doorXY(DOOR_L, 0), doorXY(DOOR_L, DOOR_T), doorXY(0, DOOR_T)];
  out.push(`<path class="iso-halo" d="${k.extrude(ring, DOOR_Z0, 3, P).fill}" style="filter:blur(6px)"/>`);
  out.push(S(k.extrude(ring, DOOR_Z0, DOOR_Z1 - DOOR_Z0, P, { bevel: 1 }), { tone: "mid", crease: "faint" }));
  const onDoor = (list) => k.pathOf(list.map(([u, z]) => at(doorAt(u, 0, z))), true);
  out.push(L(onDoor(rrect(8, 18, DOOR_L - 8, 134, 5)), { tone: "faint" }));
  out.push(L(onDoor(rrect(26, 34, 204, 118, 6)), { tone: "lo" }));
  out.push(L(onDoor(rrect(30, 38, 200, 114, 4)), { tone: "faint" }));
  const mesh = [];
  for (let u = 36; u <= 194; u += 7) for (let z = 44; z <= 108; z += 7) mesh.push(at(doorAt(u, 0, z)));
  out.push(D(mesh, { size: 0.3, tone: "lo" }));
  out.push(D([[26, 34], [204, 34], [26, 118], [204, 118]].map(([u, z]) => at(doorAt(u, 0, z))), { size: 0.5 }));
  for (const z of [30, 100]) out.push(S(k.cylinder(...doorXY(-1.5, 4), 3.4, z, 16, P, 18), { tone: "lo" }));
  for (const z of [44, 100]) {
    const hook = [doorXY(224, -7), doorXY(232, -7), doorXY(232, 0), doorXY(224, 0)];
    out.push(S(k.extrude(hook, z, 8, P, { bevel: 0.3 }), { tone: "hi" }));
  }
  return out.join("");
}

const mag = magnetron();
const trans = transformer();

const staticBefore = [bench(), backWall(), leftWall(), liner()].join("");
const bayItems = [
  duct(),
  mag.svg,
  capacitor(),
  blowerStatic(),
  `<g data-part="blower">${blower(0)}</g>`,
  trans.svg,
  harness(mag, trans),
  bayWall(),
].join("");

const THETA0 = 0.5;
const first = pucks(THETA0);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A microwave oven with its door open and its right side panel removed. In the cooking cavity a glass plate carries six marshmallows round a ring; it turns on a roller carriage while a fixed pattern of hot spots, one every six centimetres, lights each marshmallow as it passes. The bay on the right shows the magnetron on its waveguide, the high-voltage capacitor, the transformer and the cooling blower. The control panel has a display, a keypad and a power dial.",
  body: [
    staticBefore,
    `<g data-part="spider">${spider(THETA0)}</g>`,
    plateStatic(),
    `<g data-part="marks">${plateMarks(THETA0)}</g>`,
    `<g data-part="pucks">${first.svg}</g>`,
    partition(),
    bayItems,
    frontFrame(),
    controls(),
    door(),
  ],
});

const dynamicSource = [spider, plateMarks, pucks, blower, around, field].map((fn) => fn.toString()).join("\n");

const live = `
const P = ${JSON.stringify(P)};
const k = { cylinder, extrude, solidSvg, lineSvg, dotsSvg, iso, depthOf, ring, lineOnTop, radialTicks, roundedPlan };
const at = (point) => iso(point, P);
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
const D = (points, style) => dotsSvg(points, style);
const CX = ${CX}, CY = ${CY}, FLOOR = ${FLOOR}, PLATE_Z = ${PLATE_Z}, PLATE_TOP = ${PLATE_TOP}, PLATE_R = ${PLATE_R}, TRACK_R = ${TRACK_R};
const PUCK_ORBIT = ${PUCK_ORBIT}, PUCK_R = ${PUCK_R}, PUCK_H = ${PUCK_H}, PUCK_TOP = ${PUCK_TOP}, PUCKS = ${PUCKS};
const CAV = ${JSON.stringify(CAV)}, MODE = ${JSON.stringify(MODE)};
const BLOWER = ${JSON.stringify(BLOWER)};
${dynamicSource}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const spiderEl = svg.querySelector('[data-part="spider"]');
const marksEl = svg.querySelector('[data-part="marks"]');
const pucksEl = svg.querySelector('[data-part="pucks"]');
const blowerEl = svg.querySelector('[data-part="blower"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const TAU = Math.PI * 2;
const SPEED = TAU / ${TURN_SECONDS};
const BLOWER_SPEED = 3.2;
let theta = ${THETA0}, target = theta, psi = 0, touring = true, visible = false, frame = 0, last = 0, idleTimer = 0, lastText = "";
const wrap = (value) => ((value % TAU) + TAU) % TAU;
function draw() {
  const turn = wrap(theta);
  spiderEl.innerHTML = spider(turn);
  marksEl.innerHTML = plateMarks(turn);
  const live = pucks(turn);
  pucksEl.innerHTML = live.svg;
  const degrees = Math.round((turn * 180) / Math.PI) % 360;
  const text = "prato " + degrees + "° · rolos " + Math.round(degrees / 2) + "° · " + live.hot + " de " + PUCKS + " quentes";
  if (text !== lastText) { readout.textContent = text; lastText = text; stage.setAttribute("aria-valuenow", String(degrees)); stage.setAttribute("aria-valuetext", text); }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && !calm) target += SPEED * dt;
  theta = calm ? target : theta + (target - theta) * (1 - Math.exp(-dt / (touring ? 0.05 : 0.22)));
  if (Math.abs(target - theta) < 0.0005) theta = target;
  if (!calm) { psi += BLOWER_SPEED * dt; blowerEl.innerHTML = blower(psi); }
  draw();
  const settled = !touring && theta === target && calm;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = next; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.15) / 0.7));
  steer(Math.round(theta / TAU - 0.5) * TAU + share * TAU);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const step = Math.PI / 6;
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.round(target / step) * step + step;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.round(target / step) * step - step;
  if (event.key === "Home") to = Math.round(target / TAU) * TAU;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Forno de micro-ondas",
  hint: "Mouse gira o prato",
  readout: `prato ${Math.round(((THETA0 * 180) / Math.PI) % 360)}° · rolos ${Math.round(((THETA0 * 180) / Math.PI) / 2)}° · ${first.hot} de ${PUCKS} quentes`,
  keys: [
    { mark: "lit", label: "Marshmallow: o brilho segue a intensidade do campo no ponto onde ele está" },
    { mark: "dim", label: "Anéis fracos no prato: pontos quentes, fixos na cavidade" },
  ],
  caption:
    "Porta aberta e lateral removida só para mostrar o interior; com a porta aberta o intertravamento impede o magnetron de ligar. O magnetron gera 2,45 GHz (λ ≈ 12,2 cm) e o guia de onda leva a energia à cavidade, onde ela forma ondas estacionárias: um ponto quente a cada meia onda, cerca de 6 cm (aqui um único modo, desenhado na altura do prato; um forno real mistura vários). O prato dá uma volta a cada 12 s (5 rpm) e os rolos andam à metade da velocidade, de modo que cada marshmallow cruza pontos quentes e frios.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Forno de micro-ondas: setas giram o prato de 30 em 30 graus" aria-valuemin="0" aria-valuemax="360" aria-valuenow="29">${svg}</div>`,
});

const file = theme === "light" ? "microwave-light.html" : "microwave.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Forno de micro-ondas", theme, body, script: kitScript() + live }));
console.log("wrote", file);
