// 42 款真实存在的 Steam 游戏（appId 均为本人确认过的知名游戏，封面走 Steam CDN）。
// 单位约定：金额用「分」(19800 = ¥198.00，免费用 0，未定价用 -1)；时长用「分钟」；日期用 YYYY-MM-DD。
// 若对某个 appId 没把握应换成有把握的，宁缺毋滥，绝不要编造 appId。

export interface CatalogGame {
  appId: number
  name: string
  genres: string[]
  tags: string[]
  releaseDate: string
  developer: string
  publisher: string
  reviewPercent: number
  reviewCount: number
  basePriceCents: number
  baseOriginalPriceCents: number
}

export const CATALOG: CatalogGame[] = [
  { appId: 730, name: 'Counter-Strike 2', genres: ['FPS'], tags: ['射击', '竞技', '团队'], releaseDate: '2023-09-27', developer: 'Valve', publisher: 'Valve', reviewPercent: 82, reviewCount: 2150000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 570, name: 'Dota 2', genres: ['策略'], tags: ['MOBA', '竞技', '团队'], releaseDate: '2013-07-09', developer: 'Valve', publisher: 'Valve', reviewPercent: 88, reviewCount: 1580000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 440, name: 'Team Fortress 2', genres: ['FPS'], tags: ['射击', '搞笑', '团队'], releaseDate: '2007-10-10', developer: 'Valve', publisher: 'Valve', reviewPercent: 93, reviewCount: 720000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 620, name: 'Portal 2', genres: ['冒险'], tags: ['解谜', '合作', '科幻'], releaseDate: '2011-04-19', developer: 'Valve', publisher: 'Valve', reviewPercent: 98, reviewCount: 198000, basePriceCents: 3700, baseOriginalPriceCents: 7400 },
  { appId: 4000, name: "Garry's Mod", genres: ['模拟'], tags: ['沙盒', '物理', '创意'], releaseDate: '2006-11-29', developer: 'Facepunch', publisher: 'Valve', reviewPercent: 96, reviewCount: 410000, basePriceCents: 1800, baseOriginalPriceCents: 1800 },
  { appId: 218620, name: 'Left 4 Dead 2', genres: ['FPS'], tags: ['恐怖', '合作', '丧尸'], releaseDate: '2009-11-17', developer: 'Valve', publisher: 'Valve', reviewPercent: 97, reviewCount: 365000, basePriceCents: 3700, baseOriginalPriceCents: 5550 },
  { appId: 252950, name: 'Rocket League', genres: ['体育'], tags: ['竞速', '足球', '竞技'], releaseDate: '2015-07-07', developer: 'Psyonix', publisher: 'Psyonix', reviewPercent: 94, reviewCount: 880000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 22380, name: 'Fallout: New Vegas', genres: ['RPG'], tags: ['废土', '开放世界', '剧情'], releaseDate: '2010-10-19', developer: 'Obsidian', publisher: 'Bethesda', reviewPercent: 94, reviewCount: 240000, basePriceCents: 4900, baseOriginalPriceCents: 4900 },
  { appId: 8930, name: 'Sid Meier’s Civilization V', genres: ['策略'], tags: ['回合制', '历史', '4X'], releaseDate: '2010-09-21', developer: 'Firaxis', publisher: '2K', reviewPercent: 96, reviewCount: 145000, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 289070, name: 'Sid Meier’s Civilization VI', genres: ['策略'], tags: ['回合制', '历史', '4X'], releaseDate: '2016-10-21', developer: 'Firaxis', publisher: '2K', reviewPercent: 84, reviewCount: 198000, basePriceCents: 19900, baseOriginalPriceCents: 19900 },
  { appId: 346110, name: 'ARK: Survival Evolved', genres: ['动作'], tags: ['生存', '开放世界', '恐龙'], releaseDate: '2017-08-29', developer: 'Studio Wildcard', publisher: 'Studio Wildcard', reviewPercent: 68, reviewCount: 410000, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 374320, name: 'DARK SOULS III', genres: ['动作'], tags: ['硬核', '魂系列', '奇幻'], releaseDate: '2016-04-12', developer: 'FromSoftware', publisher: 'Bandai Namco', reviewPercent: 92, reviewCount: 240000, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 335300, name: 'Dark Souls II', genres: ['动作'], tags: ['硬核', '魂系列', '奇幻'], releaseDate: '2014-04-15', developer: 'FromSoftware', publisher: 'Bandai Namco', reviewPercent: 89, reviewCount: 110000, basePriceCents: 19800, baseOriginalPriceCents: 19800 },
  { appId: 578080, name: 'PUBG: BATTLEGROUNDS', genres: ['FPS'], tags: ['大逃杀', '竞技', '射击'], releaseDate: '2017-12-21', developer: 'PUBG Corp', publisher: 'KRAFTON', reviewPercent: 49, reviewCount: 1900000, basePriceCents: 9800, baseOriginalPriceCents: 9800 },
  { appId: 1174180, name: 'Red Dead Redemption 2', genres: ['冒险'], tags: ['开放世界', '西部', '剧情'], releaseDate: '2019-11-05', developer: 'Rockstar', publisher: 'Rockstar', reviewPercent: 91, reviewCount: 510000, basePriceCents: 13900, baseOriginalPriceCents: 13900 },
  { appId: 271590, name: 'Grand Theft Auto V', genres: ['动作'], tags: ['开放世界', '犯罪', '驾驶'], releaseDate: '2015-04-14', developer: 'Rockstar', publisher: 'Rockstar', reviewPercent: 85, reviewCount: 620000, basePriceCents: 11900, baseOriginalPriceCents: 11900 },
  { appId: 252490, name: 'Rust', genres: ['动作'], tags: ['生存', '多人', '建造'], releaseDate: '2018-02-08', developer: 'Facepunch', publisher: 'Facepunch', reviewPercent: 78, reviewCount: 690000, basePriceCents: 7000, baseOriginalPriceCents: 7000 },
  { appId: 381210, name: 'Dead by Daylight', genres: ['动作'], tags: ['恐怖', '非对称', '多人'], releaseDate: '2016-06-14', developer: 'Behaviour', publisher: 'Behaviour', reviewPercent: 81, reviewCount: 480000, basePriceCents: 3700, baseOriginalPriceCents: 3700 },
  { appId: 322330, name: 'Don’t Starve Together', genres: ['模拟'], tags: ['生存', '合作', '独立'], releaseDate: '2016-04-21', developer: 'Klei', publisher: 'Klei', reviewPercent: 95, reviewCount: 215000, basePriceCents: 2400, baseOriginalPriceCents: 2400 },
  { appId: 945360, name: 'Among Us', genres: ['独立'], tags: ['社交推理', '多人', '休闲'], releaseDate: '2018-11-16', developer: 'Innersloth', publisher: 'Innersloth', reviewPercent: 92, reviewCount: 980000, basePriceCents: 1800, baseOriginalPriceCents: 1800 },
  { appId: 739630, name: 'Phasmophobia', genres: ['独立'], tags: ['恐怖', '合作', 'VR'], releaseDate: '2020-10-29', developer: 'Kinetic', publisher: 'Kinetic', reviewPercent: 95, reviewCount: 420000, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 632360, name: 'Risk of Rain 2', genres: ['动作'], tags: ['Roguelike', '合作', '射击'], releaseDate: '2020-08-11', developer: 'Hopoo', publisher: 'Gearbox', reviewPercent: 94, reviewCount: 145000, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 646570, name: 'Slay the Spire', genres: ['策略'], tags: ['卡牌', 'Roguelike', '回合制'], releaseDate: '2019-01-23', developer: 'MegaCrit', publisher: 'MegaCrit', reviewPercent: 97, reviewCount: 145000, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 588650, name: 'Dead Cells', genres: ['独立'], tags: ['Roguelike', '平台', '动作'], releaseDate: '2018-08-07', developer: 'Motion Twin', publisher: 'Motion Twin', reviewPercent: 97, reviewCount: 165000, basePriceCents: 4800, baseOriginalPriceCents: 4800 },
  { appId: 1063730, name: 'New World', genres: ['模拟'], tags: ['MMO', '开放世界', '生存'], releaseDate: '2021-09-28', developer: 'Amazon', publisher: 'Amazon', reviewPercent: 58, reviewCount: 260000, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 1599340, name: 'Lost Ark', genres: ['模拟'], tags: ['MMO', '动作', 'RPG'], releaseDate: '2022-02-11', developer: 'Smilegate', publisher: 'Amazon', reviewPercent: 72, reviewCount: 320000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 413150, name: 'Stardew Valley', genres: ['模拟'], tags: ['农场', '治愈', '像素'], releaseDate: '2016-02-26', developer: 'ConcernedApe', publisher: 'ConcernedApe', reviewPercent: 98, reviewCount: 380000, basePriceCents: 3600, baseOriginalPriceCents: 3600 },
  { appId: 105600, name: 'Terraria', genres: ['独立'], tags: ['沙盒', '探索', '建造'], releaseDate: '2011-05-16', developer: 'Re-Logic', publisher: 'Re-Logic', reviewPercent: 98, reviewCount: 540000, basePriceCents: 3600, baseOriginalPriceCents: 3600 },
  { appId: 367520, name: 'Hollow Knight', genres: ['独立'], tags: ['银河恶魔城', '探索', '硬核'], releaseDate: '2017-02-24', developer: 'Team Cherry', publisher: 'Team Cherry', reviewPercent: 98, reviewCount: 215000, basePriceCents: 4800, baseOriginalPriceCents: 4800 },
  { appId: 1145360, name: 'Hades', genres: ['独立'], tags: ['Roguelike', '动作', '神话'], releaseDate: '2020-09-17', developer: 'Supergiant', publisher: 'Supergiant', reviewPercent: 98, reviewCount: 195000, basePriceCents: 5600, baseOriginalPriceCents: 5600 },
  { appId: 1086940, name: 'Baldur’s Gate 3', genres: ['RPG'], tags: ['CRPG', '回合制', '剧情'], releaseDate: '2023-08-03', developer: 'Larian', publisher: 'Larian', reviewPercent: 96, reviewCount: 610000, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 292030, name: 'The Witcher 3: Wild Hunt', genres: ['RPG'], tags: ['开放世界', '剧情', '奇幻'], releaseDate: '2015-05-19', developer: 'CD Projekt', publisher: 'CD Projekt', reviewPercent: 97, reviewCount: 690000, basePriceCents: 12700, baseOriginalPriceCents: 12700 },
  { appId: 1091500, name: 'Cyberpunk 2077', genres: ['RPG'], tags: ['开放世界', '科幻', '剧情'], releaseDate: '2020-12-10', developer: 'CD Projekt', publisher: 'CD Projekt', reviewPercent: 84, reviewCount: 540000, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 1245620, name: 'ELDEN RING', genres: ['RPG'], tags: ['魂系列', '开放世界', '奇幻'], releaseDate: '2022-02-25', developer: 'FromSoftware', publisher: 'Bandai Namco', reviewPercent: 94, reviewCount: 620000, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 489830, name: 'The Elder Scrolls V: Skyrim Special Edition', genres: ['RPG'], tags: ['开放世界', '奇幻', 'mod'], releaseDate: '2016-10-28', developer: 'Bethesda', publisher: 'Bethesda', reviewPercent: 93, reviewCount: 330000, basePriceCents: 8500, baseOriginalPriceCents: 8500 },
  { appId: 377160, name: 'Fallout 4', genres: ['RPG'], tags: ['废土', '开放世界', '射击'], releaseDate: '2015-11-10', developer: 'Bethesda', publisher: 'Bethesda', reviewPercent: 82, reviewCount: 270000, basePriceCents: 9900, baseOriginalPriceCents: 9900 },
  { appId: 814380, name: 'Sekiro: Shadows Die Twice', genres: ['动作'], tags: ['硬核', '忍者', '魂系列'], releaseDate: '2019-03-22', developer: 'FromSoftware', publisher: 'Activision', reviewPercent: 95, reviewCount: 190000, basePriceCents: 29800, baseOriginalPriceCents: 29800 },
  { appId: 1449850, name: 'Monster Hunter Rise', genres: ['动作'], tags: ['狩猎', '共斗', '开放世界'], releaseDate: '2022-01-12', developer: 'Capcom', publisher: 'Capcom', reviewPercent: 90, reviewCount: 130000, basePriceCents: 20900, baseOriginalPriceCents: 20900 },
  { appId: 582010, name: 'Monster Hunter: World', genres: ['动作'], tags: ['狩猎', '共斗', '开放世界'], releaseDate: '2018-08-09', developer: 'Capcom', publisher: 'Capcom', reviewPercent: 91, reviewCount: 230000, basePriceCents: 19900, baseOriginalPriceCents: 19900 },
  { appId: 236390, name: 'War Thunder', genres: ['模拟'], tags: ['载具', '军事', '多人'], releaseDate: '2013-12-21', developer: 'Gaijin', publisher: 'Gaijin', reviewPercent: 86, reviewCount: 410000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 70, name: 'Half-Life', genres: ['冒险'], tags: ['科幻', '射击', '剧情'], releaseDate: '1998-11-19', developer: 'Valve', publisher: 'Valve', reviewPercent: 97, reviewCount: 52000, basePriceCents: 0, baseOriginalPriceCents: 0 },
  { appId: 220, name: 'Half-Life 2', genres: ['冒险'], tags: ['科幻', '射击', '剧情'], releaseDate: '2004-11-16', developer: 'Valve', publisher: 'Valve', reviewPercent: 98, reviewCount: 130000, basePriceCents: 3700, baseOriginalPriceCents: 3700 }
]
