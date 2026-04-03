// Triangle Solver
// Solves triangles given 3 known values (sides a, b, c and angles A, B, C)
// Angles are in degrees. Angle A is opposite side a, etc.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function toDeg(r) { return r * RAD; }
function toRad(d) { return d * DEG; }

/**
 * Solve a triangle given known values.
 * @param {object} input - { a, b, c, A, B, C } where missing values are null/undefined/''
 * @returns {object} { a, b, c, A, B, C, area, perimeter, case } or { error }
 */
export function solveTriangle(input) {
  let a = parseVal(input.a);
  let b = parseVal(input.b);
  let c = parseVal(input.c);
  let A = parseVal(input.A);
  let B = parseVal(input.B);
  let C = parseVal(input.C);

  const sides = [a, b, c].filter(v => v !== null);
  const angles = [A, B, C].filter(v => v !== null);

  if (sides.length + angles.length !== 3) {
    return { error: 'Please enter exactly 3 known values.' };
  }

  for (const v of [...sides, ...angles]) {
    if (v <= 0) return { error: 'All values must be positive numbers.' };
  }

  for (const v of angles) {
    if (v >= 180) return { error: 'Each angle must be less than 180\u00B0.' };
  }

  if (angles.length >= 2) {
    const sum = (A || 0) + (B || 0) + (C || 0);
    if (sum >= 180) return { error: 'Angles must sum to less than 180\u00B0.' };
  }

  let result;
  try {
    if (sides.length === 3) {
      result = solveSSS(a, b, c);
    } else if (sides.length === 2 && angles.length === 1) {
      result = solveTwoSidesOneAngle(a, b, c, A, B, C);
    } else if (sides.length === 1 && angles.length === 2) {
      result = solveOneSideTwoAngles(a, b, c, A, B, C);
    } else {
      return { error: 'Three angles alone cannot determine a unique triangle. Provide at least one side.' };
    }
  } catch (e) {
    return { error: e.message };
  }

  if (!result) return { error: 'Could not solve triangle.' };

  const { a: ra, b: rb, c: rc, A: rA, B: rB, C: rC } = result;
  if ([ra, rb, rc, rA, rB, rC].some(v => isNaN(v) || !isFinite(v) || v <= 0)) {
    return { error: 'No valid triangle exists with these values.' };
  }
  if (Math.abs(rA + rB + rC - 180) > 0.5) {
    return { error: 'No valid triangle exists with these values.' };
  }

  const perimeter = ra + rb + rc;
  const s = perimeter / 2;
  const areaSquared = s * (s - ra) * (s - rb) * (s - rc);
  if (areaSquared <= 0) return { error: 'No valid triangle exists with these values.' };

  return {
    a: round(ra),
    b: round(rb),
    c: round(rc),
    A: round(rA),
    B: round(rB),
    C: round(rC),
    area: round(Math.sqrt(areaSquared)),
    perimeter: round(perimeter),
    case: result.case,
    note: result.note || null,
  };
}

function parseVal(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function round(v) {
  return Math.round(v * 10000) / 10000;
}

function solveSSS(a, b, c) {
  if (a + b <= c || a + c <= b || b + c <= a) {
    throw new Error('These sides violate the triangle inequality.');
  }
  const A = toDeg(Math.acos(clampCos((b * b + c * c - a * a) / (2 * b * c))));
  const B = toDeg(Math.acos(clampCos((a * a + c * c - b * b) / (2 * a * c))));
  const C = 180 - A - B;
  return { a, b, c, A, B, C, case: 'SSS' };
}

function solveSAS(s1, s2, includedAngleDeg, missingLabel) {
  const gamma = toRad(includedAngleDeg);
  const missingSq = s1 * s1 + s2 * s2 - 2 * s1 * s2 * Math.cos(gamma);
  if (missingSq <= 0) throw new Error('No valid triangle exists with these values.');
  const missing = Math.sqrt(missingSq);

  let a, b, c;
  if (missingLabel === 'a') { a = missing; b = s1; c = s2; }
  else if (missingLabel === 'b') { a = s1; b = missing; c = s2; }
  else { a = s1; b = s2; c = missing; }

  const A = toDeg(Math.acos(clampCos((b * b + c * c - a * a) / (2 * b * c))));
  const B = toDeg(Math.acos(clampCos((a * a + c * c - b * b) / (2 * a * c))));
  const C = 180 - A - B;

  return { a, b, c, A, B, C, case: 'SAS' };
}

function solveSSA(knownSide, otherSide, knownAngleDeg, knownSideLabel, otherSideLabel) {
  const knownAngleRad = toRad(knownAngleDeg);
  const sinOther = otherSide * Math.sin(knownAngleRad) / knownSide;

  if (sinOther > 1 + 1e-10) {
    throw new Error('No valid triangle exists with these values.');
  }

  const otherAngleDeg = toDeg(Math.asin(Math.min(sinOther, 1)));
  const thirdAngleDeg = 180 - knownAngleDeg - otherAngleDeg;

  if (thirdAngleDeg <= 0) {
    throw new Error('No valid triangle exists with these values.');
  }

  const thirdSide = knownSide * Math.sin(toRad(thirdAngleDeg)) / Math.sin(knownAngleRad);

  const labels = ['a', 'b', 'c'];
  const thirdLabel = labels.find(l => l !== knownSideLabel && l !== otherSideLabel);
  const angleMap = { a: 'A', b: 'B', c: 'C' };

  const result = { case: 'SSA' };
  result[knownSideLabel] = knownSide;
  result[otherSideLabel] = otherSide;
  result[thirdLabel] = thirdSide;
  result[angleMap[knownSideLabel]] = knownAngleDeg;
  result[angleMap[otherSideLabel]] = otherAngleDeg;
  result[angleMap[thirdLabel]] = thirdAngleDeg;

  // Check for ambiguous case
  const obtuseOther = 180 - otherAngleDeg;
  if (knownAngleDeg + obtuseOther < 180 && Math.abs(otherAngleDeg - 90) > 0.01) {
    result.note = 'SSA ambiguous case: a second valid triangle may exist.';
  }

  return result;
}

function solveTwoSidesOneAngle(a, b, c, A, B, C) {
  const sk = [a !== null, b !== null, c !== null];
  const ak = [A !== null, B !== null, C !== null];

  // SAS cases: included angle
  if (sk[0] && sk[1] && ak[2]) return solveSAS(a, b, C, 'c');
  if (sk[0] && sk[2] && ak[1]) return solveSAS(a, c, B, 'b');
  if (sk[1] && sk[2] && ak[0]) return solveSAS(b, c, A, 'a');

  // SSA cases: angle opposite one of the known sides
  if (sk[0] && sk[1] && ak[0]) return solveSSA(a, b, A, 'a', 'b');
  if (sk[0] && sk[1] && ak[1]) return solveSSA(b, a, B, 'b', 'a');
  if (sk[0] && sk[2] && ak[0]) return solveSSA(a, c, A, 'a', 'c');
  if (sk[0] && sk[2] && ak[2]) return solveSSA(c, a, C, 'c', 'a');
  if (sk[1] && sk[2] && ak[1]) return solveSSA(b, c, B, 'b', 'c');
  if (sk[1] && sk[2] && ak[2]) return solveSSA(c, b, C, 'c', 'b');

  throw new Error('Could not determine triangle case.');
}

function solveOneSideTwoAngles(a, b, c, A, B, C) {
  if (A !== null && B !== null) C = 180 - A - B;
  else if (A !== null && C !== null) B = 180 - A - C;
  else A = 180 - B - C;

  if (A <= 0 || B <= 0 || C <= 0) {
    throw new Error('Angles must each be positive and sum to 180\u00B0.');
  }

  if (a !== null) {
    b = a * Math.sin(toRad(B)) / Math.sin(toRad(A));
    c = a * Math.sin(toRad(C)) / Math.sin(toRad(A));
  } else if (b !== null) {
    a = b * Math.sin(toRad(A)) / Math.sin(toRad(B));
    c = b * Math.sin(toRad(C)) / Math.sin(toRad(B));
  } else {
    a = c * Math.sin(toRad(A)) / Math.sin(toRad(C));
    b = c * Math.sin(toRad(B)) / Math.sin(toRad(C));
  }

  return { a, b, c, A, B, C, case: 'AAS/ASA' };
}

function clampCos(v) {
  return Math.max(-1, Math.min(1, v));
}