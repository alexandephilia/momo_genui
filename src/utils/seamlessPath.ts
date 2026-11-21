export interface SeamlessPathGeometry {
  fullPath: string;
  topSpecularPath: string;
  tongueCrownPath: string;
  bottomHorizonPath: string;
  /** Outset path in padded coordinates (pad = 14px) for 1.3px crisp illuminated rim */
  rimOutsetPath: string;
  /** Outset path in padded coordinates (pad = 14px) for tight 2.4px slight-blur micro-aura */
  auraOutsetPath: string;
  outsetPad: number;
  tongueCenterX: number;
  plateauLeft: number;
  plateauWidth: number;
  tongueLeftX: number;
  tongueRightX: number;
  crownStart: number;
  crownEnd: number;
  minLeft: number;
  centerLeft: number;
  totalHeight: number;
}

function createContourPaths(params: {
  xLeft: number;
  xRight: number;
  yTongue: number;
  yDeck: number;
  yBottom: number;
  x0: number;
  x1: number;
  x2: number;
  x3: number;
  R: number;
  k: number;
}) {
  const { xLeft, xRight, yTongue, yDeck, yBottom, x0, x1, x2, x3, R, k } =
    params;
  const f = (n: number) => n.toFixed(2);

  const upperContour = [
    `M ${f(xLeft)} ${f(yDeck + R)}`,
    `A ${f(R)} ${f(R)} 0 0 1 ${f(xLeft + R)} ${f(yDeck)}`,
    `L ${f(x0)} ${f(yDeck)}`,
    `C ${f(x0 + k)} ${f(yDeck)}, ${f(x1 - k)} ${f(yTongue)}, ${f(x1)} ${f(yTongue)}`,
    `L ${f(x2)} ${f(yTongue)}`,
    `C ${f(x2 + k)} ${f(yTongue)}, ${f(x3 - k)} ${f(yDeck)}, ${f(x3)} ${f(yDeck)}`,
    `L ${f(xRight - R)} ${f(yDeck)}`,
    `A ${f(R)} ${f(R)} 0 0 1 ${f(xRight)} ${f(yDeck + R)}`,
  ].join(" ");

  const fullPath = [
    upperContour,
    `L ${f(xRight)} ${f(yBottom - R)}`,
    `A ${f(R)} ${f(R)} 0 0 1 ${f(xRight - R)} ${f(yBottom)}`,
    `L ${f(xLeft + R)} ${f(yBottom)}`,
    `A ${f(R)} ${f(R)} 0 0 1 ${f(xLeft)} ${f(yBottom - R)}`,
    "Z",
  ].join(" ");

  return { upperContour, fullPath };
}

/**
 * Exact continuous closed SVG silhouette from animated-glowing-composer-designs
 * with dynamic horizontal plateau glide (`tabLeft`), liquid S-curve shoulders (`k = 0.54 * S`),
 * plus concentric outset paths (`rimOutsetPath`, `auraOutsetPath`) inside a padded canvas
 * so slight-blur micro-aura never gets clipped along the crest top edge.
 */
export function buildSeamlessComposerPath(params: {
  width: number;
  bodyHeight: number;
  tabHeight?: number;
  tabLeft?: number;
  tabWidth: number;
  cornerRadius?: number;
  shoulderWidth?: number;
}): SeamlessPathGeometry {
  const w = Math.max(260, params.width);
  const h = Math.max(48, params.bodyHeight);
  const T = params.tabHeight ?? 20;
  const S = params.shoulderWidth ?? 24;
  const R = Math.max(12, Math.min(params.cornerRadius ?? 19, h / 2 - 1));

  const minLeft = Math.max(R + S + 6, 48);
  const maxWidth = Math.max(48, w - minLeft - R - S - 6);
  const plateauWidth = Math.min(Math.max(48, params.tabWidth), maxWidth);
  const maxLeft = Math.max(minLeft, w - plateauWidth - R - S - 8);
  const centerLeft = Math.max(
    minLeft,
    Math.min(maxLeft, Math.round((w - plateauWidth) * 0.5))
  );

  const L = Math.max(minLeft, Math.min(maxLeft, params.tabLeft ?? minLeft));
  const R_tab = L + plateauWidth;

  const x0 = L - S;
  const x1 = L;
  const x2 = R_tab;
  const x3 = R_tab + S;

  const k = S * 0.54;
  const f = (n: number) => n.toFixed(2);

  const base = createContourPaths({
    xLeft: 0,
    xRight: w,
    yTongue: 0,
    yDeck: T,
    yBottom: T + h,
    x0,
    x1,
    x2,
    x3,
    R,
    k,
  });

  // Padded coordinate space (pad = 14px) prevents blur(3.8px) clipping along crest top
  const pad = 14;
  const buildOutset = (d: number) =>
    createContourPaths({
      xLeft: pad - d,
      xRight: pad + w + d,
      yTongue: pad - d,
      yDeck: pad + T - d,
      yBottom: pad + T + h + d,
      x0: pad + x0 - d * 0.65,
      x1: pad + x1 - d * 0.65,
      x2: pad + x2 + d * 0.65,
      x3: pad + x3 + d * 0.65,
      R: R + d,
      k,
    }).fullPath;

  const crownStart = Math.max(R, x0 - 30);
  const crownEnd = Math.min(w - R, x3 + 30);
  const tongueCrownPath = [
    `M ${f(crownStart)} ${f(T)}`,
    `L ${f(x0)} ${f(T)}`,
    `C ${f(x0 + k)} ${f(T)}, ${f(x1 - k)} 0, ${f(x1)} 0`,
    `L ${f(x2)} 0`,
    `C ${f(x2 + k)} 0, ${f(x3 - k)} ${f(T)}, ${f(x3)} ${f(T)}`,
    `L ${f(crownEnd)} ${f(T)}`,
  ].join(" ");

  const bottomHorizonPath = [
    `M ${f(w)} ${f(T + h - R)}`,
    `A ${f(R)} ${f(R)} 0 0 1 ${f(w - R)} ${f(T + h)}`,
    `L ${f(R)} ${f(T + h)}`,
    `A ${f(R)} ${f(R)} 0 0 1 0 ${f(T + h - R)}`,
  ].join(" ");

  return {
    fullPath: base.fullPath,
    topSpecularPath: base.upperContour,
    tongueCrownPath,
    bottomHorizonPath,
    rimOutsetPath: buildOutset(1.3),
    auraOutsetPath: buildOutset(2.4),
    outsetPad: pad,
    tongueCenterX: (x1 + x2) / 2,
    plateauLeft: x1,
    plateauWidth,
    tongueLeftX: x0,
    tongueRightX: x3,
    crownStart,
    crownEnd,
    minLeft,
    centerLeft,
    totalHeight: T + h,
  };
}
