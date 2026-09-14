export function extractWorkNumber(levelName) {
  if (!levelName) return '';
  const match = String(levelName).match(/\b(\d+)\b/);
  return match ? match[1] : 'NA';
}

export function buildMatrixCell({ userId, day, records, levelMap, overtimeByUserDay }) {
  const dayRecords = records.filter((record) => {
    return Number(record.userId) === Number(userId) && record.day === day;
  });

  if (!dayRecords.length) return null;

  const morningRecords = dayRecords.filter((record) => record.period === 'm');
  const afternoonRecords = dayRecords.filter((record) => record.period === 'a');

  const toCellValue = (recordsForSlot) => {
    if (!recordsForSlot || recordsForSlot.length === 0) return '';
    const noRecord = recordsForSlot.find((record) => record.appeared === 'no');
    if (noRecord) return 'F';
    const yesRecord = recordsForSlot.find((record) => record.appeared === 'yes');
    if (!yesRecord || !yesRecord.levelId) return '';
    return extractWorkNumber(levelMap[yesRecord.levelId]);
  };

  const morning = toCellValue(morningRecords);
  const afternoon = toCellValue(afternoonRecords);

  const hasPresenceData = dayRecords.some((record) => record.appeared === 'yes' || record.appeared === 'no');
  if (!hasPresenceData) return null;

  const observationMarkers = (recordsForSlot) => {
    if (!recordsForSlot || recordsForSlot.length === 0) return [];
    return recordsForSlot
      .filter((record) => String(record?.observations || '').trim())
      .map((record) => ({
        id: record.observationId ?? 0,
        text: String(record.observations || '').trim(),
        type: record.period
      }));
  };

  return {
    morning,
    afternoon,
    overtime: Number(overtimeByUserDay.get(`${userId}-${day}`) || 0),
    isMorningAbsent: morningRecords.some((record) => record.appeared === 'no'),
    isAfternoonAbsent: afternoonRecords.some((record) => record.appeared === 'no'),
    morningMarkers: observationMarkers(morningRecords),
    afternoonMarkers: observationMarkers(afternoonRecords),
  };
}
