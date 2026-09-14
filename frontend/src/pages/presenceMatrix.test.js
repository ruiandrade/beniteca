import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMatrixCell } from './presenceMatrix.js';

test('matrix cell shows F for absent morning/afternoon slots', () => {
  const records = [
    { userId: 1, day: '2026-09-10', period: 'm', appeared: 'yes', levelId: 3 },
    { userId: 1, day: '2026-09-10', period: 'a', appeared: 'no', levelId: 3 },
    { userId: 2, day: '2026-09-10', period: 'a', appeared: 'no', levelId: 8 },
  ];

  const cell = buildMatrixCell({
    userId: 1,
    day: '2026-09-10',
    records,
    levelMap: { 3: 'Obra 3', 8: 'Obra 8' },
    overtimeByUserDay: new Map(),
  });

  assert.deepEqual(cell, {
    morning: '3',
    afternoon: 'F',
    overtime: 0,
    isMorningAbsent: false,
    isAfternoonAbsent: true,
    morningMarkers: [],
    afternoonMarkers: [],
  });
});

test('matrix cell is null when user has no presence data for that day', () => {
  const cell = buildMatrixCell({
    userId: 5,
    day: '2026-09-10',
    records: [
      { userId: 1, day: '2026-09-10', period: 'm', appeared: 'yes', levelId: 7 },
    ],
    levelMap: { 7: 'Obra 7' },
    overtimeByUserDay: new Map(),
  });

  assert.equal(cell, null);
});

test('matrix cell can show multiple numbered observations for one slot', () => {
  const cell = buildMatrixCell({
    userId: 3,
    day: '2026-09-11',
    records: [
      { userId: 3, day: '2026-09-11', period: 'm', appeared: 'no', observations: 'faltou', observationId: 1 },
      { userId: 3, day: '2026-09-11', period: 'm', appeared: 'no', observations: 'sem uniforme', observationId: 2 },
    ],
    levelMap: {},
    overtimeByUserDay: new Map(),
  });

  assert.deepEqual(cell.morning, 'F');
  assert.deepEqual(cell.morningMarkers, [
    { id: 1, text: 'faltou', type: 'm' },
    { id: 2, text: 'sem uniforme', type: 'm' },
  ]);
});
