// Achievements: each reports progress toward a goal and pays coins once.
import { rankFor } from './scoring.js';
import { totalStars } from './profile.js';

/** @typedef {import('./profile.js').Profile} Profile */

/**
 * @typedef {object} Achievement
 * @property {string} id
 * @property {string} icon
 * @property {string} title
 * @property {string} description
 * @property {number} reward coins
 * @property {number} goal
 * @property {(p: Profile) => number} value
 */

const cleared = (/** @type {Profile} */ p) => p.unlocked - 1;
const cosmetics = (/** @type {Profile} */ p) => p.owned.length - 2;

/** @type {Achievement[]} */
export const ACHIEVEMENTS = [
	{
		id: 'first',
		icon: '🎉',
		title: 'First Sort',
		description: 'Solve your first puzzle',
		reward: 20,
		goal: 1,
		value: (p) => p.stats.solved
	},
	{
		id: 'level10',
		icon: '🧭',
		title: 'Getting Rolling',
		description: 'Clear level 10',
		reward: 50,
		goal: 10,
		value: cleared
	},
	{
		id: 'level25',
		icon: '🗺️',
		title: 'Explorer',
		description: 'Clear level 25',
		reward: 100,
		goal: 25,
		value: cleared
	},
	{
		id: 'level50',
		icon: '🏔️',
		title: 'Summiteer',
		description: 'Clear level 50',
		reward: 250,
		goal: 50,
		value: cleared
	},
	{
		id: 'level100',
		icon: '🚀',
		title: 'Centurion',
		description: 'Clear level 100',
		reward: 600,
		goal: 100,
		value: cleared
	},
	{
		id: 'stars30',
		icon: '⭐',
		title: 'Star Struck',
		description: 'Collect 30 stars',
		reward: 60,
		goal: 30,
		value: totalStars
	},
	{
		id: 'stars150',
		icon: '🌟',
		title: 'Constellation',
		description: 'Collect 150 stars',
		reward: 250,
		goal: 150,
		value: totalStars
	},
	{
		id: 'perfect10',
		icon: '💎',
		title: 'Perfectionist',
		description: 'Earn three stars 10 times',
		reward: 80,
		goal: 10,
		value: (p) => p.stats.perfect
	},
	{
		id: 'underPar',
		icon: '🏌️',
		title: 'Under Par',
		description: 'Beat par on any puzzle',
		reward: 100,
		goal: 1,
		value: (p) => p.stats.underPar
	},
	{
		id: 'flawless10',
		icon: '🧊',
		title: 'Cool Head',
		description: 'Solve 10 puzzles without undo or hints',
		reward: 120,
		goal: 10,
		value: (p) => p.stats.flawless
	},
	{
		id: 'combo3',
		icon: '🔥',
		title: 'On Fire',
		description: 'Hit a ×3 combo',
		reward: 50,
		goal: 3,
		value: (p) => p.stats.bestCombo
	},
	{
		id: 'combo5',
		icon: '☄️',
		title: 'Chain Reaction',
		description: 'Hit a ×5 combo',
		reward: 150,
		goal: 5,
		value: (p) => p.stats.bestCombo
	},
	{
		id: 'speedy',
		icon: '⚡',
		title: 'Speed Sorter',
		description: 'Solve a puzzle in under 30 seconds',
		reward: 50,
		goal: 1,
		value: (p) => (p.stats.fastest > 0 && p.stats.fastest < 30 ? 1 : 0)
	},
	{
		id: 'boss1',
		icon: '👑',
		title: 'Boss Slayer',
		description: 'Beat a boss level',
		reward: 75,
		goal: 1,
		value: (p) => p.stats.bossesBeaten
	},
	{
		id: 'boss5',
		icon: '🐉',
		title: 'Dragon Tamer',
		description: 'Beat 5 boss levels',
		reward: 250,
		goal: 5,
		value: (p) => p.stats.bossesBeaten
	},
	{
		id: 'mystery1',
		icon: '🔮',
		title: 'Mind Reader',
		description: 'Solve a mystery level',
		reward: 75,
		goal: 1,
		value: (p) => p.stats.mysterySolved
	},
	{
		id: 'daily1',
		icon: '📅',
		title: 'Daily Dose',
		description: 'Finish a daily challenge',
		reward: 50,
		goal: 1,
		value: (p) => p.stats.dailySolved
	},
	{
		id: 'streak3',
		icon: '📆',
		title: 'Habit Forming',
		description: 'Reach a 3-day daily streak',
		reward: 100,
		goal: 3,
		value: (p) => p.daily.best
	},
	{
		id: 'streak7',
		icon: '🏆',
		title: 'Weeklong',
		description: 'Reach a 7-day daily streak',
		reward: 300,
		goal: 7,
		value: (p) => p.daily.best
	},
	{
		id: 'zen10',
		icon: '🧘',
		title: 'Inner Peace',
		description: 'Solve 10 Zen puzzles',
		reward: 100,
		goal: 10,
		value: (p) => p.stats.zenSolved
	},
	{
		id: 'blitz5',
		icon: '⏱️',
		title: 'Blitzkrieg',
		description: 'Solve 5 puzzles in one Blitz run',
		reward: 150,
		goal: 5,
		value: (p) => p.stats.blitzMostSolved
	},
	{
		id: 'collector',
		icon: '🛍️',
		title: 'Collector',
		description: 'Own 3 themes or ball sets from the shop',
		reward: 150,
		goal: 3,
		value: cosmetics
	},
	{
		id: 'tubes100',
		icon: '🧪',
		title: 'Lab Assistant',
		description: 'Complete 100 tubes',
		reward: 100,
		goal: 100,
		value: (p) => p.stats.tubesCompleted
	},
	{
		id: 'tubes1000',
		icon: '⚗️',
		title: 'Mad Scientist',
		description: 'Complete 1,000 tubes',
		reward: 500,
		goal: 1000,
		value: (p) => p.stats.tubesCompleted
	},
	{
		id: 'coins1000',
		icon: '💰',
		title: 'Piggy Bank',
		description: 'Earn 1,000 coins',
		reward: 100,
		goal: 1000,
		value: (p) => p.stats.coinsEarned
	},
	{
		id: 'marathon',
		icon: '🏃',
		title: 'Marathon',
		description: 'Play for an hour in total',
		reward: 150,
		goal: 3600,
		value: (p) => p.stats.seconds
	},
	{
		id: 'rank5',
		icon: '🎖️',
		title: 'Decorated',
		description: 'Reach rank 5',
		reward: 250,
		goal: 5,
		value: (p) => rankFor(p.score).level
	}
];

/**
 * Achievements the profile now meets but has not yet been awarded.
 * @param {Profile} profile
 */
export const newlyEarned = (profile) =>
	ACHIEVEMENTS.filter((a) => !profile.achievements[a.id] && a.value(profile) >= a.goal);
