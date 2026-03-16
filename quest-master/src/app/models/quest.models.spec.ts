import { normalizeQuest } from './quest.models';

describe('normalizeQuest — file ID deduplication', () => {
  it('leaves unique IDs unchanged', () => {
    const raw = {
      id: 'q1', title: '', branch: 'classes', tier: 'apprentice',
      narrative: '', objective: '', evaluationCriteria: '',
      hints: [], bonusObjectives: [], bonusXP: 0, xpReward: 50,
      prerequisites: [], conceptsIntroduced: [],
      files: [
        { id: 'cls-main', filename: 'Quest.Weapon.cls', fileType: 'cls', label: 'Base Weapon Class', starterCode: 'Class Quest.Weapon {}' },
        { id: 'cls-sub',  filename: 'Quest.EnchantedWeapon.cls', fileType: 'cls', label: 'EnchantedWeapon', starterCode: 'Class Quest.EnchantedWeapon Extends Quest.Weapon {}' },
        { id: 'main',     filename: 'solution.script', fileType: 'script', label: 'Solution Script', starterCode: 'WRITE "hi"' },
      ],
    };
    const quest = normalizeQuest(raw);
    expect(quest.files.map(f => f.id)).toEqual(['cls-main', 'cls-sub', 'main']);
  });

  it('renames duplicate IDs to unique values derived from filename', () => {
    // AI-generated quest where both .cls files were given id "cls-main"
    const raw = {
      id: 'q1', title: '', branch: 'classes', tier: 'apprentice',
      narrative: '', objective: '', evaluationCriteria: '',
      hints: [], bonusObjectives: [], bonusXP: 0, xpReward: 50,
      prerequisites: [], conceptsIntroduced: [],
      files: [
        { id: 'cls-main', filename: 'Quest.Weapon.cls', fileType: 'cls', label: 'Base Weapon Class', starterCode: 'A' },
        { id: 'cls-main', filename: 'Quest.EnchantedWeapon.cls', fileType: 'cls', label: 'EnchantedWeapon', starterCode: 'B' },
        { id: 'main',     filename: 'solution.script', fileType: 'script', label: 'Solution Script', starterCode: 'C' },
      ],
    };
    const quest = normalizeQuest(raw);
    const ids = quest.files.map(f => f.id);
    // All IDs must be unique.
    expect(new Set(ids).size).toBe(3);
    // First file keeps its original ID.
    expect(ids[0]).toBe('cls-main');
    // Duplicate second file gets a new ID derived from its filename.
    expect(ids[1]).not.toBe('cls-main');
    expect(ids[1]).toBeTruthy();
    // Third file keeps its unique ID.
    expect(ids[2]).toBe('main');
  });

  it('assigns an ID when a file has no id at all', () => {
    const raw = {
      id: 'q1', title: '', branch: 'classes', tier: 'apprentice',
      narrative: '', objective: '', evaluationCriteria: '',
      hints: [], bonusObjectives: [], bonusXP: 0, xpReward: 50,
      prerequisites: [], conceptsIntroduced: [],
      files: [
        { filename: 'solution.script', fileType: 'script', label: 'Solution', starterCode: 'WRITE "hi"' },
      ],
    };
    const quest = normalizeQuest(raw as any);
    expect(quest.files[0].id).toBeTruthy();
  });
});
