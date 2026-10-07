// Achievements: each reports progress toward a goal and pays coins once.
import { rankFor } from './scoring.js';
import { totalStars } from './profile.js';

/** @typedef {import('./profile.js').Profile} Profile */

/**
 * @typedef {object} Achievement
 * @property {string} id
 * @property {import('../ui/icons.js').IconName} icon
 * @property {string} title
 * @property {string} description
 * @property {number} reward coins
 * @property {number} goal
 * @property {(p: Profile) => number} value
 */

const cleared = (/** @type {Profile} */ p) => p.unlocked - 1;
const cosmetics = (/** @type {Profile} */ p) => p.owned.length - 2;

/**
 * Goals are spaced so a steady player unlocks one every few levels rather than
 * several at once; milestones that land on the same level are moved apart.
 * @type {Achievement[]}
 */
export const ACHIEVEMENTS = [
	{
		id: 'first',
		icon: 'party-popper',
		title: 'First Sort',
		description: 'Solve your first puzzle',
		reward: 20,
		goal: 1,
		value: (p) => p.stats.solved
	},
	{
		id: 'stars10',
		icon: 'star',
		title: 'Star Struck',
		description: 'Collect 10 stars',
		reward: 30,
		goal: 10,
		value: totalStars
	},
	{
		id: 'tubes30',
		icon: 'test-tube',
		title: 'Lab Assistant',
		description: 'Complete 30 tubes',
		reward: 50,
		goal: 30,
		value: (p) => p.stats.tubesCompleted
	},
	{
		id: 'boss1',
		icon: 'swords',
		title: 'Boss Slayer',
		description: 'Beat a boss level',
		reward: 75,
		goal: 1,
		value: (p) => p.stats.bossesBeaten
	},
	{
		id: 'perfect10',
		icon: 'gem',
		title: 'Perfectionist',
		description: 'Earn three stars 10 times',
		reward: 80,
		goal: 10,
		value: (p) => p.stats.perfect
	},
	{
		id: 'level15',
		icon: 'compass',
		title: 'Getting Rolling',
		description: 'Clear level 15',
		reward: 100,
		goal: 15,
		value: cleared
	},
	{
		id: 'mystery1',
		icon: 'eye',
		title: 'Mind Reader',
		description: 'Solve a mystery level',
		reward: 75,
		goal: 1,
		value: (p) => p.stats.mysterySolved
	},
	{
		id: 'rank9',
		icon: 'medal',
		title: 'Decorated',
		description: 'Reach rank 9',
		reward: 200,
		goal: 9,
		value: (p) => rankFor(p.score).level
	},
	{
		id: 'coins3000',
		icon: 'piggy-bank',
		title: 'Piggy Bank',
		description: 'Earn 3,000 coins',
		reward: 150,
		goal: 3000,
		value: (p) => p.stats.coinsEarned
	},
	{
		id: 'stars75',
		icon: 'sparkles',
		title: 'Starry Eyed',
		description: 'Collect 75 stars',
		reward: 150,
		goal: 75,
		value: totalStars
	},
	{
		id: 'boss3',
		icon: 'crown',
		title: 'Boss Hunter',
		description: 'Beat 3 boss levels',
		reward: 150,
		goal: 3,
		value: (p) => p.stats.bossesBeaten
	},
	{
		id: 'flawless25',
		icon: 'snowflake',
		title: 'Cool Head',
		description: 'Solve 25 puzzles without undo or hints',
		reward: 150,
		goal: 25,
		value: (p) => p.stats.flawless
	},
	{
		id: 'level40',
		icon: 'map',
		title: 'Explorer',
		description: 'Clear level 40',
		reward: 250,
		goal: 40,
		value: cleared
	},
	{
		id: 'marathon',
		icon: 'footprints',
		title: 'Marathon',
		description: 'Play for an hour in total',
		reward: 150,
		goal: 3600,
		value: (p) => p.stats.seconds
	},
	{
		id: 'level50',
		icon: 'mountain-snow',
		title: 'Summiteer',
		description: 'Clear level 50',
		reward: 250,
		goal: 50,
		value: cleared
	},
	{
		id: 'tubes500',
		icon: 'flask-conical',
		title: 'Chemist',
		description: 'Complete 500 tubes',
		reward: 250,
		goal: 500,
		value: (p) => p.stats.tubesCompleted
	},
	{
		id: 'boss6',
		icon: 'castle',
		title: 'Dragon Tamer',
		description: 'Beat 6 boss levels',
		reward: 300,
		goal: 6,
		value: (p) => p.stats.bossesBeaten
	},
	{
		id: 'stars200',
		icon: 'stars',
		title: 'Constellation',
		description: 'Collect 200 stars',
		reward: 300,
		goal: 200,
		value: totalStars
	},
	{
		id: 'tubes1000',
		icon: 'flask-round',
		title: 'Mad Scientist',
		description: 'Complete 1,000 tubes',
		reward: 500,
		goal: 1000,
		value: (p) => p.stats.tubesCompleted
	},
	{
		id: 'level100',
		icon: 'rocket',
		title: 'Centurion',
		description: 'Clear level 100',
		reward: 600,
		goal: 100,
		value: cleared
	},
	// These depend on how someone plays, not how far they are, so they arrive at their own pace.
	{
		id: 'combo3',
		icon: 'flame',
		title: 'On Fire',
		description: 'Hit a ×3 combo',
		reward: 50,
		goal: 3,
		value: (p) => p.stats.bestCombo
	},
	{
		id: 'combo5',
		icon: 'zap',
		title: 'Chain Reaction',
		description: 'Hit a ×5 combo',
		reward: 150,
		goal: 5,
		value: (p) => p.stats.bestCombo
	},
	{
		id: 'underPar',
		icon: 'flag',
		title: 'Under Par',
		description: 'Beat par on any puzzle',
		reward: 100,
		goal: 1,
		value: (p) => p.stats.underPar
	},
	{
		id: 'speedy',
		icon: 'timer',
		title: 'Speed Sorter',
		description: 'Solve a puzzle with 5 or more colors in under 30 seconds',
		reward: 50,
		goal: 1,
		value: (p) => (p.stats.fastest > 0 && p.stats.fastest < 30 ? 1 : 0)
	},
	{
		id: 'daily1',
		icon: 'calendar-check',
		title: 'Daily Dose',
		description: 'Finish a daily challenge',
		reward: 50,
		goal: 1,
		value: (p) => p.stats.dailySolved
	},
	{
		id: 'streak3',
		icon: 'calendar-days',
		title: 'Habit Forming',
		description: 'Reach a 3-day daily streak',
		reward: 100,
		goal: 3,
		value: (p) => p.daily.best
	},
	{
		id: 'streak7',
		icon: 'trophy',
		title: 'Weeklong',
		description: 'Reach a 7-day daily streak',
		reward: 300,
		goal: 7,
		value: (p) => p.daily.best
	},
	{
		id: 'zen10',
		icon: 'leaf',
		title: 'Inner Peace',
		description: 'Solve 10 Zen puzzles',
		reward: 100,
		goal: 10,
		value: (p) => p.stats.zenSolved
	},
	{
		id: 'blitz5',
		icon: 'alarm-clock',
		title: 'Blitzkrieg',
		description: 'Solve 5 puzzles in one Blitz run',
		reward: 150,
		goal: 5,
		value: (p) => p.stats.blitzMostSolved
	},
	{
		id: 'collector',
		icon: 'shopping-bag',
		title: 'Collector',
		description: 'Own 3 themes or ball sets from the shop',
		reward: 150,
		goal: 3,
		value: cosmetics
	}
];

/**
 * Achievements the profile now meets but has not yet been awarded.
 * @param {Profile} profile
 */
export const newlyEarned = (profile) =>
	ACHIEVEMENTS.filter((a) => !profile.achievements[a.id] && a.value(profile) >= a.goal);

/**
 * Achievements earned from the current list; saves may still hold retired ones.
 * @param {Profile} profile
 */
export const earnedCount = (profile) =>
	ACHIEVEMENTS.filter((a) => profile.achievements[a.id]).length;
