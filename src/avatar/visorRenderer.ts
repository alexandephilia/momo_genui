export type RgbTriplet = [number, number, number];

export interface VisorDrawOptions {
  zoom?: number;
  outfit?: number;
  face?: number;
  speaking?: boolean;
  working?: boolean;
  armL?: number;
  armR?: number;
  smile?: number;
  sleepy?: boolean | number;
  wink?: boolean | number;
  tip?: [number, number, number];
  fall?: number;
  glow?: number;
  glassY?: number;
  leaf?: number;
  colors?: [RgbTriplet, RgbTriplet, RgbTriplet, RgbTriplet];
  palette?: string;
  yaw?: number;
  pitch?: number;
  roll?: number;
  squash?: number;
  bug?: number;
  legL?: [number, number, number] | number[];
  legR?: [number, number, number] | number[];
  ant?: [number, number, number] | number[];
  dead?: number;
  blink?: number;
  look?: [number, number];
  lift?: number;
  lids?: [number, number];
  peek?: boolean;
  brows?: [number, number, number, number] | number[];
  eyeScale?: [number, number];
  hatTilt?: number;
  browOn?: number;
  restMouth?: boolean;
  darkFloor?: number;
  small?: number | boolean;
  fuzz?: number;
  hover?: number;
  poke?: number;
  time?: number;
  quality?: number;
  _speakEnv?: number;
}

export interface VisorRendererInfo {
  lost: boolean;
  gpu: string;
  software: boolean;
  compileMs: number;
  parallel: boolean;
  ready: number[];
  renderer: string;
}

export interface VisorRenderer {
  draw: (targetCanvas: HTMLCanvasElement | null, size: number, opts?: VisorDrawOptions) => HTMLCanvasElement;
  drawAsync: (targetCanvas: HTMLCanvasElement | null, size: number, opts?: VisorDrawOptions) => Promise<HTMLCanvasElement>;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | null;
  info: VisorRendererInfo;
  isReady: () => boolean;
  faceReady: (mode?: number) => boolean;
  preload: () => void;
}

interface FaceBuffer {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface AnimState {
  armL: number; armLV: number; armR: number; armRV: number;
  speakEnv: number; hoverEnv: number; t: number;
  pYaw: number; pRoll: number; pLift: number; pSq: number; pPoke: number;
  packBob: number; packBobV: number; packSway: number; packSwayV: number;
  packTwist: number; packTwistV: number; tagSwing: number; tagSwingV: number;
}

// Momo Avatar WebGL2 Renderer — Desain 02 (Satin Ceramic + Smoked Sapphire Depth Visor)
// Combines refine-ai-avatar-visuals bean+visor silhouette with Momo's 4-stop velour ramp,
// fitted 19 outfits (with enlarged Perencana earphone), full expressions, and Offline Ash + 404 Error.

const FW = 512;
const FH = 288;
const FSCALE = FW / 0.9;

const PALETTES: Record<string, unknown> = {
  persimmon: ["#FBC2A2","#EF8C66","#DA6C4D","#B5523C"],
  honey:     ["#FCE0A2","#F3BD58","#DE9E3C","#B67B2C"],
  cornflower:["#C2D3FB","#86A3F0","#6784DC","#4D66BA"],
  matcha:    ["#D3E7B0","#A3C977","#83AC5B","#648A45"],
  wisteria:  ["#D8CCF7","#AA95E9","#8C76D5","#6E58B2"],
  rose:      ["#F9C8D3","#EE93A9","#D8738D","#B45A71"],
  ash:       ["#E6E7EC","#C6C8D0","#A7AAB5","#878A97"],
  teal:      ["#C4EEE8","#74CFC2","#52B3A6","#3B8F85"],
  sand:      ["#F8E6CC","#EBC99B","#D6AC76","#B58B58"],
  orchid:    ["#EECDF6","#CE93E4","#B274CC","#8E58A8"],
  slate:     ["#D5DDF0","#93A6CF","#7487B6","#586A96"],
  cherry:    ["#FAC4C4","#EC8686","#D66666","#B04B4F"],
  sky:       ["#C9EAF8","#87CCEE","#63AFDA","#4A8DB8"],
  lemon:     ["#FBEFAA","#F0D95E","#DBBE3E","#B3992E"],
  mint:      ["#CDF2D6","#8FD9A2","#6CBF82","#519C66"],
  piggy:     ["#FFE0E6","#FBB9C6","#F095AA","#D2728A"],
  lime:      ["#E9F5B5","#C9E26C","#ABC64C","#88A038"],
  indigo:    ["#D6D8FA","#A0A5F0","#8086DC","#6268BA"],
  ladybug:   ["#FFC4BC","#F57A6C","#E05A4E","#B8423B"],
};

const hexRgb = (h: string): RgbTriplet => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RgbTriplet;
for (const k of Object.keys(PALETTES)) PALETTES[k] = (PALETTES[k] as string[]).map(hexRgb);

const RESOLVED_PALETTES = PALETTES as unknown as Record<string, [RgbTriplet, RgbTriplet, RgbTriplet, RgbTriplet]>;
const ASH_PAL = RESOLVED_PALETTES.ash;
const DEFAULT_PAL = RESOLVED_PALETTES.persimmon;

const OUTFIT_ACC: Record<number, [RgbTriplet, RgbTriplet, RgbTriplet]> = {
  0:  [hexRgb("#2D3342"), hexRgb("#FFE3D3"), hexRgb("#5A6275")], // Santai (bare / no hat)
  1:  [hexRgb("#E85D4A"), hexRgb("#FFF5DF"), hexRgb("#2E3440")], // Koki (coral kerchief vs honey body)
  2:  [hexRgb("#D4985E"), hexRgb("#F2CE7A"), hexRgb("#3A2A22")], // Detektif (camel deerstalker + espresso band + brass monocle vs blue body)
  3:  [hexRgb("#C4495E"), hexRgb("#F6C84C"), hexRgb("#2B2F3A")], // Penulis (wine beret + gold pencil vs green body)
  4:  [hexRgb("#A7AAB5"), hexRgb("#D8DAE0"), hexRgb("#787B86")], // Dead / Offline
  5:  [hexRgb("#F5B82E"), hexRgb("#E8ECF4"), hexRgb("#2A2E3B")], // Builder (amber safety helmet vs wisteria body)
  6:  [hexRgb("#384874"), hexRgb("#FF9E6D"), hexRgb("#222634")], // Musik (cobalt headphones + coral pads vs pink body)
  7:  [hexRgb("#2E3D6B"), hexRgb("#F4C644"), hexRgb("#222736")], // Tutor (academic navy cap + gold tassel vs teal body)
  8:  [hexRgb("#D99B43"), hexRgb("#E85D75"), hexRgb("#4E9F65")], // Pekebun (warm caramel straw hat + berry bow vs sand body)
  9:  [hexRgb("#E96D4B"), hexRgb("#F2B84B"), hexRgb("#2A2E3E")], // Desainer (coral glasses + amber brush vs orchid body)
  10: [hexRgb("#D94B5A"), hexRgb("#E8ECF4"), hexRgb("#242834")], // Sutradara (crimson scarf + black camera vs slate body)
  11: [hexRgb("#3B6FD8"), hexRgb("#D6DCE8"), hexRgb("#242B3D")], // Pelatih (royal blue sweatband + silver whistle vs cherry body)
  12: [hexRgb("#6E8F52"), hexRgb("#D68A4C"), hexRgb("#352E28")], // Traveler (safari olive bucket hat + tan leather vs sky body)
  13: [hexRgb("#E65D7E"), hexRgb("#F8C94D"), hexRgb("#2B2732")], // Keuangan (berry piggy hood + gold coin vs piggy pink body)
  14: [hexRgb("#4F6DF5"), hexRgb("#E8EEF8"), hexRgb("#2C3140")], // Perencana (cobalt earcup + charcoal boom vs mint body)
  15: [hexRgb("#E5A922"), hexRgb("#FFFFFF"), hexRgb("#23345C")], // Kapten (white crown + navy peak + gold crest vs lemon body)
  16: [hexRgb("#EB7A3C"), hexRgb("#E4E6FB"), hexRgb("#282D3C")], // Penguji (tangerine goggles vs indigo body)
  17: [hexRgb("#E0342F"), hexRgb("#D6DEE8"), hexRgb("#1E2C4F")], // Penjaga (Momo original: crimson stop '-' sign + silver pole + navy topi satpam vs lime body)
  18: [hexRgb("#262834"), hexRgb("#FFE1DC"), hexRgb("#1E202B")], // Pemburu Bug (charcoal beetle accents vs coral body)
};

const VS_SRC = `#version 300 es
in vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FS_SRC = `#version 300 es
precision highp float;

uniform vec2 uRes, uSq;
uniform vec3 uOff, cLight, cBase, cShade, cDeep, uPA, uPB, uPC;
uniform vec3 uAnt, uLegL, uLegR;
uniform vec4 uDyn;
uniform float uTime, uYaw, uPitch, uRoll, uHatTilt, uLift, uDead, uDarkFloor, uLeaf, uGlow, uSmall, uBug, uFall, uGlassY, uArmL, uArmR, uHover, uPoke, uSpk, uZoom;
uniform int uOutfit, uMode;
uniform sampler2D uFace;
out vec4 outColor;

mat2 R(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}
float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}
float sdE(vec3 p, vec3 r) {
  float k0 = length(p / r), k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}
float sdR(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCap(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdCyl(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdOct2(vec2 p, float r) {
  const vec3 k = vec3(-0.9238795, 0.3826834, 0.4142135);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= 2.0 * min(dot(vec2(-k.x, k.y), p), 0.0) * vec2(-k.x, k.y);
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  float a = fract(sin(n) * 43758.5453), b = fract(sin(n + 1.0) * 43758.5453);
  float c = fract(sin(n + 57.0) * 43758.5453), d = fract(sin(n + 58.0) * 43758.5453);
  float e = fract(sin(n + 113.0) * 43758.5453), f1 = fract(sin(n + 114.0) * 43758.5453);
  float g = fract(sin(n + 170.0) * 43758.5453), h = fract(sin(n + 171.0) * 43758.5453);
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, f1, f.x), mix(g, h, f.x), f.y), f.z);
}
vec3 ramp(float t, vec3 d, vec3 s, vec3 b, vec3 l) {
  return t < 0.35 ? mix(d, s, t / 0.35) : t < 0.72 ? mix(s, b, (t - 0.35) / 0.37) : mix(b, l, (t - 0.72) / 0.28);
}

// 2D Hex perforation lattice for Micro-Hex Belly shell pattern
float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.73205))), p.x);
}
float hexGrid(vec2 uv) {
  vec2 r = vec2(1.0, 1.73205);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  return 0.5 - hexDist(gv);
}

// Reactive shell telemetry LED color driven by state mode + hover + poke
vec3 ledMoodColor(float glowOut) {
  vec3 idleC = mix(vec3(0.30, 0.92, 1.0), vec3(1.0, 0.52, 0.72), clamp(uHover * 0.85 + uPoke, 0.0, 1.0));
  if (uMode == 11) return mix(idleC, vec3(0.45, 0.82, 1.0), 0.95);
  if (uMode == 13) return mix(idleC, vec3(0.55, 1.0, 0.82), 0.95);
  if (uMode == 12) return mix(vec3(0.45, 0.95, 1.0), vec3(0.72, 1.0, 0.92), 0.5 + 0.5 * sin(uTime * 10.0));
  if (uMode == 5 || uMode == 7) return vec3(1.0, 0.96, 0.58);
  if (uMode == 10 || uMode == 9 || uMode == 6) return vec3(0.56, 0.78, 1.0) * (0.65 + 0.25 * sin(uTime * 3.2));
  if (uMode == 1) return vec3(1.0, 0.58, 0.76);
  return idleC * glowOut;
}

float core(vec3 p) {
  return sdR(p, vec3(0.36, 0.24, 0.28), 0.30);
}
float earsD(vec3 p) {
  float d = 1e9;
  float earS = 1.0 - 0.14 * uDead;
  float earDrop = -0.45 * uDead;
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    float ang = 0.14 + earDrop + sin(uTime * 1.6 + float(i) * 2.1) * 0.025 * (1.0 - uDead);
    vec3 q = p - vec3(s * 0.32, 0.40, 0.0);
    q.xy = R(-s * ang) * q.xy;
    d = min(d, sdE(q - vec3(0.0, 0.17 * earS, 0.0), vec3(0.115, 0.165, 0.085) * earS));
  }
  return d;
}
vec3 tipOf(float s, float am) {
  float a = clamp(am, 0.48, 2.70);
  vec2 dr = vec2(s * sin(a), -cos(a));
  return vec3(s * 0.62, -0.01, 0.12) + vec3(dr * 0.30, 0.0);
}
bool hasHat(int o) {
  return o == 1 || o == 2 || o == 3 || o == 5 || o == 7 || o == 8 || o == 12 || o == 15 || o == 17;
}
float body(vec3 p) {
  float d = core(p);
  if (uOutfit == 18) {
    // Insect kostum (pemburu bug): antennae only, no cat/robot ears
  } else if (!hasHat(uOutfit)) {
    d = smin(d, earsD(p), 0.14);
  } else {
    float earShow = smoothstep(0.06, 0.36, uFall);
    if (earShow > 0.001) {
      float earsFade = earsD(p) + (1.0 - earShow) * 0.42;
      d = smin(d, earsFade, 0.14);
    }
  }
  for (int i = 0; i < 2; i++) {
    float s = i == 0 ? -1.0 : 1.0;
    float am = clamp(i == 0 ? uArmL : uArmR, 0.48, 2.70);
    vec3 a = p - vec3(s * 0.62, -0.01, 0.12);
    vec2 dr = vec2(s * sin(am), -cos(am));
    vec3 tip = vec3(dr * 0.30, 0.0);
    float arm = smin(sdCap(a, vec3(0.0), tip, 0.084), length(a - tip) - 0.102, 0.05);
    d = smin(d, arm, 0.065);
  }
  return d;
}
float shell(vec3 p, float th) {
  float c = core(p);
  return max(c - th, -c - 0.004);
}
float band(vec3 p, float y, float hh, float th) {
  return max(shell(p, th), abs(p.y - y) - hh);
}
float poly(vec3 p, vec3 a, vec3 b, vec3 c, vec3 d, float r) {
  return min(min(sdCap(p, a, b, r), sdCap(p, b, c, r)), sdCap(p, c, d, r));
}

#define ADD(dd, mm) if ((dd) < d) { d = (dd); m = (mm); }
vec2 acc(vec3 w, vec3 p) {
  if (uOutfit == 0 || uOutfit == 4) return vec2(1e9, 0.0);
  float d = 1e9, m = 1.0;
  float hTilt = -uHatTilt * 0.55 + uDyn.y * 0.16;
  vec3 hBody = p - vec3(0.0, 0.54 + clamp(uDyn.x * 0.08, -0.05, 0.05), 0.0);
  hBody.xy = R(hTilt) * hBody.xy;
  hBody.yz = R(clamp(uDyn.x * 0.22, -0.18, 0.18)) * hBody.yz;

  float fallT = clamp(uFall, 0.0, 1.0);
  vec3 h = hBody;
  if (hasHat(uOutfit) && fallT > 0.001) {
    float backT = smoothstep(0.0, 0.72, fallT);
    float vanishT = smoothstep(0.52, 0.90, fallT);
    float arcY = sin(clamp(fallT / 0.72, 0.0, 1.0) * 3.14159) * 0.24;
    vec3 crownW = uOff + vec3(-sin(uRoll) * 0.54 * uSq.y, cos(uRoll) * 0.54 * uSq.y, 0.0);
    vec3 behindW = uOff + vec3(0.0, -0.14, -0.64 - vanishT * 14.0);
    vec3 dropPos = mix(crownW, behindW, backT) + vec3(0.0, arcY, 0.0);
    vec3 hDrop = w - dropPos;
    float dropPitch = -1.35 * backT;
    float dropRoll = mix(-uHatTilt * 0.55, 0.18, backT);
    hDrop.xy = R(dropRoll) * hDrop.xy;
    hDrop.yz = R(dropPitch) * hDrop.yz;
    h = mix(hBody, hDrop, smoothstep(0.0, 0.10, fallT));
  }
  float rxz = length(h.xz);
  float amL = clamp(uArmL, 0.48, 2.70);
  float amR = clamp(uArmR, 0.48, 2.70);

  if (uOutfit == 1) {
    // Koki: toque + neckerchief (refine-ai-avatar-visuals)
    ADD(sdCyl(h - vec3(0.0, 0.05, 0.0), 0.065, 0.40), 1.0)
    float puff = sdE(h - vec3(0.0, 0.26, 0.0), vec3(0.40, 0.20, 0.36));
    for (int i = 0; i < 3; i++) {
      float a = float(i) * 2.094 + 0.5;
      puff = smin(puff, sdE(h - vec3(cos(a) * 0.22, 0.32, sin(a) * 0.20), vec3(0.20, 0.15, 0.18)), 0.08);
    }
    ADD(puff, 3.0)
    float nk = max(band(p, -0.19, 0.028, 0.020), -p.z + 0.05);
    ADD(nk, 1.0)
    ADD(sdE(p - vec3(0.0, -0.22, 0.60), vec3(0.05, 0.035, 0.03)), 1.0)
    ADD(sdCap(p, vec3(-0.02, -0.25, 0.60), vec3(-0.06, -0.40, 0.60), 0.025), 1.0)
    ADD(sdCap(p, vec3( 0.02, -0.25, 0.60), vec3( 0.07, -0.38, 0.60), 0.025), 1.0)
  } else if (uOutfit == 2) {
    // Detektif: classic tall Sherlock deerstalker (front/back peaks + inward-tied earflaps + brass monocle)
    vec3 hd = h - vec3(0.0, 0.015, 0.0);
    hd.yz = R(-0.04) * hd.yz;
    // Tall rounded tweed crown
    float crown = sdE(hd - vec3(0.0, 0.04, 0.0), vec3(0.43, 0.33, 0.41));
    ADD(max(crown, -hd.y), 1.0)
    // Crisp front & rear visors so hat silhouette reads clearly at every scale
    vec3 fPeak = hd - vec3(0.0, 0.025, 0.38);
    fPeak.yz = R(0.24) * fPeak.yz;
    ADD(sdE(fPeak, vec3(0.39, 0.026, 0.29)), 1.0)
    vec3 bPeak = hd - vec3(0.0, 0.032, -0.36);
    bPeak.yz = R(-0.22) * bPeak.yz;
    ADD(sdE(bPeak, vec3(0.36, 0.026, 0.27)), 1.0)
    // Folded-up deerstalker side earflaps curving inward along the crown
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      vec3 fl = hd - vec3(sg * 0.34, 0.20, 0.0);
      fl.xy = R(sg * 0.42) * fl.xy;
      ADD(sdE(fl, vec3(0.048, 0.145, 0.165)), 1.0)
    }
    // Espresso hatband + crown tie-ribbon button
    ADD(sdCyl(hd - vec3(0.0, 0.055, 0.0), 0.028, 0.438), 4.0)
    ADD(sdE(hd - vec3(0.0, 0.372, 0.0), vec3(0.068, 0.032, 0.050)), 4.0)
    // Warm brass monocle + lanyard chain
    vec3 mo = p - vec3(0.15, 0.02, 0.60);
    ADD(length(vec2(length(mo.xy) - 0.11, mo.z)) - 0.013, 2.0)
    ADD(sdCap(p, vec3(0.24, -0.06, 0.60), vec3(0.34, -0.30, 0.60), 0.007), 2.0)
  } else if (uOutfit == 3) {
    // Penulis: beret snugly on earless crown + pencil held cleanly in right paw
    vec3 b = h - vec3(0.0, 0.008, 0.0);
    b.xy = R(0.10) * b.xy;
    ADD(sdE(b - vec3(-0.04, 0.09, 0.0), vec3(0.47, 0.09, 0.43)), 1.0)
    ADD(sdCyl(b - vec3(-0.03, 0.0, 0.0), 0.035, 0.36), 1.0)
    ADD(sdCap(b, vec3(-0.04, 0.13, 0.0), vec3(-0.04, 0.20, 0.0), 0.016), 4.0)
    vec3 t = tipOf(1.0, amR);
    vec3 pDir = normalize(vec3(0.13, 0.34, 0.11));
    vec3 pBot = t - pDir * 0.06;
    vec3 pTop = t + pDir * 0.38;
    vec3 pNib = t - pDir * 0.13;
    ADD(sdCap(p, pBot, pTop - pDir * 0.05, 0.023), 2.0)
    ADD(sdCap(p, pTop - pDir * 0.05, pTop - pDir * 0.025, 0.024), 3.0)
    ADD(sdCap(p, pTop - pDir * 0.02, pTop, 0.023), 1.0)
    ADD(sdCap(p, pNib + pDir * 0.03, pBot, 0.016), 3.0)
    ADD(sdCap(p, pNib, pNib + pDir * 0.03, 0.008), 4.0)
  } else if (uOutfit == 5) {
    // Builder: hard hat with 3 ridges & white reflective stripe (crown-cleared)
    vec3 hb = h - vec3(0.0, 0.028, 0.0);
    hb.yz = R(-0.05) * hb.yz;
    float dome = max(sdE(hb, vec3(0.49, 0.28, 0.45)), -hb.y);
    ADD(dome, 1.0)
    ADD(sdCyl(hb - vec3(0.0, 0.008, 0.0), 0.015, 0.54), 1.0)
    vec3 bill = hb - vec3(0.0, 0.004, 0.50);
    bill.yz = R(0.16) * bill.yz;
    ADD(sdR(bill, vec3(0.28, 0.014, 0.14), 0.022), 1.0)
    ADD(sdR(hb - vec3(0.0, 0.22, 0.0), vec3(0.034, 0.055, 0.32), 0.025), 1.0)
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      ADD(sdR(hb - vec3(sg * 0.21, 0.185, 0.0), vec3(0.022, 0.042, 0.27), 0.02), 1.0)
    }
    ADD(max(dome - 0.007, abs(hb.y - 0.10) - 0.020), 3.0)
  } else if (uOutfit == 6) {
    // Musik: headphones hugging head, 3-tone padded cups (refine-ai-avatar-visuals)
    float arc = max(max(shell(p, 0.030), abs(p.z) - 0.045), 0.12 - p.y);
    ADD(arc, 4.0)
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      ADD(sdE(p - vec3(sg * 0.720, 0.12, 0.0), vec3(0.068, 0.15, 0.15)), 1.0)
      ADD(sdE(p - vec3(sg * 0.775, 0.12, 0.0), vec3(0.025, 0.11, 0.11)), 2.0)
      ADD(sdE(p - vec3(sg * 0.792, 0.12, 0.0), vec3(0.012, 0.05, 0.05)), 4.0)
    }
  } else if (uOutfit == 7) {
    // Tutor: mortarboard + gold button & hanging tassel (refine-ai-avatar-visuals)
    vec3 b = h;
    b.xz = R(0.785) * b.xz;
    ADD(sdR(b - vec3(0.0, 0.10, 0.0), vec3(0.44, 0.012, 0.44), 0.01), 1.0)
    ADD(sdCyl(h - vec3(0.0, 0.04, 0.0), 0.06, 0.35), 1.0)
    ADD(length(h - vec3(0.0, 0.12, 0.0)) - 0.03, 2.0)
    ADD(sdCap(h, vec3(0.0, 0.12, 0.0), vec3(0.60, 0.11, 0.02), 0.009), 2.0)
    ADD(sdCap(h, vec3(0.60, 0.11, 0.02), vec3(0.78, -0.10, 0.05), 0.011), 2.0)
    ADD(sdE(h - vec3(0.79, -0.15, 0.05), vec3(0.03, 0.06, 0.03)), 2.0)
  } else if (uOutfit == 8) {
    // Pekebun: wide straw hat, woven rim, ribbon + bow (refine-ai-avatar-visuals, crown-cleared)
    float leafSway = (uLeaf - 0.5) * 0.06;
    vec3 hp = h - vec3(0.0, 0.036, 0.0);
    hp.xy = R(leafSway) * hp.xy;
    float rxzp = length(hp.xz);
    float brim = sdCyl(hp + vec3(0.0, 0.075 * pow(rxzp / 0.8, 2.0) - 0.012, 0.0), 0.012, 0.80);
    brim = max(brim, -(abs(rxzp - 0.72) - 0.01));
    ADD(brim, 1.0)
    ADD(max(abs(rxzp - 0.72) - 0.01, abs(hp.y + 0.075 * pow(rxzp / 0.8, 2.0) - 0.012) - 0.018), 2.0)
    ADD(max(sdE(hp, vec3(0.39, 0.20, 0.35)), -hp.y), 1.0)
    ADD(sdCyl(hp - vec3(0.0, 0.045, 0.0), 0.024, 0.385), 2.0)
    ADD(sdE(hp - vec3(0.30, 0.05, -0.20), vec3(0.07, 0.04, 0.03)), 2.0)
  } else if (uOutfit == 9) {
    // Desainer: round glasses with temples + artist paintbrush held firmly in left paw
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      vec3 q = p - vec3(sg * 0.15, 0.02 - uGlassY, 0.60);
      ADD(length(vec2(length(q.xy) - 0.12, q.z)) - 0.013, 1.0)
      float tmp = max(shell(p, 0.016), abs(p.y - (0.03 - uGlassY)) - 0.011);
      tmp = max(tmp, max(0.26 - sg * p.x, 0.08 - p.z));
      ADD(tmp, 1.0)
    }
    ADD(sdCap(p, vec3(-0.035, 0.03 - uGlassY, 0.60), vec3(0.035, 0.03 - uGlassY, 0.60), 0.01), 1.0)
    vec3 th = tipOf(-1.0, amL);
    vec3 bDir = normalize(vec3(-0.28, 0.88, 0.38));
    vec3 bBot = th - bDir * 0.15;
    vec3 bFer = th + bDir * 0.24;
    vec3 bBr = bFer + bDir * 0.065;
    vec3 bTip = bBr + bDir * 0.075;
    ADD(sdCap(p, bBot, bFer, 0.020), 2.0)
    ADD(sdCap(p, bFer, bBr, 0.025), 3.0)
    ADD(sdCap(p, bBr, bBr + bDir * 0.042, 0.030), 4.0)
    ADD(sdCap(p, bBr + bDir * 0.042, bTip, 0.014), 1.0)
  } else if (uOutfit == 10) {
    // Sutradara: film camera on handheld grip firmly held in right paw + scarf (clear of visor & belly pips)
    vec3 t = tipOf(1.0, amR);
    vec3 c = vec3(max(t.x - 0.05, 0.71), t.y + 0.29, t.z + 0.28);
    vec3 q = p - c;
    ADD(sdR(q, vec3(0.11, 0.07, 0.035), 0.018), 4.0)
    ADD(sdR(q, vec3(0.112, 0.02, 0.036), 0.012), 1.0)
    vec3 l = vec3(q.x - 0.02, q.z - 0.05, q.y);
    ADD(sdCyl(l, 0.035, 0.05), 4.0)
    ADD(sdCyl(l - vec3(0.0, 0.03, 0.0), 0.012, 0.042), 1.0)
    ADD(sdCyl(l - vec3(0.0, 0.046, 0.0), 0.004, 0.03), 3.0)
    ADD(sdR(q - vec3(-0.06, 0.085, -0.01), vec3(0.03, 0.02, 0.02), 0.008), 4.0)
    ADD(sdCyl(q - vec3(0.05, 0.085, 0.0), 0.012, 0.014), 1.0)
    ADD(sdR(q - vec3(0.09, 0.0, 0.0), vec3(0.012, 0.05, 0.015), 0.008), 1.0)
    vec3 gripTop = c + vec3(0.0, -0.075, 0.0);
    vec3 gripBot = t + vec3(0.015, -0.085, -0.02);
    ADD(sdCap(p, gripBot, gripTop, 0.019), 4.0)
    ADD(sdCyl(p - gripTop, 0.012, 0.032), 1.0)
    ADD(band(p, -0.20, 0.032, 0.020), 1.0)
    ADD(sdCap(p, vec3(-0.22, -0.22, 0.56), vec3(-0.27, -0.44, 0.54), 0.032), 1.0)
  } else if (uOutfit == 11) {
    // Pelatih: sweatband + whistle on cord (refine-ai-avatar-visuals)
    ADD(band(p, 0.44, 0.035, 0.028), 1.0)
    ADD(band(p, -0.12, 0.005, 0.012), 4.0)
    ADD(sdE(p - vec3(0.0, -0.19, 0.60), vec3(0.035, 0.03, 0.028)), 2.0)
    ADD(sdR(p - vec3(0.04, -0.185, 0.60), vec3(0.03, 0.012, 0.012), 0.008), 2.0)
    ADD(length(p - vec3(0.0, -0.15, 0.60)) - 0.012, 4.0)
  } else if (uOutfit == 12) {
    // Traveler: floppy spring bucket hat + clean shoulder harness (clear of visor!) + 3D explorer backpack
    float brimFlex = clamp(uDyn.x * 0.12, -0.045, 0.045) * smoothstep(0.30, 0.58, rxz);
    ADD(max(sdE(h - vec3(0.0, -0.01, 0.0), vec3(0.42, 0.22, 0.38)), -h.y), 1.0)
    ADD(sdCyl(h + vec3(0.0, 0.06 * pow(rxz / 0.6, 2.0) - 0.035 + brimFlex, 0.0), 0.012, 0.60), 1.0)
    float crown = sdE(h - vec3(0.0, -0.01, 0.0), vec3(0.426, 0.22, 0.386));
    ADD(max(crown - 0.010, max(-crown - 0.002, abs(h.y - 0.055) - 0.022)), 2.0)
    ADD(sdR(h - vec3(0.39, 0.055, 0.16), vec3(0.016, 0.020, 0.014), 0.005), 4.0)

    // Explorer 3D backpack with inertial bounce/sway/yaw-lag spring physics (uDyn)
    vec3 bp = p - vec3(uDyn.y * 0.15, -0.03 + uDyn.x * 0.13, -0.58);
    bp.xy = R(uDyn.y * 0.34) * bp.xy;
    bp.yz = R(-uDyn.x * 0.24) * bp.yz;
    bp.xz = R(uDyn.z * 0.38) * bp.xz;
    ADD(sdR(bp - vec3(0.0, 0.0, -0.19), vec3(0.24, 0.25, 0.145), 0.11), 1.0)
    ADD(sdR(bp - vec3(0.0, -0.22, -0.20), vec3(0.23, 0.055, 0.14), 0.075), 4.0)
    ADD(sdR(bp - vec3(0.0, 0.21, -0.22), vec3(0.25, 0.085, 0.16), 0.09), 2.0)
    ADD(sdCap(bp, vec3(-0.08, 0.33, -0.15), vec3(0.08, 0.33, -0.15), 0.018), 4.0)
    ADD(sdR(bp - vec3(0.0, -0.10, -0.38), vec3(0.17, 0.105, 0.055), 0.045), 1.0)
    ADD(sdR(bp - vec3(0.0, 0.01, -0.395), vec3(0.165, 0.025, 0.05), 0.018), 2.0)
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      ADD(sdCap(bp, vec3(sg * 0.12, 0.25, -0.40), vec3(sg * 0.12, 0.04, -0.42), 0.018), 2.0)
      ADD(sdR(bp - vec3(sg * 0.12, 0.07, -0.43), vec3(0.026, 0.022, 0.012), 0.006), 4.0)
    }
    // Rolled canvas sleeping mat strapped across top of backpack
    vec3 br = bp - vec3(0.0, 0.355, -0.18);
    ADD(sdCyl(br.yxz, 0.28, 0.080), 3.0)
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      ADD(sdCyl(br.yxz - vec3(0.0, sg * 0.16, 0.0), 0.016, 0.086), 2.0)
    }
    // Camera-facing side (-X) thermos flask in leather sleeve
    ADD(sdCyl(bp - vec3(-0.36, -0.11, -0.19), 0.125, 0.056), 3.0)
    ADD(sdCyl(bp - vec3(-0.36, -0.15, -0.19), 0.068, 0.062), 2.0)
    ADD(sdCyl(bp - vec3(-0.36,  0.03, -0.19), 0.024, 0.046), 4.0)
    // Swinging luggage tag on camera-facing (-X) corner with pendulum spring (uDyn.w)
    vec3 tg = bp - vec3(-0.32, 0.06, -0.36);
    tg.xy = R(uDyn.w) * tg.xy;
    tg.yz = R(uDyn.x * 0.35) * tg.yz;
    ADD(sdCap(tg, vec3(0.0, 0.0, 0.0), vec3(0.0, -0.045, 0.0), 0.007), 4.0)
    ADD(sdR(tg - vec3(0.0, -0.095, 0.0), vec3(0.034, 0.052, 0.010), 0.008), 3.0)
    ADD(sdR(tg - vec3(0.0, -0.095, -0.004), vec3(0.020, 0.032, 0.010), 0.004), 2.0)
    // Precision conformal shoulder/armpit harness (projected onto bodyD +0.006, zero body penetration!)
    vec3 mp = vec3(abs(p.x), p.y, p.z);
    if (sdR(mp - vec3(0.45, -0.04, -0.11), vec3(0.26, 0.25, 0.50), 0.04) < d) {
      float pkY = uDyn.x * 0.10;
      vec3 sp0  = vec3(0.242, 0.150 + pkY, -0.586);
      vec3 sp1  = vec3(0.432, 0.150 + pkY, -0.577);
      vec3 sp2  = vec3(0.576, 0.140, -0.496);
      vec3 sp3  = vec3(0.651, 0.130, -0.375);
      vec3 sp4  = vec3(0.666, 0.120, -0.200);
      vec3 sp5  = vec3(0.666, 0.120,  0.000);
      vec3 sp6  = vec3(0.666, 0.110,  0.221);
      vec3 sp7  = vec3(0.659, 0.030,  0.344);
      vec3 sp8  = vec3(0.657, -0.080, 0.353);
      vec3 sp9  = vec3(0.666, -0.210, 0.272);
      vec3 sp10 = vec3(0.666, -0.255, 0.030);
      vec3 sp11 = vec3(0.666, -0.240, -0.200);
      vec3 sp12 = vec3(0.647, -0.221, -0.387);
      vec3 sp13 = vec3(0.544, -0.190, -0.525);
      vec3 sp14 = vec3(0.412, -0.180 + pkY, -0.582);
      vec3 sp15 = vec3(0.242, -0.180 + pkY, -0.586);
      float har = min(poly(mp, sp0, sp1, sp2, sp3, 0.019), poly(mp, sp3, sp4, sp5, sp6, 0.019));
      har = min(har, min(poly(mp, sp6, sp7, sp8, sp9, 0.019), poly(mp, sp9, sp10, sp11, sp12, 0.019)));
      har = min(har, poly(mp, sp12, sp13, sp14, sp15, 0.019));
      ADD(har, 2.0)
      vec3 bk = mp - vec3(0.662, -0.025, 0.355);
      bk.xz = R(-0.62) * bk.xz;
      ADD(sdR(bk, vec3(0.028, 0.020, 0.011), 0.005), 4.0)
    }
  } else if (uOutfit == 13) {
    // Keuangan: piggy-bank costume (pig ears + snout + coin slot + gold coin from refine-ai-avatar-visuals)
    ADD(band(p, 0.47, 0.05, 0.022), 1.0)
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      vec3 q = p - vec3(sg * 0.51, 0.49, 0.11);
      q.xy = R(-sg * 0.68) * q.xy;
      float e = max(sdE(q - vec3(0.0, 0.09, 0.0), vec3(0.095, 0.125, 0.038)), -q.y - 0.01);
      ADD(e, 1.0)
      ADD(sdE(q - vec3(0.0, 0.08, 0.018), vec3(0.052, 0.075, 0.028)), 2.0)
    }
    vec3 sn = p - vec3(0.0, -0.07, 0.61);
    ADD(sdE(sn, vec3(0.10, 0.075, 0.05)), 1.0)
    ADD(sdE(sn - vec3(0.0, 0.0, 0.045), vec3(0.085, 0.062, 0.012)), 2.0)
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      ADD(sdE(sn - vec3(sg * 0.035, 0.0, 0.058), vec3(0.018, 0.026, 0.01)), 4.0)
    }
    ADD(sdR(p - vec3(0.0, 0.56, 0.0), vec3(0.07, 0.01, 0.012), 0.006), 4.0)
    vec3 cn = p - vec3(0.0, 0.60, -0.02);
    ADD(max(sdCyl(cn.xzy, 0.008, 0.055), -cn.y - 0.04), 2.0)
  } else if (uOutfit == 14) {
    // Perencana: headset hugging head + enlarged cheek-clearing earcup + curved boom mic
    float arc = max(max(shell(p, 0.032), abs(p.z) - 0.040), 0.08 - p.y);
    ADD(arc, 4.0)
    ADD(sdE(p - vec3(0.715, 0.11, 0.0), vec3(0.065, 0.142, 0.142)), 1.0)
    ADD(sdE(p - vec3(0.765, 0.11, 0.0), vec3(0.045, 0.112, 0.112)), 4.0)
    ADD(poly(p, vec3(0.75, -0.02, 0.10), vec3(0.65, -0.07, 0.44), vec3(0.56, -0.11, 0.52), vec3(0.40, -0.15, 0.62), 0.016), 4.0)
    ADD(sdCap(p, vec3(0.40, -0.15, 0.62), vec3(0.30, -0.17, 0.64), 0.016), 4.0)
    ADD(sdE(p - vec3(0.29, -0.17, 0.65), vec3(0.036, 0.028, 0.028)), 1.0)
  } else if (uOutfit == 15) {
    // Kapten: peaked cap (white top, navy band, forward peak, braid & emblem from refine, crown-cleared)
    vec3 hc = h - vec3(0.0, 0.028, 0.0);
    hc.yz = R(-0.08) * hc.yz;
    ADD(sdCyl(hc - vec3(0.0, 0.12, 0.0), 0.06, 0.43), 3.0)
    ADD(sdE(hc - vec3(0.0, 0.18, 0.02), vec3(0.47, 0.042, 0.42)), 3.0)
    ADD(sdCyl(hc - vec3(0.0, 0.042, 0.0), 0.044, 0.445), 4.0)
    vec3 pk = hc - vec3(0.0, 0.024, 0.49);
    pk.yz = R(0.20) * pk.yz;
    ADD(max(sdR(pk, vec3(0.28, 0.012, 0.14), 0.024), -hc.z + 0.28), 4.0)
    ADD(sdE(hc - vec3(0.0, 0.056, 0.445), vec3(0.048, 0.046, 0.016)), 1.0)
    ADD(length(hc - vec3(0.0, 0.056, 0.460)) - 0.018, 3.0)
    ADD(max(sdCyl(hc - vec3(0.0, 0.016, 0.0), 0.008, 0.455), -hc.z + 0.12), 1.0)
  } else if (uOutfit == 16) {
    // Penguji: lab goggles resting on forehead following head curvature (refine-ai-avatar-visuals)
    ADD(band(p, 0.455, 0.026, 0.016), 4.0)
    vec3 c0 = vec3(0.0, 0.452, 0.492) + vec3(0.0, 0.707, 0.707) * 0.05;
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? -1.0 : 1.0;
      vec3 q = p - c0 - vec3(sg * 0.16, 0.0, 0.0);
      float qu = q.y * 0.707 - q.z * 0.707;
      float qw = q.y * 0.707 + q.z * 0.707;
      ADD(length(vec2(length(vec2(q.x, qu)) - 0.10, qw)) - 0.03, 1.0)
      ADD(sdE(vec3(q.x, qu, qw - 0.012), vec3(0.09, 0.09, 0.018)), 3.0)
    }
    vec3 q = p - c0;
    float qu = q.y * 0.707 - q.z * 0.707;
    float qw = q.y * 0.707 + q.z * 0.707;
    ADD(sdR(vec3(q.x, qu, qw), vec3(0.03, 0.014, 0.022), 0.01), 1.0)
  } else if (uOutfit == 17) {
    // Penjaga (Momo original): navy security guard cap (topi satpam) + held red octagon '-' stop sign
    vec3 hs = h - vec3(0.0, 0.026, 0.0);
    hs.yz = R(-0.07) * hs.yz;
    ADD(sdCyl(hs - vec3(0.0, 0.09, 0.0), 0.055, 0.42), 4.0)
    ADD(sdE(hs - vec3(0.0, 0.145, 0.015), vec3(0.45, 0.042, 0.41)), 4.0)
    ADD(sdCyl(hs - vec3(0.0, 0.026, 0.0), 0.024, 0.432), 2.0)
    vec3 pk = hs - vec3(0.0, 0.012, 0.48);
    pk.yz = R(0.22) * pk.yz;
    ADD(max(sdR(pk, vec3(0.28, 0.012, 0.14), 0.022), -hs.z + 0.28), 4.0)
    ADD(sdR(hs - vec3(0.0, 0.072, 0.432), vec3(0.036, 0.044, 0.012), 0.012), 2.0)
    ADD(sdR(hs - vec3(0.0, 0.072, 0.444), vec3(0.018, 0.022, 0.008), 0.006), 3.0)

    vec3 t = tipOf(-1.0, amL);
    vec3 sc = vec3(min(t.x + 0.10, -0.66), t.y + 0.50, t.z + 0.48);
    vec3 bot = vec3(sc.x + 0.03, max(-0.50, t.y - 0.24), sc.z - 0.06);
    vec3 grip = mix(bot, sc, 0.34);
    ADD(sdCap(p, bot, sc - vec3(0.0, 0.03, 0.022), 0.022), 2.0)
    ADD(sdCap(p, t, grip, 0.022), 2.0)

    vec3 sg = p - sc;
    sg.xy = R(0.08) * sg.xy;
    sg.xz = R(0.18) * sg.xz;
    vec2 wOct = vec2(sdOct2(sg.xy, 0.19) + 0.008, abs(sg.z) - 0.012);
    ADD(min(max(wOct.x, wOct.y), 0.0) + length(max(wOct, 0.0)) - 0.008, 1.0)
    float mark = min(abs(sdOct2(sg.xy, 0.158)) - 0.013, max(abs(sg.x) - 0.105, abs(sg.y) - 0.028));
    vec2 wMark = vec2(mark, abs(sg.z - 0.018) - 0.006);
    ADD(min(max(wMark.x, wMark.y), 0.0) + length(max(wMark, 0.0)), 3.0)
  } else if (uOutfit == 18) {
    // Pemburu Bug (KEPT from Momo!): Ladybug curved antennae in hBody-space + 4 animated lower legs
    float ag = clamp(uAnt.x, 0.0, 1.0);
    if (ag > 0.02) {
      for (int i = 0; i < 2; i++) {
        float s = i == 0 ? -1.0 : 1.0;
        float tw = i == 0 ? uAnt.y : uAnt.z;
        vec3 base = vec3(s * 0.15, 0.0, 0.10);
        vec3 tip = vec3(s * (0.28 + tw * 0.14) * ag, (0.26 + abs(tw) * 0.05) * ag, 0.20 * ag);
        ADD(sdCap(hBody, base, tip, 0.020 * ag), 4.0)
        ADD(length(hBody - tip) - 0.050 * ag, 4.0)
      }
    }
    if (uBug > 0.05) {
      for (int j = 0; j < 2; j++) {
        float sg = j == 0 ? -1.0 : 1.0;
        float legOff = (j == 0 ? uLegL.x : uLegR.x) * 0.06;
        float k1 = sin(uTime * 5.0 + float(j) * 2.0) * 0.02 + legOff;
        ADD(sdCap(p, vec3(sg * 0.55, -0.34, 0.10), vec3(sg * 0.72, -0.44 + k1, 0.18), 0.024 * uBug), 4.0)
        ADD(sdCap(p, vec3(sg * 0.54, -0.40, -0.10), vec3(sg * 0.70, -0.50 - k1, -0.14), 0.024 * uBug), 4.0)
      }
    }
  }

  // Carve ears cleanly from non-hat costumes so bands/headphones/goggles never get pierced
  if (!hasHat(uOutfit)) d = smax(d, -(earsD(p) - 0.028), 0.010);
  return vec2(d, m);
}

vec3 toL(vec3 w) {
  vec3 q = w - uOff;
  q.xy = R(uRoll) * q.xy;
  q.xz = R(-uYaw) * q.xz;
  q.yz = R(-uPitch) * q.yz;
  return q / vec3(uSq.x, uSq.y, uSq.x);
}
vec2 map(vec3 w) {
  vec3 p = toL(w);
  float sqMin = min(uSq.x, uSq.y);
  vec2 r = vec2(body(p) * sqMin, 0.0);
  vec2 a = acc(w, p);
  float accSq = (hasHat(uOutfit) && uFall > 0.01) ? mix(sqMin, 1.0, smoothstep(0.0, 0.16, uFall)) : sqMin;
  a.x *= accSq;
  if (a.x < r.x) r = a;
  return r;
}
vec3 nrm(vec3 p) {
  vec2 k = vec2(1.0, -1.0);
  float e = 0.0016;
  return normalize(
    k.xyy * map(p + k.xyy * e).x +
    k.yyx * map(p + k.yyx * e).x +
    k.yxy * map(p + k.yxy * e).x +
    k.xxx * map(p + k.xxx * e).x
  );
}
float shadow(vec3 ro, vec3 rd, float k) {
  float r = 1.0, t = 0.025;
  for (int i = 0; i < 8; i++) {
    float h = map(ro + rd * t).x;
    r = min(r, k * h / t);
    t += clamp(h, 0.024, 0.16);
    if (r < 0.02 || t > 1.45) break;
  }
  return clamp(r, 0.0, 1.0);
}
float ao(vec3 p, vec3 n) {
  float a = 0.0, s = 1.0;
  for (int i = 1; i <= 3; i++) {
    float h = 0.028 + 0.075 * float(i);
    a += (h - map(p + n * h).x) * s;
    s *= 0.65;
  }
  return clamp(1.0 - a * 2.5, 0.0, 1.0);
}
float ell(vec2 q, vec2 r) {
  return (length(q / r) - 1.0) * min(r.x, r.y);
}

vec4 groundShadow(vec3 gp) {
  vec2 g = R(uYaw) * gp.xz;
  vec2 foot = vec2(0.72, 0.56) * uSq.x;
  float lift = clamp((uOff.y + uLift) * 4.5, 0.0, 1.0);
  vec2 q = g / foot;
  float r2 = dot(q, q);
  float past = max(sqrt(r2) - 0.72, 0.0);
  float near = exp(-past * past * 10.0) * (1.0 - lift * 0.8);
  float wide = exp(-r2 * 1.15) * (1.0 - lift * 0.4);
  vec2 g2 = (g - vec2(0.14, -0.12)) / (foot * 1.08);
  float lean = exp(-dot(g2, g2) * 2.4);
  float edge = 1.0 - smoothstep(1.22, 1.66, length(gp.xz * vec2(0.95, 1.12)));

  float a = (near * 0.16 + wide * 0.24 + lean * 0.06) * edge * (1.0 - uSmall * 0.25);
  vec3 tint = mix(cDeep, vec3(0.16, 0.13, 0.19), 0.4);
  vec4 onLight = vec4(tint * 0.65 * a, a);

  float pool = exp(-dot(gp.xz, gp.xz) * 1.9) * edge * 0.075 * (1.0 - uSmall);
  float coreS = (near * 0.26 + wide * 0.42 + lean * 0.08) * edge * (1.0 - uSmall * 0.25);
  vec4 onDark = vec4(vec3(0.88, 0.88, 0.92) * pool * (1.0 - coreS), pool + coreS - pool * coreS);
  return mix(onLight, onDark, uDarkFloor);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.26, 4.15);
  vec3 ta = vec3(0.0, 0.11, 0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  const float FOCAL = 1.92;
  vec3 rd = normalize(uv.x * uu + uv.y * vv + FOCAL * uZoom * ww);
  float pxScale = 1.0 / (uRes.y * FOCAL * uZoom);

  const float GROUND = -0.565;
  float tg = (GROUND - ro.y) / rd.y;
  vec4 bg = (tg > 0.0 && tg < 12.0) ? groundShadow(ro + rd * tg) : vec4(0.0);

  // Bounding sphere skip
  float boundR = 1.72;
  vec3 bc = uOff + vec3(0.0, 0.20, 0.0);
  vec3 oc = ro - bc;
  float sb = dot(oc, rd);
  float sc = dot(oc, oc) - boundR * boundR;
  float disc = sb * sb - sc;

  float t = 2.55, id = -1.0, md = 1e9, tm = 2.55, im = 0.0, al = 0.0;
  if (disc >= 0.0) {
    float sdisc = sqrt(disc);
    t = max(2.1, -sb - sdisc);
    float tMax = min(6.4, -sb + sdisc);
    tm = t;
    for (int i = 0; i < 64; i++) {
      vec2 h = map(ro + rd * t);
      if (h.x < md) { md = h.x; tm = t; im = h.y; }
      if (h.x < 0.0005) { id = h.y; break; }
      t += h.x * 0.96;
      if (t > tMax) break;
    }
  }
  float ts = id > -0.5 ? t : tm;
  float aaW = 2.65 * ts * pxScale;
  if (id > -0.5) al = 1.0;
  else if (md < aaW) { id = im; t = tm; al = 1.0 - smoothstep(0.0, aaW, md); }
  if (tg > 0.0 && id < 0.5) {
    float floorW = 1.85 * tg * pxScale;
    al *= smoothstep(tg + floorW, tg - floorW, ts);
  }

  vec3 col = vec3(0.0);
  if (id > -0.5 && al > 0.001) {
    vec3 p = ro + rd * t, N = nrm(p), v = -rd;
    vec3 q = toL(p);
    float occ = ao(p, N);
    vec3 L = normalize(vec3(-0.52, 0.78, 0.62));
    vec3 F = normalize(vec3(0.75, 0.15, 0.45));
    float sh = shadow(p + N * 0.012, L, 9.0);

    // Cute Robot Shell (Design 02 + Micro-Hex Belly + 3 Backlit Cheek Gill LEDs + 4-Pip Mood Capsule)
    float nv = max(dot(v, N), 0.0);
    float velourFade = smoothstep(0.06, 0.36, nv);
    float torsoOnly = smoothstep(0.055, 0.015, core(q)) * step(id, 0.5);
    float fz = smoothstep(0.02, 0.20, q.z);
    vec2 vq = abs(q.xy - vec2(0.0, -0.005)) - vec2(0.19, 0.0);
    float vd = length(max(vq, 0.0)) - 0.21;
    float pwVis = 1.85 * ts * pxScale;
    float plate = (1.0 - smoothstep(-pwVis, pwVis, vd)) * fz;

    float waistY = -0.175 + 0.038 * cos(q.x * 2.9);
    vec3 Nf = N;

    // Panel seam & bevel groove field (opacity 0.38) - skip inside visor & props for 60fps
    if (id < 0.5 && plate < 0.999) {
      float cGrain = (vnoise(q * 58.0) - 0.5) * 0.010 * velourFade;
      float gw = 0.0065;
      vec2 gE[3];
      gE[0] = q.xy;
      gE[1] = q.xy + vec2(0.004, 0.0);
      gE[2] = q.xy + vec2(0.0, 0.004);
      float gh[3];
      for (int k = 0; k < 3; k++) {
        vec2 e = gE[k];
        float gg = 1e3;
        float wy = -0.175 + 0.038 * cos(e.x * 2.9);
        gg = min(gg, abs(e.y - 0.39));
        gg = min(gg, abs(e.y - wy));
        float sideSpan = smoothstep(wy - 0.012, wy + 0.012, e.y) * (1.0 - smoothstep(0.378, 0.402, e.y));
        gg = mix(gg, min(gg, abs(abs(e.x) - 0.50)), sideSpan);
        float rv = 1e3;
        for (int i = 0; i < 4; i++) {
          vec2 sp = vec2((mod(float(i), 2.0) * 2.0 - 1.0) * (float(i) < 2.0 ? 0.455 : 0.43), float(i) < 2.0 ? 0.16 : -0.35);
          rv = min(rv, abs(length(e - sp) - 0.014));
        }
        gg = min(gg, mix(1e3, rv, fz));
        gh[k] = smoothstep(0.0, gw * 1.6, gg);
      }
      vec2 ggrad = vec2(gh[1] - gh[0], gh[2] - gh[0]) / 0.004;
      Nf = normalize(N + vec3(cGrain) - vec3(ggrad * 0.08 * 0.38, 0.0) * torsoOnly * (1.0 - plate) * velourFade * (1.0 - uSmall * 0.6));
    }

    float wrap = clamp((dot(Nf, L) + 0.28) / 1.28, 0.0, 1.0);
    float rt = pow(wrap, 1.15) * mix(1.0, sh, 0.8);
    vec3 H = normalize(L + v);
    float fres = pow(1.0 - max(dot(v, Nf), 0.0), 3.0);

    vec3 c = vec3(0.0);
    if (id < 0.5) {
      vec3 bCol = vec3(0.0);
      if (plate < 0.999) {
        bCol = ramp(rt, cDeep, cShade, cBase, cLight);
        bCol *= mix(0.84, 1.0, occ);
        bCol += cBase * 0.12 * max(dot(Nf, F), 0.0);
        bCol += cLight * 0.18 * clamp(-Nf.y, 0.0, 1.0) * occ;

        // Bevel groove shadow (0.38) with pixel-scale smoothing
        float pxEdge = 1.45 * ts * pxScale;
        float gg0 = min(abs(q.y - 0.39), abs(q.y - waistY));
        float sideBand = smoothstep(waistY - 0.012, waistY + 0.012, q.y) * (1.0 - smoothstep(0.378, 0.402, q.y));
        gg0 = mix(gg0, min(gg0, abs(abs(q.x) - 0.50)), sideBand);
        for (int i = 0; i < 4; i++) {
          vec2 sp = vec2((mod(float(i), 2.0) * 2.0 - 1.0) * (float(i) < 2.0 ? 0.455 : 0.43), float(i) < 2.0 ? 0.16 : -0.35);
          gg0 = min(gg0, mix(1e3, abs(length(q.xy - sp) - 0.014), fz));
        }
        float grooveM = (1.0 - smoothstep(0.0, max(0.0104, pxEdge), gg0)) * torsoOnly * (1.0 - plate);

        // Brushed titanium curved waist collar + micro-hex perforated belly apron
        float collarBand = (1.0 - smoothstep(0.012, max(0.022, 0.012 + pxEdge), abs(q.y - waistY))) * torsoOnly * (1.0 - plate);
        float bellyMask = smoothstep(waistY - 0.006, waistY - 0.028, q.y) * (1.0 - collarBand) * torsoOnly;
        float hex = hexGrid(vec2(q.x, q.y * 1.08) * 19.5);
        float hexDot = (1.0 - smoothstep(0.105, max(0.18, 0.11 + pxEdge * 8.0), hex)) * bellyMask * velourFade * (1.0 - uSmall * 0.70);

        // Two-tone seam & bevel panel tinting (0.38)
        float seamW = max(0.010, pxEdge);
        float capM = smoothstep(0.39 - seamW * 0.5, 0.39 + seamW * 0.5, q.y) * smoothstep(-0.2, 0.1, q.z);
        float sideM = smoothstep(0.50 - seamW * 0.5, 0.50 + seamW * 0.5, abs(q.x)) * smoothstep(waistY, waistY + 0.02, q.y) * (1.0 - smoothstep(0.385, 0.395, q.y));
        bCol = mix(bCol, mix(bCol, cLight, 0.42), capM * 0.38 * torsoOnly);
        bCol = mix(bCol, mix(bCol, cShade, 0.55), sideM * 0.38 * torsoOnly * (1.0 - plate));

        // 4-Pip Belly Mood Capsule housing + interactive pips
        vec2 mp = q.xy - vec2(0.0, -0.36);
        float capBg = (1.0 - smoothstep(-max(0.005, pxEdge), max(0.009, pxEdge), length(max(abs(mp) - vec2(0.115, 0.0), 0.0)) - 0.034)) * fz * torsoOnly;
        float alive = 1.0 - uDead * 0.92;
        float boost = 1.0 + uHover * 0.55 + uPoke * 0.95;
        vec3 moodGlow = ledMoodColor(boost) * alive;

        float pipsGlow = 0.0;
        for (int k = 0; k < 4; k++) {
          float fk = float(k);
          vec2 pp = mp - vec2((fk - 1.5) * 0.056, 0.0);
          float pd = length(max(abs(pp) - vec2(0.0, 0.008), 0.0)) - 0.014;
          float onMask = (1.0 - smoothstep(-0.003, 0.004, pd)) * fz * torsoOnly;
          float wave = 0.45 + 0.55 * sin(uTime * 3.8 - fk * 1.15);
          if (uMode == 11) wave = step(fk, mod(uTime * 4.5, 4.4));
          else if (uMode == 12) wave = (0.3 + 0.8 * abs(sin(uTime * 10.5 + abs(fk - 1.5) * 1.2))) * max(0.35, uSpk);
          else if (uMode == 13) wave = 0.55 + 0.45 * sin(uTime * 5.0 - fk * 1.0);
          else if (uHover > 0.1 || uPoke > 0.1) wave = 0.75 + 0.45 * sin(uTime * 8.0 - fk * 0.9);
          pipsGlow += onMask * wave;
        }

        // 3 Backlit Slanted Temple Gill LED Bars along the upper head corners
        float gillLeds = 0.0;
        float gillSlots = 0.0;
        for (int side = -1; side <= 1; side += 2) {
          for (int k = 0; k < 3; k++) {
            float fk = float(k);
            vec2 kp = q.xy - vec2(float(side) * (0.335 + fk * 0.036), 0.335 - fk * 0.026);
            kp = R(float(side) * 0.52) * kp;
            float fd = length(max(abs(kp) - vec2(0.017, 0.0), 0.0)) - 0.0068;
            float slotMask = (1.0 - smoothstep(-0.002, 0.006, fd - 0.003)) * fz * torsoOnly * (1.0 - plate);
            float finLit = (1.0 - smoothstep(-0.003, 0.004, fd)) * fz * torsoOnly * (1.0 - plate);
            float anim = 0.5 + 0.5 * sin(uTime * 3.0 - fk * 0.9);
            if (uMode == 11) anim = smoothstep(0.4, 1.0, sin(uTime * 8.0 - fk * 1.1));
            else if (uMode == 12) anim = max(0.25, abs(sin(uTime * 11.5 + fk * 1.3)) * max(0.4, uSpk));
            else if (uMode == 13) anim = 0.55 + 0.45 * sin(uTime * 5.2 - fk * 0.9);
            else if (uHover > 0.1 || uPoke > 0.1) anim = 0.85 + 0.35 * sin(uTime * 7.0 + fk);
            gillSlots = max(gillSlots, slotMask);
            gillLeds += finLit * anim;
          }
        }

        bCol = mix(bCol, mix(cShade * 0.93, cDeep * 0.98, 0.18), bellyMask * 0.24);
        bCol = mix(bCol, mix(cDeep * 0.78, cShade * 0.88, rt), hexDot * 0.30 * (1.0 - capBg));
        bCol *= 1.0 - grooveM * 0.28 * 0.38 * (1.0 - capBg);
        vec3 aluCol = mix(vec3(0.50, 0.54, 0.62), vec3(0.95, 0.97, 1.0), clamp(dot(Nf, L) * 0.5 + 0.5, 0.0, 1.0));
        aluCol += vec3(1.0) * pow(max(dot(Nf, H), 0.0), 42.0) * 0.45 * sh;
        bCol = mix(bCol, aluCol, collarBand);
        float seamMask = 1.0 - smoothstep(0.003, 0.010, abs(q.y - waistY + 0.022));
        bCol *= 1.0 - seamMask * 0.24 * (1.0 - plate) * (1.0 - capBg);
        float riv = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 sp = vec2((mod(float(i), 2.0) * 2.0 - 1.0) * (float(i) < 2.0 ? 0.455 : 0.43), float(i) < 2.0 ? 0.16 : -0.35);
          riv += 1.0 - smoothstep(0.010, 0.013, length(q.xy - sp));
        }
        bCol = mix(bCol, mix(bCol, vec3(1.0), 0.35), clamp(riv, 0.0, 1.0) * fz * torsoOnly * 1.00 * (1.0 - uSmall * 0.5));
        bCol = mix(bCol, vec3(0.10, 0.13, 0.22), capBg);
        bCol = mix(bCol, vec3(0.12, 0.15, 0.24), gillSlots * 0.52 * (1.0 - uSmall * 0.5));

        // Ladybug spots when Pemburu Bug (uOutfit == 18) and alive
        if (uOutfit == 18 && uDead < 0.5) {
          float sp = 0.0;
          sp = max(sp, 1.0 - smoothstep(0.09, 0.11, length(q.xy - vec2(-0.46,  0.22))));
          sp = max(sp, 1.0 - smoothstep(0.09, 0.11, length(q.xy - vec2( 0.46,  0.20))));
          vec3 sCol = mix(vec3(0.05, 0.045, 0.06), vec3(0.22, 0.19, 0.23), rt) + vec3(1.0) * pow(max(dot(Nf, H), 0.0), 28.0) * 0.14;
          bCol = mix(bCol, sCol, sp * smoothstep(0.45, 0.22, length(q.xy)) * (1.0 - gillSlots));
        }

        if (uGlow > 0.01) {
          bCol += cLight * (0.14 * uGlow * fres);
        }

        bCol += mix(cLight, vec3(1.0), 0.3) * fres * 0.28 * (1.0 - 0.18 * bellyMask) * (0.6 + 0.4 * sh);
        bCol += vec3(1.0) * pow(max(dot(Nf, H), 0.0), 36.0) * 0.22 * sh;
        vec3 gillTint = mix(moodGlow, vec3(1.0, 0.55, 0.74) * alive, clamp(uHover + uPoke, 0.0, 1.0));
        bCol += moodGlow * pipsGlow * 0.88 + gillTint * gillLeds * 0.74 * (1.0 - uSmall * 0.4);

        // Recessed Visor Bezel
        float gasket = (1.0 - smoothstep(0.0, 0.014, abs(vd))) * fz;
        bCol = mix(bCol, vec3(0.16, 0.18, 0.24), gasket * 0.55 * (1.0 - plate));
        bCol *= 1.0 - (1.0 - smoothstep(-0.015, 0.015, vd)) * 0.30 * (1.0 - plate);
      }

      vec3 visTint = mix(vec3(0.06, 0.09, 0.24), vec3(0.03, 0.04, 0.11), smoothstep(-0.22, 0.22, q.y));
      visTint = mix(visTint, vec3(0.04, 0.05, 0.09), uDead * 0.75);
      visTint *= mix(0.50, 1.0, smoothstep(0.0, 0.032, -vd));

      vec2 refr = N.xy * 0.018;
      vec2 fuv = vec2((q.x - refr.x + 0.45) / 0.9, (0.25 - (q.y - refr.y)) / 0.5);
      vec4 fc = texture(uFace, fuv);
      float eyeA = fc.a;
      vec3 eyeC = fc.rgb / max(fc.a, 0.004);

      vec3 visCol = visTint;
      visCol += vec3(0.8, 0.92, 1.0) * fres * 0.36;
      visCol += vec3(1.0) * pow(max(dot(N, H), 0.0), 68.0) * 0.65;

      vec2 wn = N.xy - vec2(-0.34, 0.40);
      float win = smoothstep(0.22, 0.02, abs(wn.x) - 0.05) * smoothstep(0.18, 0.02, abs(wn.y * 1.45) - 0.04);
      visCol += vec3(1.0, 0.98, 1.0) * win * 0.42;
      visCol = mix(visCol, eyeC, clamp(eyeA, 0.0, 1.0));
      visCol += eyeC * eyeA * 0.22;

      c = mix(bCol, visCol, plate);
    } else {
      vec3 baseA = id < 1.5 ? uPA : id < 2.5 ? uPB : id < 3.5 ? vec3(0.97, 0.97, 0.99) : uPC;
      if (uDead > 0.01) {
        float lum = dot(baseA, vec3(0.299, 0.587, 0.114));
        baseA = mix(baseA, vec3(lum) * vec3(0.95, 0.97, 1.0), uDead * 0.88);
      }
      c = ramp(rt, baseA * 0.52, baseA * 0.74, baseA, mix(baseA, vec3(1.0), 0.38)) * mix(0.84, 1.0, occ);
      c += vec3(1.0) * pow(max(dot(N, H), 0.0), 28.0) * 0.22 * sh + mix(baseA, vec3(1.0), 0.4) * fres * 0.24;
    }

    col = (c / (1.0 + c * 0.06) * 1.06) * al;
  }

  outColor = vec4(col, al) + bg * (1.0 - al);
}`;

class VisorFaceCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lay: HTMLCanvasElement;
  lctx: CanvasRenderingContext2D;
  prevMode: number | null;
  curMode: number | null;
  modeT: number;
  lastT: number | null;
  curCol: RgbTriplet | null;
  fromBuf: FaceBuffer | null;
  toBuf: FaceBuffer | null;
  lastFaceSig: string;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = FW;
    this.canvas.height = FH;
    this.ctx = this.canvas.getContext("2d")!;
    this.lay = document.createElement("canvas");
    this.lay.width = FW;
    this.lay.height = FH;
    this.lctx = this.lay.getContext("2d")!;
    this.prevMode = null;
    this.curMode = null;
    this.modeT = 1;
    this.lastT = null;
    this.curCol = null;
    this.fromBuf = null;
    this.toBuf = null;
    this.lastFaceSig = "";
  }

  colorForMode(faceMode: number, o: VisorDrawOptions): RgbTriplet {
    if (faceMode === 5) return [1.0, 0.97, 0.72];
    if (faceMode === 11) return [0.45, 0.82, 1.0];
    if (faceMode === 13) return [0.55, 1.0, 0.82];
    if (faceMode === 12) return [0.70, 0.95, 1.0];
    if (faceMode === 7 || (o.glow || 0) > 0.35) return [1.0, 0.93, 0.62];
    if (faceMode === 10) return [0.72, 0.88, 1.0];
    if (faceMode === 0 || faceMode === 1 || faceMode === 2) {
      const out = o.outfit ?? 0;
      if (out === 1) return [0.98, 0.94, 0.76]; // Koki warm buttermilk
      if (out === 2) return [0.80, 0.92, 1.0];  // Detektif crisp steel-cyan
      if (out === 3) return [0.70, 0.98, 0.88]; // Penulis mint-sage ink
      if (out === 5) return [1.0, 0.91, 0.62];  // Builder HUD amber
      if (out === 6) return [1.0, 0.82, 0.92];  // Musik rosebeat glow
      if (out === 7) return [0.78, 0.98, 0.95]; // Tutor bright aqua
      if (out === 8) return [0.74, 0.98, 0.80]; // Pekebun meadow mint
      if (out === 9) return [0.86, 0.82, 1.0];  // Desainer lilac prism
      if (out === 10) return [0.74, 0.88, 1.0]; // Sutradara cinema slate
      if (out === 11) return [1.0, 0.86, 0.68]; // Pelatih coral energy
      if (out === 12) return [0.70, 0.95, 1.0]; // Traveler clear sky
      if (out === 13) return [0.64, 0.98, 0.78]; // Keuangan emerald coin
      if (out === 14) return [0.72, 0.96, 1.0]; // Perencana planner cyan
      if (out === 15) return [0.92, 0.96, 0.78]; // Kapten sea-gold
      if (out === 16) return [0.76, 0.86, 1.0]; // Penguji analytical indigo
      if (out === 17) return [1.0, 0.66, 0.58]; // Penjaga alert vermilion
      if (out === 18) return [0.78, 1.0, 0.66]; // Pemburu Bug radar lime
    }
    return [0.76, 0.96, 1.0];
  }

  ensureBuf(key: "fromBuf" | "toBuf"): FaceBuffer {
    if (!this[key]) {
      const cv = document.createElement("canvas");
      cv.width = FW;
      cv.height = FH;
      this[key] = { cv, ctx: cv.getContext("2d")! };
    }
    return this[key]!;
  }

  draw(o: VisorDrawOptions): boolean {
    const c = this.ctx;
    const lc = this.lctx;
    const T = o.time || 0;
    const deadMix = Math.max(o.dead || 0, o.outfit === 4 ? 1 : 0);

    if (deadMix > 0.35) {
      if (!o.small) {
        this.curMode = this.prevMode = null;
        this.modeT = 1;
      }
      const deadSig = `dead|${o.small ? 1 : 0}|${Math.floor(T * 15)}`;
      if (!o.small && o.time != null && deadSig === this.lastFaceSig) {
        return false;
      }
      this.lastFaceSig = deadSig;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, FW, FH);
      this.drawOffline404(c, T);
      return true;
    }

    const small = o.small ? 1 : 0;
    const targetMode = o.face ?? (o.outfit === 1 || o.outfit === 6 ? 1 : o.outfit === 2 ? 2 : 0);
    const gx = (o.look?.[0] || 0) * 0.50;
    const gy = (o.look?.[1] || 0) * 0.44;
    const tgtCol = this.colorForMode(targetMode, o);

    let eyeCol = tgtCol;
    if (!small && o.time != null) {
      const dt = this.lastT == null ? 0.016 : Math.min(0.05, Math.max(0.001, T - this.lastT));
      this.lastT = T;
      if (!this.curCol) this.curCol = [...tgtCol] as RgbTriplet;
      const ck = 1 - Math.exp(-dt * 11);
      for (let k = 0; k < 3; k++) this.curCol[k] += (tgtCol[k] - this.curCol[k]) * ck;
      eyeCol = this.curCol;

      if (this.curMode === null) {
        this.curMode = this.prevMode = targetMode;
        this.modeT = 1;
      } else if (targetMode !== this.curMode) {
        if (targetMode === this.prevMode && this.modeT < 0.85) {
          const old = this.curMode;
          this.curMode = this.prevMode;
          this.prevMode = old;
          this.modeT = 1 - this.modeT;
        } else {
          this.prevMode = this.curMode;
          this.curMode = targetMode;
          this.modeT = 0;
        }
      }
      if (this.modeT < 1) {
        const transDur = (this.curMode === 10 || this.prevMode === 10) ? 0.36 : this.curMode === 5 ? 0.16 : 0.26;
        this.modeT = Math.min(1, this.modeT + dt / transDur);
      }
    }

    const timeActive =
      !small &&
      o.time != null &&
      this.modeT >= 0.999 &&
      !o.speaking &&
      (o._speakEnv || 0) <= 0.002 &&
      !o.working &&
      targetMode !== 7 &&
      targetMode !== 11 &&
      targetMode !== 12 &&
      (o.glow || 0) <= 0.35;

    if (timeActive) {
      const q = (v: number | undefined, s = 300) => Math.round((v || 0) * s);
      const b = o.brows;
      const sig = [
        targetMode,
        o.outfit ?? 0,
        q(gx, 250),
        q(gy, 250),
        q(o.blink),
        q(o.lids?.[0]),
        q(o.lids?.[1]),
        q(b?.[0]),
        q(b?.[1]),
        q(b?.[2]),
        q(b?.[3]),
        q(o.eyeScale?.[0] ?? 1),
        q(o.eyeScale?.[1] ?? 1),
        q(o.smile),
        o.sleepy ? 1 : 0,
        o.wink ? 1 : 0,
        o.peek ? 1 : 0,
        o.restMouth ? 1 : 0,
        q(eyeCol[0], 120),
        q(eyeCol[1], 120),
        q(eyeCol[2], 120),
      ].join("|");
      if (sig === this.lastFaceSig) {
        return false;
      }
      this.lastFaceSig = sig;
    } else {
      this.lastFaceSig = "";
    }

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, FW, FH);

    if (small || o.time == null || this.modeT >= 0.999 || this.prevMode === this.curMode) {
      c.setTransform(FSCALE, 0, 0, -FSCALE, 0.45 * FSCALE, 0.25 * FSCALE);
      c.lineCap = c.lineJoin = "round";
      this.renderFaceMode(c, lc, o, targetMode, eyeCol, gx, gy);
      return true;
    }

    const u = this.modeT * this.modeT * (3 - 2 * this.modeT);
    const bA = this.ensureBuf("fromBuf");
    const bB = this.ensureBuf("toBuf");
    const modePairs: ReadonlyArray<readonly [FaceBuffer, number | null]> = [
      [bA, this.prevMode],
      [bB, this.curMode],
    ];
    for (const [b, md] of modePairs) {
      b.ctx.setTransform(1, 0, 0, 1, 0, 0);
      b.ctx.clearRect(0, 0, FW, FH);
      b.ctx.setTransform(FSCALE, 0, 0, -FSCALE, 0.45 * FSCALE, 0.25 * FSCALE);
      b.ctx.lineCap = b.ctx.lineJoin = "round";
      this.renderFaceMode(b.ctx, lc, o, md ?? 0, eyeCol, gx, gy);
    }

    const cx = FW * 0.5;
    const cy = FH * 0.48;
    const drawLayer = (img: HTMLCanvasElement, alpha: number, scale: number) => {
      if (alpha <= 0.01) return;
      c.save();
      c.globalAlpha = alpha;
      c.translate(cx, cy);
      c.scale(scale, scale);
      c.drawImage(img, -cx, -cy);
      c.restore();
    };
    drawLayer(bA.cv, 1 - u, 1 - 0.06 * u);
    drawLayer(bB.cv, u, 0.94 + 0.06 * u);
    return true;
  }

  renderFaceMode(c: CanvasRenderingContext2D, lc: CanvasRenderingContext2D, o: VisorDrawOptions, faceMode: number, eyeCol: RgbTriplet, gx: number, gy: number) {
    const T = o.time || 0;
    const blink = Math.min(1, Math.max(0, o.blink || 0));
    const lids = o.lids || [0, 0];
    const es = o.eyeScale || [1, 1];
    const browOn = o.browOn ?? 1;
    const brows = o.brows || [0, 0, 0, 0];
    const small = o.small ? 1 : 0;

    const rgb = (col: number[], a = 1, mult = 1) =>
      `rgba(${col.map((v) => Math.min(255, (v * 255 * mult) | 0)).join(",")},${a})`;
    const SPC = 0.145;
    const EYEY = 0.02;
    const glow = (ctx: CanvasRenderingContext2D, col: number[], blur: number) => {
      ctx.shadowColor = rgb(col, 0.9);
      ctx.shadowBlur = blur * (small ? 0.4 : 1);
    };

    const drawRoundEye = (sd: number, rx0: number, ry0: number, lidTop: number, slant: number, pupScale: number, mode: string, offX = 0, offY = 0) => {
      const rx = rx0 * es[0] * (small ? 1.18 : 1);
      const ry = ry0 * es[1] * (small ? 1.12 : 1);
      const px = sd * SPC + gx + offX;
      const py = EYEY + gy + offY;
      const ery = Math.max(ry * (1 - blink), 0.006);

      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, FW, FH);
      lc.setTransform(c.getTransform());
      lc.save();

      const topY = (x: number) => py + ery * (1 - 2 * lidTop) + sd * (x - px) * slant;
      const botY = py - ery;
      lc.beginPath();
      lc.moveTo(px - 1.5 * rx, topY(px - 1.5 * rx));
      lc.lineTo(px + 1.5 * rx, topY(px + 1.5 * rx));
      lc.lineTo(px + 1.5 * rx, botY - 0.02);
      lc.lineTo(px - 1.5 * rx, botY - 0.02);
      lc.closePath();
      lc.clip();

      const grad = lc.createRadialGradient(px - 0.12 * rx, py + 0.2 * ery, 0.005, px, py, Math.max(rx, ery) * 1.35);
      grad.addColorStop(0, rgb(eyeCol.map((v) => v * 0.35 + 0.65), 1));
      grad.addColorStop(0.55, rgb(eyeCol, 1));
      grad.addColorStop(1, rgb(eyeCol.map((v) => v * 0.55 + 0.08), 1));
      lc.fillStyle = grad;
      const rr = mode === "surprised" ? Math.min(rx, ry) : Math.min(rx, ery) * 0.62;
      lc.beginPath();
      lc.roundRect(px - rx, py - ery, 2 * rx, 2 * ery, Math.min(rr, ery));
      lc.fill();

      // Inner LED bezel line matching refine-ai-avatar-visuals
      lc.strokeStyle = rgb(eyeCol.map((v) => v * 0.55 + 0.08), 0.7, 0.55);
      lc.lineWidth = 0.005;
      lc.beginPath();
      lc.roundRect(px - rx + 0.004, py - ery + 0.004, 2 * rx - 0.008, Math.max(0.004, 2 * ery - 0.008), Math.min(rr * 0.9, ery));
      lc.stroke();

      if (mode === "bars") {
        lc.fillStyle = rgb(eyeCol.map((v) => v * 0.35 + 0.65), 0.90);
        for (let k = 0; k < 4; k++) {
          const yBar = py - ry * 0.65 + k * ry * 0.43;
          const wBar = rx * (0.5 + 0.5 * Math.abs(Math.sin(T * 3.1 + k * 1.7 + sd)));
          lc.beginPath();
          lc.roundRect(px - rx * 0.7, yBar - 0.006, wBar * 1.4, 0.012, 0.006);
          lc.fill();
        }
      } else if (mode === "surprised") {
        lc.fillStyle = "rgba(14,18,48,0.90)";
        lc.beginPath();
        lc.arc(px + gx * 0.15, py + gy * 0.15, rx * 0.42 * pupScale, 0, 7);
        lc.fill();
        lc.fillStyle = rgb(eyeCol.map((v) => v * 0.35 + 0.65), 1);
        lc.beginPath();
        lc.arc(px + gx * 0.15, py + gy * 0.15, rx * 0.16, 0, 7);
        lc.fill();
      } else {
        lc.fillStyle = "rgba(255,255,255,0.45)";
        lc.beginPath();
        lc.arc(px + gx * 0.45, py + gy * 0.45 - ery * 0.04, rx * 0.34 * pupScale, 0, 7);
        lc.fill();
      }

      lc.fillStyle = "rgba(255,255,255,0.96)";
      lc.beginPath();
      lc.ellipse(px - 0.34 * rx + gx * 0.18, py + 0.38 * ery + gy * 0.14, 0.24 * rx, Math.min(0.24 * rx, 0.30 * ery), -0.35, 0, 7);
      lc.fill();
      lc.beginPath();
      lc.arc(px + 0.36 * rx + gx * 0.12, py - 0.38 * ery + gy * 0.10, 0.10 * rx, 0, 7);
      lc.fill();

      if (!small) {
        lc.fillStyle = "rgba(0,0,0,0.09)";
        for (let yy = py - ery; yy < py + ery; yy += 0.011) lc.fillRect(px - rx, yy, 2 * rx, 0.003);
      }
      // Subtle top eyelid gradient for depth (matches refine-ai-avatar-visuals)
      const tg = lc.createLinearGradient(0, topY(px), 0, topY(px) - ry * 0.48);
      tg.addColorStop(0, "rgba(8,10,30,0.52)");
      tg.addColorStop(1, "rgba(8,10,30,0)");
      lc.fillStyle = tg;
      lc.fillRect(px - 2 * rx, topY(px) - ry, 4 * rx, ry * 1.15);
      lc.restore();

      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      glow(c, eyeCol, 22);
      c.drawImage(this.lay, 0, 0);
      c.restore();
      if (mode === "ring" && !small) {
        c.save();
        glow(c, eyeCol, 8);
        c.strokeStyle = rgb(eyeCol, 1);
        c.lineWidth = 0.007;
        for (const k of [0, 1]) {
          const ph = (T * 1.6 + k * 0.5) % 1;
          c.globalAlpha = (1 - ph) * 0.8;
          c.beginPath();
          c.arc(px, py, ery * 1.15 + 0.012 + ph * 0.05, sd < 0 ? 0.68 * Math.PI : -0.32 * Math.PI, sd < 0 ? 1.32 * Math.PI : 0.32 * Math.PI);
          c.stroke();
        }
        c.restore();
      }
    };

    const drawRosyCheeks = (alpha = 0.65) => {
      if (small) return;
      for (const s of [-1, 1]) {
        const cx = s * (SPC + 0.068), cy = -0.065;
        const cg = c.createRadialGradient(cx, cy, 0.002, cx, cy, 0.068);
        cg.addColorStop(0, `rgba(255, 118, 152, ${alpha})`);
        cg.addColorStop(1, "rgba(255, 118, 152, 0)");
        c.fillStyle = cg;
        c.beginPath();
        c.ellipse(cx, cy, 0.065, 0.042, 0, 0, 7);
        c.fill();
      }
    };

    const drawBrow = (sd: number, yOff: number, slant: number, thick = 0.013, force = false) => {
      if ((!browOn && !force) || small) return;
      const alpha = force ? 0.94 : Math.max(0.25, Math.min(1, browOn)) * 0.92;
      c.save();
      glow(c, eyeCol, 6 * alpha);
      c.strokeStyle = rgb(eyeCol, alpha);
      c.lineWidth = thick;
      const bx = sd * SPC + gx * 0.92;
      const bOut = sd < 0 ? brows[0] : brows[3];
      const bIn = sd < 0 ? brows[1] : brows[2];
      const sideLift = sd * gx > 0 ? Math.abs(gx) * 0.34 : -Math.abs(gx) * 0.10;
      const by = Math.max(0.068, Math.min(0.195, 0.130 + yOff + gy * 0.85 + sideLift + (bOut + bIn) * 0.40));
      const dynamicSlant = slant + (bOut - bIn) * 0.65 + (sd * gx) * 0.14;
      const arch = 0.011 + Math.max(0, gy) * 0.22 + Math.max(0, sd * gx) * 0.18;
      c.beginPath();
      c.moveTo(bx - 0.043, by - sd * dynamicSlant);
      c.quadraticCurveTo(bx, by + arch, bx + 0.043, by + sd * dynamicSlant);
      c.stroke();
      c.restore();
    };

    const drawLipsyncMouth = (env = 1) => {
      if (small) return;
      const e = Math.max(0, Math.min(1, env));
      const wave = Math.max(0, Math.sin(T * 11.5) * 0.5 + 0.5) * (0.55 + 0.45 * Math.sin(T * 3.1));
      const ryMouth = 0.005 + (0.006 + 0.036 * wave) * e;
      const rxMouth = 0.026 + 0.007 * e;
      c.save();
      glow(c, eyeCol, 10 * (0.4 + 0.6 * e));
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(0, -0.112, rxMouth, ryMouth, 0, 0, 7);
      c.fill();
      if (ryMouth > 0.022) {
        c.shadowBlur = 0;
        c.fillStyle = "#ff7898";
        c.beginPath();
        c.ellipse(0, -0.112 - ryMouth * 0.35, rxMouth * 0.58, ryMouth * 0.36, 0, 0, 7);
        c.fill();
      }
      c.restore();
    };

    const spkEnv = o._speakEnv ?? (o.speaking || faceMode === 12 ? 1 : 0);
    const outIdx = o.outfit ?? 0;

    if (faceMode === 0) {
      const cheekAlpha = outIdx === 17 || outIdx === 16 ? 0.14 : 0.5 + (o.smile || 0) * 0.3;
      drawRosyCheeks(cheekAlpha);
      if ((o.smile || 0) > 0.72) {
        c.save();
        glow(c, eyeCol, 14);
        c.strokeStyle = "#ffffff";
        c.lineWidth = 0.024;
        for (const s of [-1, 1]) {
          c.beginPath();
          c.arc(s * SPC + gx * 0.5, gy * 0.35, 0.064, 0.18 * Math.PI, 0.82 * Math.PI);
          c.stroke();
        }
        c.restore();
      } else if ((Number(o.sleepy) || 0) > 0.7) {
        this.drawSleepyEyes(c, eyeCol, SPC, T, Boolean(small), glow, rgb);
      } else if ((Number(o.wink) || 0) > 0.5) {
        this.drawWinkLeft(c, eyeCol, SPC, gx, gy, glow);
        drawRoundEye(1, 0.066, 0.088, lids[1], 0, 1.05, "normal");
      } else if (outIdx === 17) {
        // Penjaga: firm guardian gaze with lowered stern upper lids
        drawRoundEye(-1, 0.062, 0.082, Math.max(lids[0], 0.26), 0.24, 1.02, "normal");
        drawRoundEye(1, 0.062, 0.082, Math.max(lids[1], 0.26), 0.24, 1.02, "normal");
      } else if (outIdx === 10) {
        // Sutradara: director framing squint (left eye squinting toward camera finder)
        drawRoundEye(-1, 0.060, 0.080, Math.max(lids[0], 0.24), 0.12, 1.0, "normal");
        drawRoundEye(1, 0.068, 0.090, lids[1], 0, 1.08, "normal");
      } else if (outIdx === 16) {
        // Penguji: skeptical test-inspector asymmetric eyes
        drawRoundEye(-1, 0.060, 0.082, Math.max(lids[0], 0.12), 0.08, 1.0, "normal");
        drawRoundEye(1, 0.070, 0.092, lids[1], 0, 1.08, "normal");
      } else if (outIdx === 13) {
        // Keuangan: shrewd calculating half-lidded eyes
        drawRoundEye(-1, 0.064, 0.084, Math.max(lids[0], 0.16), -0.10, 1.04, "normal");
        drawRoundEye(1, 0.064, 0.084, Math.max(lids[1], 0.16), -0.10, 1.04, "normal");
      } else if (outIdx === 5) {
        // Builder: determined blueprint focus
        drawRoundEye(-1, 0.066, 0.086, Math.max(lids[0], 0.10), 0.12, 1.04, "normal");
        drawRoundEye(1, 0.066, 0.086, Math.max(lids[1], 0.10), 0.12, 1.04, "normal");
      } else if (outIdx === 8) {
        // Pekebun: calm tranquil lids
        drawRoundEye(-1, 0.064, 0.082, Math.max(lids[0], 0.12), -0.06, 0.96, "normal");
        drawRoundEye(1, 0.064, 0.082, Math.max(lids[1], 0.12), -0.06, 0.96, "normal");
      } else if (outIdx === 18) {
        // Pemburu Bug: wide radar hunter eyes + subtle ring ping
        drawRoundEye(-1, 0.068, 0.090, lids[0], 0, 1.12, "ring");
        drawRoundEye(1, 0.068, 0.090, lids[1], 0, 1.12, "ring");
      } else {
        drawRoundEye(-1, 0.064, 0.086, lids[0], 0, 1, "normal");
        drawRoundEye(1, 0.062, 0.084, lids[1], 0, 1, "normal");
      }
      const browSlantL = outIdx === 17 ? 0.022 : outIdx === 13 ? -0.010 : 0.006;
      const browSlantR = outIdx === 17 ? 0.022 : outIdx === 16 ? 0.018 : outIdx === 13 ? -0.010 : 0.006;
      drawBrow(-1, 0, browSlantL, 0.011);
      drawBrow(1, outIdx === 16 || outIdx === 10 ? 0.012 : 0, browSlantR, 0.011);
      if (spkEnv > 0.06) {
        drawLipsyncMouth(spkEnv);
      } else if (!small && (o.restMouth ?? true)) {
        c.save();
        glow(c, eyeCol, 8);
        c.strokeStyle = rgb(eyeCol, 0.92);
        c.lineWidth = 0.012;
        c.beginPath();
        if (outIdx === 17 || outIdx === 16) {
          c.moveTo(-0.028, -0.112);
          c.lineTo(0.028, -0.112);
        } else if (outIdx === 13) {
          c.moveTo(-0.024, -0.108);
          c.quadraticCurveTo(0.008, -0.118, 0.028, -0.100);
        } else {
          c.moveTo(-0.026, -0.105);
          c.quadraticCurveTo(0, -0.128 - (o.smile || 0) * 0.018, 0.026, -0.105);
        }
        c.stroke();
        c.restore();
      }
    } else if (faceMode === 1) {
      // Happy
      drawRosyCheeks(0.88);
      c.save();
      glow(c, eyeCol, 14);
      c.strokeStyle = "#ffffff";
      c.lineWidth = small ? 0.030 : 0.024;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(s * SPC + gx * 0.5, gy * 0.45, 0.064, 0.18 * Math.PI, 0.82 * Math.PI);
        c.stroke();
      }
      drawBrow(-1, 0.015, 0.01);
      drawBrow(1, 0.015, 0.01);
      if (!small) {
        c.fillStyle = "#ffffff";
        c.beginPath();
        c.ellipse(0, -0.095, 0.046, 0.048, 0, Math.PI, 2 * Math.PI);
        c.closePath();
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = "#ff7898";
        c.beginPath();
        c.ellipse(0, -0.132, 0.024, 0.015, 0, 0, 7);
        c.fill();
      }
      c.restore();
    } else if (faceMode === 2) {
      // Investigate
      drawRoundEye(-1, 0.062, 0.084, lids[0], 0, 1, "normal");
      drawRoundEye(1, 0.072, 0.094, lids[1], 0, 1.05, "normal");
      drawBrow(-1, 0, 0.004);
      drawBrow(1, 0.022, 0.014);
      if (!small) {
        c.save();
        glow(c, eyeCol, 8);
        c.strokeStyle = rgb(eyeCol, 0.9);
        c.lineWidth = 0.011;
        c.beginPath();
        c.moveTo(-0.022, -0.11);
        c.quadraticCurveTo(0, -0.125, 0.022, -0.11);
        c.stroke();
        c.restore();
      }
    } else if (faceMode === 5) {
      // Surprised (matched to refine-ai-avatar-visuals: full-circle wide golden eyes + high arched brows + O mouth)
      drawRosyCheeks(0.30);
      const pulse = 1.0 - 0.03 * Math.sin(T * 6.0);
      drawRoundEye(-1, 0.082 * pulse, 0.104 * pulse, 0, 0, 0.96, "surprised");
      drawRoundEye(1, 0.082 * pulse, 0.104 * pulse, 0, 0, 0.96, "surprised");
      drawBrow(-1, 0.032 + 0.004 * Math.sin(T * 6.0), 0.008, 0.013, true);
      drawBrow(1, 0.032 + 0.004 * Math.sin(T * 6.0), 0.008, 0.013, true);
      if (!small) {
        c.save();
        glow(c, eyeCol, 10);
        c.fillStyle = rgb(eyeCol.map((v) => v * 0.35 + 0.65), 1);
        c.beginPath();
        c.ellipse(0, -0.122, 0.032, 0.040, 0, 0, 7);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = "rgba(255, 120, 150, 0.92)";
        c.beginPath();
        c.ellipse(0, -0.140, 0.019, 0.014, 0, 0, 7);
        c.fill();
        c.restore();
      }
    } else if (faceMode === 6) {
      // Dizzy spirals
      c.save();
      glow(c, eyeCol, 12);
      c.strokeStyle = rgb(eyeCol, 0.95);
      c.lineWidth = small ? 0.018 : 0.013;
      for (const s of [-1, 1]) {
        const cx = s * SPC, dir = s < 0 ? 1 : -1;
        c.beginPath();
        for (let i = 0; i <= 48; i++) {
          const a = i * 0.34, r = 0.003 * i;
          const px = cx + Math.cos(a * dir + T * 6.5 * dir) * r;
          const py = 0.015 + Math.sin(a * dir + T * 6.5 * dir) * r;
          i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.stroke();
      }
      if (!small) {
        c.lineWidth = 0.012;
        c.beginPath();
        for (let x = -0.045; x <= 0.046; x += 0.006) {
          const y = -0.115 + 0.009 * Math.sin(x * 130 + T * 8);
          x < -0.044 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
      c.restore();
    } else if (faceMode === 7) {
      // Sparkle
      drawRosyCheeks(0.75);
      drawRoundEye(-1, 0.070, 0.094, 0, 0, 1.15, "normal");
      drawRoundEye(1, 0.070, 0.094, 0, 0, 1.15, "normal");
      drawBrow(-1, 0.018, 0.012);
      drawBrow(1, 0.018, 0.012);
      c.save();
      glow(c, eyeCol, 14);
      c.fillStyle = "#fff9dc";
      for (const k of [-1, 1]) {
        const sx = k * 0.255, sy = 0.095, sz = 0.034 * (0.72 + 0.28 * Math.sin(T * 7.5 + k));
        c.beginPath();
        c.moveTo(sx, sy + sz);
        c.quadraticCurveTo(sx, sy, sx + sz, sy);
        c.quadraticCurveTo(sx, sy, sx, sy - sz);
        c.quadraticCurveTo(sx, sy, sx - sz, sy);
        c.quadraticCurveTo(sx, sy, sx, sy + sz);
        c.fill();
      }
      if (!small) {
        c.beginPath();
        c.ellipse(0, -0.095, 0.044, 0.044, 0, Math.PI, 2 * Math.PI);
        c.closePath();
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = "#ff7898";
        c.beginPath();
        c.ellipse(0, -0.128, 0.022, 0.013, 0, 0, 7);
        c.fill();
      }
      c.restore();
    } else if (faceMode === 8) {
      // Wink
      drawRosyCheeks(0.75);
      this.drawWinkLeft(c, eyeCol, SPC, gx, gy, glow);
      drawRoundEye(1, 0.068, 0.090, 0, 0, 1.05, "normal");
      drawBrow(-1, -0.008, -0.012);
      drawBrow(1, 0.018, 0.014);
      if (!small) {
        c.save();
        glow(c, eyeCol, 10);
        c.strokeStyle = "#ffffff";
        c.lineWidth = 0.013;
        c.beginPath();
        c.arc(0.01, -0.09, 0.038, 1.15 * Math.PI, 1.85 * Math.PI);
        c.stroke();
        c.fillStyle = "#ff7898";
        c.beginPath();
        c.ellipse(0.026, -0.128, 0.018, 0.022, -0.25, 0, 7);
        c.fill();
        c.restore();
      }
    } else if (faceMode === 9) {
      // Sleepy
      this.drawSleepyEyes(c, eyeCol, SPC, T, Boolean(small), glow, rgb);
    } else if (faceMode === 10) {
      // Sorry
      drawRoundEye(-1, 0.060, 0.082, 0.08, -0.35, 1.15, "normal");
      drawRoundEye(1, 0.060, 0.082, 0.08, -0.35, 1.15, "normal");
      drawBrow(-1, 0.002, -0.018);
      drawBrow(1, 0.002, -0.018);
      if (!small) {
        c.save();
        glow(c, eyeCol, 8);
        c.strokeStyle = rgb(eyeCol, 0.92);
        c.lineWidth = 0.012;
        c.beginPath();
        for (let x = -0.044; x <= 0.045; x += 0.006) {
          const y = -0.116 + 0.007 * Math.sin(x * 130);
          x < -0.043 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
        const f = (T * 0.65) % 1;
        c.globalAlpha = 1 - f;
        c.fillStyle = "rgba(130, 208, 255, 0.96)";
        c.beginPath();
        c.ellipse(-SPC - 0.018, -0.048 - f * 0.065, 0.014, 0.022, 0, 0, 7);
        c.fill();
        c.restore();
      }
    } else if (faceMode === 11) {
      // Working (exact match to refine-ai-avatar-visuals 2: scrolling data bars + sharp brows + flat LED mouth)
      drawRosyCheeks(0.15);
      const tri = Math.abs(((T * 0.9) % 2) - 1) * 2 - 1;
      const scanX = tri * 0.009, scanY = -0.0033;
      drawRoundEye(-1, 0.070, 0.088, 0.32, 0.315, 1, "bars", scanX, scanY);
      drawRoundEye(1, 0.070, 0.088, 0.32, 0.315, 1, "bars", scanX, scanY);
      drawBrow(-1, 0.0, 0.028, 0.012, true);
      drawBrow(1, 0.0, 0.028, 0.012, true);
      if (!small) {
        c.save();
        glow(c, eyeCol, 10);
        c.strokeStyle = rgb(eyeCol.map((v) => v * 0.35 + 0.65), 1);
        c.lineWidth = 0.012;
        c.beginPath();
        c.moveTo(-0.045, -0.125);
        c.lineTo(0.045, -0.125);
        c.stroke();
        c.restore();
      }
    } else if (faceMode === 12) {
      // Speaking (matched to refine-ai-avatar-visuals: bright engaged eyes + bouncy brows + animated lipsync)
      drawRosyCheeks(0.55);
      const bobY = Math.abs(Math.sin(T * 9.0)) * 0.008;
      drawRoundEye(-1, 0.066, 0.088, 0.03, 0, 1.04, "normal");
      drawRoundEye(1, 0.066, 0.088, 0.03, 0, 1.04, "normal");
      drawBrow(-1, 0.006 + bobY, 0.005, 0.012, true);
      drawBrow(1, 0.006 + bobY, 0.005, 0.012, true);
      drawLipsyncMouth(spkEnv);
    } else if (faceMode === 13) {
      // Listening (exact match to refine-ai-avatar-visuals 2: mint-aqua eyes + sonar ring echoes + attentive brows + small 'o' mouth)
      drawRosyCheeks(0.30);
      drawRoundEye(-1, 0.070, 0.088, 0, 0, 1.06, "ring");
      drawRoundEye(1, 0.070, 0.088, 0, 0, 1.06, "ring");
      drawBrow(-1, 0.014, -0.006, 0.012, true);
      drawBrow(1, 0.014, -0.006, 0.012, true);
      if (!small) {
        c.save();
        glow(c, eyeCol, 10);
        c.fillStyle = rgb(eyeCol.map((v) => v * 0.35 + 0.65), 1);
        c.beginPath();
        c.ellipse(0, -0.129, 0.013, 0.013 * 1.15, 0, 0, 7);
        c.fill();
        c.restore();
      }
    }
  }

  drawWinkLeft(
    c: CanvasRenderingContext2D,
    eyeCol: RgbTriplet,
    SPC: number,
    gx: number,
    gy: number,
    glow: (ctx: CanvasRenderingContext2D, col: RgbTriplet, blur: number) => void
  ) {
    c.save();
    glow(c, eyeCol, 12);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 0.022;
    const lx = -SPC + gx * 0.5;
    const ly = gy * 0.35;
    c.beginPath();
    c.moveTo(lx - 0.048, 0.052 + ly);
    c.lineTo(lx + 0.04, 0.018 + ly);
    c.lineTo(lx - 0.048, -0.016 + ly);
    c.stroke();
    c.restore();
  }

  drawSleepyEyes(
    c: CanvasRenderingContext2D,
    eyeCol: RgbTriplet,
    SPC: number,
    T: number,
    small: boolean,
    glow: (ctx: CanvasRenderingContext2D, col: RgbTriplet, blur: number) => void,
    rgb: (col: RgbTriplet, alpha?: number) => string
  ) {
    c.save();
    glow(c, eyeCol, 10);
    c.strokeStyle = rgb(eyeCol, 0.88);
    c.lineWidth = small ? 0.026 : 0.020;
    for (const s of [-1, 1]) {
      const cx = s * SPC;
      c.beginPath();
      c.arc(cx, 0.045, 0.060, 1.18 * Math.PI, 1.82 * Math.PI);
      c.stroke();
      if (!small) {
        c.lineWidth = 0.009;
        for (let j = -1; j <= 1; j++) {
          const ang = -Math.PI * 0.5 + j * 0.45;
          c.beginPath();
          c.moveTo(cx + Math.cos(ang) * 0.06, 0.045 + Math.sin(ang) * 0.06);
          c.lineTo(cx + Math.cos(ang) * 0.078, 0.045 + Math.sin(ang) * 0.078);
          c.stroke();
        }
        c.lineWidth = 0.020;
      }
    }
    if (!small) {
      c.lineWidth = 0.009;
      for (let k = 0; k < 2; k++) {
        const u = (T * 0.35 + k * 0.5) % 1;
        const x = 0.24 + u * 0.055 + k * 0.025, y = 0.04 + u * 0.11, z = 0.018 + k * 0.009;
        c.globalAlpha = Math.sin(Math.PI * u) * 0.9;
        c.beginPath();
        c.moveTo(x - z, y + z);
        c.lineTo(x + z, y + z);
        c.lineTo(x - z, y - z);
        c.lineTo(x + z, y - z);
        c.stroke();
      }
      c.globalAlpha = 0.8;
      c.fillStyle = rgb(eyeCol, 0.85);
      c.beginPath();
      c.ellipse(0, -0.11, 0.012, 0.014, 0, 0, 7);
      c.fill();
    }
    c.restore();
  }

  drawOffline404(c: CanvasRenderingContext2D, T: number) {
    c.save();
    c.fillStyle = "rgba(10, 12, 22, 0.95)";
    c.fillRect(0, 0, FW, FH);
    c.fillStyle = "rgba(255, 255, 255, 0.035)";
    for (let y = 0; y < FH; y += 6) c.fillRect(0, y, FW, 2);

    const glitchTick = Math.sin(T * 2.4) > 0.92 ? Math.sin(T * 43) * 6 : 0;
    const pulse = 0.84 + 0.16 * Math.sin(T * 2.6);
    const colMain = `rgba(255, 108, 128, ${pulse})`;

    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = colMain;
    c.shadowBlur = 20;
    c.fillStyle = colMain;
    c.font = "800 84px ui-monospace, SFMono-Regular, Menlo, monospace";
    c.fillText("404", FW * 0.5 + glitchTick, FH * 0.41);

    c.shadowBlur = 8;
    c.fillStyle = "rgba(255, 198, 206, 0.92)";
    c.font = "700 32px ui-monospace, SFMono-Regular, Menlo, monospace";
    c.fillText("ERROR", FW * 0.5 - glitchTick * 0.5, FH * 0.67);

    c.shadowBlur = 0;
    c.strokeStyle = "rgba(255, 108, 128, 0.34)";
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(86, 56, FW - 172, FH - 112, 26);
    c.stroke();
    c.restore();
  }
}

const BLIT_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uOutRes;
uniform vec2 uTexel;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uOutRes;
  vec2 o = uTexel * 0.72;
  vec4 c = texture(uSrc, uv) * 0.28;
  c += (texture(uSrc, uv + vec2(-o.x,  0.0)) + texture(uSrc, uv + vec2(o.x, 0.0))
      + texture(uSrc, uv + vec2( 0.0, -o.y)) + texture(uSrc, uv + vec2(0.0, o.y))) * 0.12;
  c += (texture(uSrc, uv + vec2(-o.x, -o.y)) + texture(uSrc, uv + vec2( o.x, -o.y))
      + texture(uSrc, uv + vec2(-o.x,  o.y)) + texture(uSrc, uv + vec2( o.x,  o.y))) * 0.06;
  outColor = c;
}`;

export function createVisorRenderer(): VisorRenderer {
  const cv = document.createElement("canvas");
  const rawGl = cv.getContext("webgl2", {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!rawGl) throw new Error("WebGL2 unavailable");
  const gl: WebGL2RenderingContext = rawGl;

  const info: VisorRendererInfo = { lost: false, gpu: "unknown", software: false, compileMs: 0, parallel: false, ready: [0], renderer: "visor-v2" };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  if (dbg) info.gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "unknown";
  info.software = /swiftshader|basic render|llvmpipe|software/i.test(info.gpu);
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

  const face = new VisorFaceCanvas();
  let prog: WebGLProgram | null = null, blitProg: WebGLProgram | null = null;
  let U: Record<string, WebGLUniformLocation | null> = {}, UB: Record<string, WebGLUniformLocation | null> = {};
  let tex: WebGLTexture | null = null, vao: WebGLVertexArrayObject | null = null, vbo: WebGLBuffer | null = null;
  let texB: WebGLTexture | null = null, texIdx = 0;
  let fbo: WebGLFramebuffer | null = null, fboTex: WebGLTexture | null = null, fboW = 0, fboH = 0;
  let texReady = false;

  function buildGL() {
    const t0 = performance.now();
    face.lastFaceSig = "";
    texReady = false;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh) || "Shader compile error";
        gl.deleteShader(sh);
        throw new Error(log);
      }
      return sh;
    };
    const linkProg = (fs: string) => {
      const vs = compile(gl.VERTEX_SHADER, VS_SRC);
      const fp = compile(gl.FRAGMENT_SHADER, fs);
      const p = gl.createProgram()!;
      gl.attachShader(p, vs);
      gl.attachShader(p, fp);
      gl.bindAttribLocation(p, 0, "p");
      gl.linkProgram(p);
      gl.detachShader(p, vs);
      gl.detachShader(p, fp);
      gl.deleteShader(vs);
      gl.deleteShader(fp);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(p) || "Program link error";
        gl.deleteProgram(p);
        throw new Error(log);
      }
      return p;
    };

    prog = linkProg(FS_SRC);
    blitProg = linkProg(BLIT_FS);
    gl.useProgram(prog);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    U = {};
    const names = [
      "uRes", "uSq", "uOff", "cLight", "cBase", "cShade", "cDeep",
      "uPA", "uPB", "uPC", "uAnt", "uLegL", "uLegR", "uDyn", "uTime", "uYaw", "uPitch", "uRoll",
      "uHatTilt", "uLift", "uDead", "uDarkFloor", "uLeaf", "uGlow", "uSmall", "uBug", "uFall", "uGlassY", "uArmL", "uArmR",
      "uHover", "uPoke", "uSpk", "uZoom", "uOutfit", "uMode", "uFace",
    ];
    for (const k of names) U[k] = gl.getUniformLocation(prog, k);
    UB = {
      uSrc: gl.getUniformLocation(blitProg, "uSrc"),
      uOutRes: gl.getUniformLocation(blitProg, "uOutRes"),
      uTexel: gl.getUniformLocation(blitProg, "uTexel"),
    };

    tex = gl.createTexture();
    texB = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    for (const t of [tex, texB]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FW, FH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fboW = fboH = 0;

    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    info.compileMs = Math.round(performance.now() - t0);
  }

  buildGL();
  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); info.lost = true; });
  cv.addEventListener("webglcontextrestored", () => { buildGL(); info.lost = false; });

  const animStates = new WeakMap<HTMLCanvasElement, AnimState>();
  const stepSpring = (val: number, vel: number, target: number, K: number, C: number, dt: number): [number, number] => {
    const sub = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / sub;
    for (let k = 0; k < sub; k++) {
      vel += ((target - val) * K - vel * C) * h;
      val += vel * h;
    }
    return [val, vel];
  };

  function draw(targetCanvas: HTMLCanvasElement | null, size: number, opts: VisorDrawOptions = {}): HTMLCanvasElement {
    if (info.lost || gl.isContextLost()) return info.lost = true, cv;
    const px = Math.max(8, Math.round(size));
    // Enable GPU supersampling across small, medium, and Retina Home hero sizes (e.g. 536px -> 804px internal FBO)
    const ss = !info.software
      ? (px <= 320 && px * 2 <= maxTex ? 2 : px <= 680 && Math.round(px * 1.5) <= maxTex ? 1.5 : 1)
      : 1;
    const rq = Math.max(0.5, Math.min(1, opts.quality ?? 1));
    const rpx = Math.min(maxTex, Math.max(8, Math.round(px * ss * rq)));
    const outfit = opts.outfit ?? 0;
    const deadMix = outfit === 4 ? 1.0 : Math.max(0, Math.min(1, opts.dead || 0));
    const T = opts.time || 0;
    const faceMode = opts.face ?? (outfit === 1 || outfit === 6 ? 1 : outfit === 2 ? 2 : 0);

    // Derive target 3D arm angles from pose, then integrate through a second-order spring
    let tgtArmL = 0.62 + Math.sin(T * 1.6) * 0.07;
    let tgtArmR = 0.62 + Math.sin(T * 1.6 + 1.3) * 0.07;
    if (deadMix > 0.35) {
      tgtArmL = 0.48;
      tgtArmR = 0.48;
    } else if (opts.working || faceMode === 11) {
      tgtArmL = 0.78 + Math.sin(T * 14.0) * 0.36;
      tgtArmR = 0.78 - Math.sin(T * 14.0) * 0.36;
    } else if (opts.speaking || faceMode === 12) {
      tgtArmL = 0.58 + Math.sin(T * 2.4) * 0.08;
      tgtArmR = 1.08 + Math.sin(T * 5.2) * 0.44;
    } else if (faceMode === 1 || faceMode === 7) {
      tgtArmL = 1.88 + Math.sin(T * 8.0) * 0.22;
      tgtArmR = 1.88 - Math.sin(T * 8.0) * 0.22;
    } else if (faceMode === 5) {
      tgtArmL = 1.95;
      tgtArmR = 1.95;
    } else if (faceMode === 8) {
      tgtArmR = 1.85 + Math.sin(T * 6.5) * 0.24;
    } else if (faceMode === 13) {
      tgtArmL = 2.05 + Math.sin(T * 3.0) * 0.08;
    } else if (faceMode === 9 || faceMode === 10 || faceMode === 6) {
      tgtArmL = 0.50;
      tgtArmR = 0.50;
    } else if (outfit === 9) {
      tgtArmL = 1.05 + Math.sin(T * 2.1) * 0.12;
    }
    if (typeof opts.armL === "number") tgtArmL = opts.armL;
    if (typeof opts.armR === "number") tgtArmR = opts.armR;
    // Clamp prop-holding arms cleanly so brush (Desainer=9), camera (Sutradara=10) & shield (Penjaga=17) never collide
    if (outfit === 9) tgtArmL = Math.min(tgtArmL, 1.45);
    if (outfit === 10) tgtArmR = Math.min(tgtArmR, 0.75);
    if (outfit === 17) tgtArmL = Math.min(tgtArmL, 0.75);

    const tgtSpeak = opts.speaking || faceMode === 12 ? 1 : 0;
    const tgtHover = Math.max(0, Math.min(1, opts.hover || 0));
    const pokeVal = Math.max(0, Math.min(1, opts.poke || 0));
    const curYaw = opts.yaw || 0;
    const curRoll = opts.roll || 0;
    const curLift = opts.lift || 0;
    const curSq = opts.squash || 0;
    let armL = tgtArmL, armR = tgtArmR, speakEnv = tgtSpeak, hoverEnv = tgtHover;
    let packBob = 0, packSway = 0, packTwist = 0, tagSwing = 0;
    if (!opts.small && opts.time != null) {
      const key = targetCanvas || cv;
      let st = animStates.get(key);
      if (!st) {
        st = {
          armL: tgtArmL, armLV: 0, armR: tgtArmR, armRV: 0,
          speakEnv: tgtSpeak, hoverEnv: tgtHover, t: T,
          pYaw: curYaw, pRoll: curRoll, pLift: curLift, pSq: curSq, pPoke: pokeVal,
          packBob: 0, packBobV: 0, packSway: 0, packSwayV: 0,
          packTwist: 0, packTwistV: 0, tagSwing: 0, tagSwingV: 0,
        };
        animStates.set(key, st);
      } else {
        const dt = Math.min(0.05, Math.max(0.001, T - st.t));
        st.t = T;
        if (typeof opts.armL === "number") {
          st.armL = opts.armL;
          st.armLV = 0;
        } else {
          [st.armL, st.armLV] = stepSpring(st.armL, st.armLV, tgtArmL, 260, 26, dt);
        }
        if (typeof opts.armR === "number") {
          st.armR = opts.armR;
          st.armRV = 0;
        } else {
          [st.armR, st.armRV] = stepSpring(st.armR, st.armRV, tgtArmR, 260, 26, dt);
        }
        st.speakEnv += (tgtSpeak - st.speakEnv) * (1 - Math.exp(-dt * 12));
        st.hoverEnv += (tgtHover - st.hoverEnv) * (1 - Math.exp(-dt * 10));

        // 2nd-order inertial spring physics for backpack, hat brim, & dangling luggage tag
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
        const vYaw = clamp((curYaw - st.pYaw) / dt, -7, 7);
        const vRoll = clamp((curRoll - st.pRoll) / dt, -5, 5);
        const vLift = clamp((curLift - st.pLift) / dt, -5, 5);
        const vSq = clamp((curSq - st.pSq) / dt, -6, 6);
        if (pokeVal > st.pPoke + 0.25) {
          st.packBobV -= 1.8;
          st.tagSwingV += (curRoll >= 0 ? 1 : -1) * 4.5;
        }
        st.pYaw = curYaw;
        st.pRoll = curRoll;
        st.pLift = curLift;
        st.pSq = curSq;
        st.pPoke = pokeVal;

        const tgtBob = clamp(-vLift * 0.28 + vSq * 0.14 - Math.abs(curSq) * 0.12 - pokeVal * 0.14, -0.32, 0.32);
        const tgtSway = clamp(curRoll * 0.85 - vRoll * 0.12 + vYaw * 0.10, -0.35, 0.35);
        const tgtTwist = clamp(-vYaw * 0.16, -0.40, 0.40);
        const tgtTag = clamp(curRoll * 1.4 + st.packSway * 1.2 - vYaw * 0.24 - vRoll * 0.18 + Math.sin(T * 2.1) * 0.06, -0.75, 0.75);

        [st.packBob, st.packBobV] = stepSpring(st.packBob, st.packBobV, tgtBob, 145, 7.8, dt);
        [st.packSway, st.packSwayV] = stepSpring(st.packSway, st.packSwayV, tgtSway, 115, 6.8, dt);
        [st.packTwist, st.packTwistV] = stepSpring(st.packTwist, st.packTwistV, tgtTwist, 130, 7.4, dt);
        [st.tagSwing, st.tagSwingV] = stepSpring(st.tagSwing, st.tagSwingV, tgtTag, 210, 4.6, dt);
      }
      armL = st.armL;
      armR = st.armR;
      speakEnv = st.speakEnv;
      hoverEnv = st.hoverEnv;
      packBob = Math.max(-0.35, Math.min(0.35, st.packBob));
      packSway = Math.max(-0.38, Math.min(0.38, st.packSway));
      packTwist = Math.max(-0.42, Math.min(0.42, st.packTwist));
      tagSwing = Math.max(-0.80, Math.min(0.80, st.tagSwing));
    }
    const shaderMode = deadMix > 0.35 ? 4 : (opts.working || faceMode === 11) ? 11 : (opts.speaking || faceMode === 12) ? 12 : faceMode;

    // Resolve palette from either explicit opts.colors OR string opts.palette (for thumbnails & chat badges!)
    const srcPal = Array.isArray(opts.colors) && opts.colors.length === 4
      ? opts.colors
      : (opts.palette && RESOLVED_PALETTES[opts.palette]) || DEFAULT_PAL;
    const pal = deadMix > 0.001
      ? srcPal.map((row, r) => row.map((v, c) => v + (ASH_PAL[r][c] - v) * deadMix))
      : srcPal;

    const acc = OUTFIT_ACC[outfit] || OUTFIT_ACC[0];
    const sq = opts.squash || 0;
    const sx = 1.0 + 0.05 * sq + 0.08 * deadMix;
    const sy = 1.0 - 0.09 * sq - 0.14 * deadMix;

    const faceDirty = face.draw({ ...opts, _speakEnv: speakEnv });

    if (cv.width !== px || cv.height !== px) {
      cv.width = px;
      cv.height = px;
    }

    gl.bindVertexArray(vao);

    if (rpx !== px) {
      if (fboW !== rpx || fboH !== rpx) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, rpx, rpx, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        fboW = rpx;
        fboH = rpx;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.useProgram(prog);
    gl.viewport(0, 0, rpx, rpx);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    if (faceDirty || !texReady) {
      texIdx = 1 - texIdx;
      gl.bindTexture(gl.TEXTURE_2D, texIdx ? texB : tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, face.canvas);
      texReady = true;
    } else {
      gl.bindTexture(gl.TEXTURE_2D, texIdx ? texB : tex);
    }
    gl.uniform1i(U.uFace, 0);

    gl.uniform2f(U.uRes, rpx, rpx);
    gl.uniform2f(U.uSq, sx, sy);
    gl.uniform3f(U.uOff, 0, (opts.lift || 0) - deadMix * 0.04, 0);
    gl.uniform3fv(U.cLight, pal[0]);
    gl.uniform3fv(U.cBase, pal[1]);
    gl.uniform3fv(U.cShade, pal[2]);
    gl.uniform3fv(U.cDeep, pal[3]);
    gl.uniform3fv(U.uPA, acc[0]);
    gl.uniform3fv(U.uPB, acc[1]);
    gl.uniform3fv(U.uPC, acc[2]);
    gl.uniform3fv(U.uAnt, opts.ant || [1, 0, 0]);
    gl.uniform3fv(U.uLegL, opts.legL || [0, 0, 0]);
    gl.uniform3fv(U.uLegR, opts.legR || [0, 0, 0]);
    gl.uniform4f(U.uDyn, packBob, packSway, packTwist, tagSwing);
    gl.uniform1f(U.uTime, opts.time || 0);
    gl.uniform1f(U.uYaw, opts.yaw || 0);
    gl.uniform1f(U.uPitch, opts.pitch || 0);
    gl.uniform1f(U.uRoll, (opts.roll || 0) - 0.14 * deadMix);
    gl.uniform1f(U.uHatTilt, opts.hatTilt || 0);
    gl.uniform1f(U.uLift, opts.lift || 0);
    gl.uniform1f(U.uDead, deadMix);
    gl.uniform1f(U.uDarkFloor, opts.darkFloor || 0);
    gl.uniform1f(U.uLeaf, opts.leaf ?? 0.5);
    gl.uniform1f(U.uGlow, opts.glow || 0);
    gl.uniform1f(U.uSmall, opts.small ? 1 : 0);
    gl.uniform1f(U.uBug, opts.bug ?? 1);
    gl.uniform1f(U.uFall, opts.fall || 0);
    gl.uniform1f(U.uGlassY, opts.glassY || 0);
    gl.uniform1f(U.uArmL, armL);
    gl.uniform1f(U.uArmR, armR);
    gl.uniform1f(U.uHover, hoverEnv);
    gl.uniform1f(U.uPoke, pokeVal);
    gl.uniform1f(U.uSpk, speakEnv);
    gl.uniform1f(U.uZoom, opts.zoom ?? 1);
    gl.uniform1i(U.uOutfit, outfit);
    gl.uniform1i(U.uMode, shaderMode);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (rpx !== px) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, px, px);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(blitProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fboTex);
      gl.uniform1i(UB.uSrc, 0);
      gl.uniform2f(UB.uOutRes, px, px);
      gl.uniform2f(UB.uTexel, 1 / rpx, 1 / rpx);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (targetCanvas && targetCanvas !== cv) {
      const ctx2d = targetCanvas.getContext("2d");
      if (ctx2d) {
        ctx2d.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx2d.imageSmoothingQuality = "high";
        ctx2d.drawImage(cv, 0, 0, targetCanvas.width, targetCanvas.height);
      }
    }
    return cv;
  }

  return {
    draw,
    drawAsync: (t: HTMLCanvasElement | null, s: number, o?: VisorDrawOptions) => Promise.resolve(draw(t, s, o)),
    canvas: cv,
    gl,
    info,
    isReady: () => !info.lost,
    faceReady: () => true,
    preload: () => {},
  };
}


export function createCanvas2DFallback(): VisorRenderer {
  const cv = document.createElement("canvas");
  const info: VisorRendererInfo = {
    lost: false,
    gpu: "Canvas 2D fallback",
    software: true,
    compileMs: 0,
    parallel: false,
    ready: [0],
    renderer: "canvas",
  };
  function draw(targetCanvas: HTMLCanvasElement | null, size: number, opts: VisorDrawOptions = {}): HTMLCanvasElement {
    const px = Math.max(8, Math.round(size));
    const canvas = targetCanvas || cv;
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.clearRect(0, 0, px, px);
    const pal = Array.isArray(opts.colors) && opts.colors.length === 4
      ? opts.colors
      : (opts.palette && RESOLVED_PALETTES[opts.palette]) || DEFAULT_PAL;
    const toCss = (c: RgbTriplet) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
    const cx = px * 0.5;
    const cy = px * 0.56;
    const r = px * 0.28;
    const grad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.35, r * 0.1, cx, cy, r * 1.1);
    grad.addColorStop(0, toCss(pal[0]));
    grad.addColorStop(0.55, toCss(pal[1]));
    grad.addColorStop(1, toCss(pal[2]));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.04, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = "#121622";
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.68, cy - r * 0.38, r * 1.36, r * 0.68, r * 0.28);
    ctx.fill();
    // Eyes
    ctx.fillStyle = opts.dead && opts.dead > 0.35 ? "#ff687c" : "#bdf4ff";
    const eyeY = cy - r * 0.04;
    const eyeH = Math.max(2, r * 0.16 * (1 - (opts.blink || 0)));
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.26, eyeY, r * 0.11, eyeH, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.26, eyeY, r * 0.11, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }
  return {
    draw,
    drawAsync: (t, s, o) => Promise.resolve(draw(t, s, o)),
    canvas: cv,
    gl: null,
    info,
    isReady: () => true,
    faceReady: () => true,
    preload: () => {},
  };
}

export function createSafeVisorRenderer(): VisorRenderer {
  try {
    return createVisorRenderer();
  } catch {
    return createCanvas2DFallback();
  }
}
