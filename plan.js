'use strict';

const EXAM = '2026-12-12';
const PAPERS = Object.fromEntries(
  ['2026-06','2025-12','2025-06','2024-12','2024-06'].flatMap(session =>
    [1, 2, 3].map(set => {
      const [year, month] = session.split('-');
      const id = `${session}-${set}`;
      const audioSet = session === '2024-06' ? 3 - set : set;
      return [id, {
        year, month, set, session,
        label: `${year} 年 ${Number(month)} 月第 ${set} 套`,
        source: `https://zhenti.burningvocabulary.cn/cet6/${session}/0${set}`,
        audio: set < 3 ? `https://eol.nju.edu.cn/cet6/papers/${year}${month}-${audioSet}.html` : '',
      }];
    })
  )
);

const PHASES = [
  { id: 'baseline', number: '01', name: '摸底起步', hint: '先看清分丢在哪里', tasks: [
    ['baseline-mock','整卷','第一次全真模考','2025-12-1',1,130,'作文 30 分钟 → 听力 → 阅读 40 分钟 → 翻译 30 分钟。做完分项记正确数。'],
    ['baseline-review','复盘','复盘摸底卷','2025-12-1',3,50,'回看错题和蒙对的题。分别记下听力、选词填空、长篇匹配、仔细阅读的正确数与用时。'],
    ['early-careful','阅读','两篇仔细阅读','2024-12-1',6,45,'做第 46–55 题。订正时为每道错题找原文依据，圈出误导你的选项措辞。'],
    ['early-translation','写译','整段翻译与重译','2024-12-1',8,50,'先限时完成整段翻译，再核对漏译和句间逻辑，最后合上参考译文重译两句。'],
  ] },
  { id: 'practice', number: '02', name: '专项提分', hint: '阅读主攻，写译稳步练', tasks: [
    ['jun1-careful','阅读','仔细阅读：定位与同义替换','2025-06-1',6,45,'做第 46–55 题。把答案对应的原文和选项里的同义表达配对。'],
    ['jun1-match','阅读','长篇匹配与选词填空','2025-06-1',3,45,'做第 26–45 题。长篇匹配先划定位词，选词填空先判断词性。'],
    ['jun1-translation','写译','翻译：信息完整与衔接','2025-06-1',8,50,'写完整段后对照原文，检查数字、专有名词和上下句关系。'],
    ['jun2-careful','阅读','仔细阅读：排除干扰项','2025-06-2',6,45,'做第 46–55 题。复盘时标出偷换范围、因果倒置或原文没有提到的选项。'],
    ['jun2-match','阅读','长篇匹配：缩短定位时间','2025-06-2',4,45,'限时做第 36–45 题，再重做找错段的题，记录卡住的同义表达。'],
    ['jun2-writing','写译','写一篇完整作文','2025-06-2',1,50,'30 分钟写 150–200 词，再用 20 分钟修改。重写最空泛的主体段。'],
  ] },
  { id: 'retest', number: '03', name: '限时检验', hint: '验证进步，再补反复丢分的题', tasks: [
    ['dec2-reading','阅读','40 分钟完整阅读','2025-12-2',3,40,'连续完成第 26–55 题。记录三种题型各用了多久。'],
    ['dec2-review','复盘','对比两次阅读结果','2025-12-2',3,50,'对照第 1 阶段，记下各题型正确数变化。把重复失分的题重做一遍。'],
    ['dec3-focus','阅读','补练仔细阅读','2025-12-3',4,45,'做第 46–55 题。集中练上一阶段最常出现的错因。'],
    ['dec3-writing','写译','作文：把论证写具体','2025-12-3',1,50,'限时写完一篇，检查每个主体段有没有解释、例子或具体结果。'],
    ['next-reading','阅读','新卷阅读：查漏补缺','2026-06-3',4,45,'做第 46–55 题。先完成再对答案，观察之前的失分点有没有改善。'],
    ['next-translation','写译','新卷翻译：最后一次重译','2026-06-3',6,50,'完整翻译，核对主要信息和逻辑。隔一会儿不看参考译文重译最难的两句。'],
  ] },
  { id: 'sprint', number: '04', name: '考前收尾', hint: '考前一周集中练听力', tasks: [
    ['final-mock','整卷','考前全真模考','2026-06-2',1,130,'按正式顺序连做。若考场已经做过这套或听过这份录音，改用备用卷。','2024-12-2'],
    ['final-review','复盘','复盘模考与高频错题','2026-06-2',3,50,'优先处理重复错因。若用了备用模考卷，按备用卷的记录复盘。','2024-12-2'],
    ['final-listen-one','听力','整套听力：找漏听点','2025-12-2',1,50,'整套只听一遍，再听漏掉的句子。订正使用这份卷子对应的答案。'],
    ['final-listen-two','听力','整套听力：稳住做题节奏','2024-12-1',1,50,'按正式节奏完成。重点查讲座部分是听不懂、走神，还是听懂但没定位到答案。'],
  ] },
];

const TASKS = PHASES.flatMap(phase => phase.tasks.map(([id,kind,title,paper,page,minutes,description,alternate]) =>
  ({ id,kind,title,paper,page,minutes,description,alternate,phase })
));

const SECTIONS = {
  listening: '听力 · 第 1–25 题',
  cloze: '选词填空 · 第 26–35 题',
  matching: '长篇匹配 · 第 36–45 题',
  passage1: '仔细阅读第一篇 · 第 46–50 题',
  passage2: '仔细阅读第二篇 · 第 51–55 题',
  reading: '完整阅读 · 第 26–55 题',
  writing: '写作 · Part I',
  translation: '段落翻译 · Part IV',
};

const TARGETS = {
  'baseline-review': ['listening','reading'],
  'early-careful': ['passage1','passage2'],
  'early-translation': ['translation'],
  'jun1-careful': ['passage1','passage2'],
  'jun1-match': ['cloze','matching'],
  'jun1-translation': ['translation'],
  'jun2-careful': ['passage1','passage2'],
  'jun2-match': ['matching'],
  'jun2-writing': ['writing'],
  'dec2-reading': ['reading'],
  'dec2-review': ['reading'],
  'dec3-focus': ['passage1','passage2'],
  'dec3-writing': ['writing'],
  'next-reading': ['passage1','passage2'],
  'next-translation': ['translation'],
  'final-review': ['listening','reading'],
  'final-listen-one': ['listening'],
  'final-listen-two': ['listening'],
};

const TARGET_PAGES = {
  '2024-12-1': { passage1:6, passage2:7, translation:8, listening:1 },
  '2024-12-2': { listening:1, reading:3 },
  '2025-06-1': { passage1:6, passage2:7, cloze:3, matching:3, translation:8 },
  '2025-06-2': { passage1:6, passage2:7, matching:4, writing:1 },
  '2025-12-1': { listening:1, reading:3 },
  '2025-12-2': { reading:3, listening:1 },
  '2025-12-3': { passage1:4, passage2:5, writing:1 },
  '2026-06-2': { listening:1, reading:3 },
  '2026-06-3': { passage1:4, passage2:5, translation:6 },
};
