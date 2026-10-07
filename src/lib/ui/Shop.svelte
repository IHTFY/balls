<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Check from '@lucide/svelte/icons/check';
	import { BOOSTERS, SKINS, skinById, THEMES } from '../game/cosmetics.js';
	import { burst } from '../fx/particles.js';
	import { sound } from '../fx/audio.js';
	import { go } from '../state/nav.svelte.js';
	import { checkAchievements, profile, spend } from '../state/profile.svelte.js';
	import { notify } from '../state/toasts.svelte.js';
	import Ball from './Ball.svelte';
	import CoinChip from './CoinChip.svelte';

	/** @type {['themes' | 'balls' | 'boosters', string][]} */
	const TABS = [
		['themes', '🎨 Themes'],
		['balls', '🔮 Balls'],
		['boosters', '🚀 Boosters']
	];
	let tab = $state(TABS[0][0]);
	const equipped = $derived(skinById(profile.skin));
	/** The item awaiting a second tap to confirm the purchase. */
	let confirming = $state('');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let confirmTimer;

	/** @param {Record<string, string>} vars */
	const style = (vars) =>
		Object.entries(vars)
			.map(([k, v]) => `${k}:${v}`)
			.join(';');

	/**
	 * @param {MouseEvent} event
	 * @param {string} key unique purchase key
	 * @param {number} price
	 * @param {() => void} grant
	 */
	function buy(event, key, price, grant) {
		if (profile.coins < price) {
			sound.invalid();
			notify({
				icon: '🪙',
				title: 'Not enough coins',
				body: `You need ${price - profile.coins} more`
			});
			return;
		}
		if (confirming !== key) {
			sound.tap();
			confirming = key;
			clearTimeout(confirmTimer);
			confirmTimer = setTimeout(() => (confirming = ''), 3000);
			return;
		}
		confirming = '';
		spend(price);
		grant();
		profile.stats.purchases++;
		sound.buy();
		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		burst(
			rect.left + rect.width / 2,
			rect.top + rect.height / 2,
			['#ffcf3f', '#fff', '#ff8a1f'],
			30
		);
		checkAchievements();
	}

	/** @param {string} id @param {'theme' | 'skin'} kind */
	function equip(id, kind) {
		sound.tap();
		if (kind === 'theme') profile.theme = id;
		else profile.skin = id;
	}

	const preview = [0, 1, 2, 3, 4, 5, 6];
</script>

<section class="shop">
	<header>
		<button class="icon-button" aria-label="Back" onclick={() => go('home')}
			><ChevronLeft size={24} /></button
		>
		<h1>Shop</h1>
		<CoinChip />
	</header>

	<div class="tabs" role="tablist">
		{#each TABS as [id, label] (id)}
			<button
				role="tab"
				aria-selected={tab === id}
				class:active={tab === id}
				onclick={() => (tab = id)}
			>
				{label}
			</button>
		{/each}
	</div>

	<div class="scroll">
		{#if tab === 'themes'}
			<div class="cards">
				{#each THEMES as theme (theme.id)}
					{@const owned = profile.owned.includes(theme.id)}
					{@const active = profile.theme === theme.id}
					<div class="card" class:active>
						<div class="theme-preview" style={style(theme.vars)}>
							{#each [0, 1, 2] as t (t)}
								<span class="mini-tube">
									{#each [0, 1, 2] as b (b)}
										<Ball color={(t * 3 + b) % 7} skin={equipped} size={14} />
									{/each}
								</span>
							{/each}
						</div>
						<b>{theme.name}</b>
						{#if active}
							<button class="secondary small" disabled><Check size={16} /> Equipped</button>
						{:else if owned}
							<button class="secondary small" onclick={() => equip(theme.id, 'theme')}>Equip</button
							>
						{:else}
							<button
								class="primary small"
								class:confirm={confirming === theme.id}
								onclick={(e) =>
									buy(e, theme.id, theme.price, () => {
										profile.owned.push(theme.id);
										profile.theme = theme.id;
									})}
							>
								{confirming === theme.id ? 'Tap to confirm' : `🪙 ${theme.price}`}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{:else if tab === 'balls'}
			<div class="cards">
				{#each SKINS as skin (skin.id)}
					{@const owned = profile.owned.includes(skin.id)}
					{@const active = profile.skin === skin.id}
					<div class="card" class:active>
						<div class="skin-preview">
							{#each preview as c (c)}
								<Ball color={c} {skin} size={30} symbols={profile.settings.symbols} />
							{/each}
						</div>
						<b>{skin.name}</b>
						{#if active}
							<button class="secondary small" disabled><Check size={16} /> Equipped</button>
						{:else if owned}
							<button class="secondary small" onclick={() => equip(skin.id, 'skin')}>Equip</button>
						{:else}
							<button
								class="primary small"
								class:confirm={confirming === skin.id}
								onclick={(e) =>
									buy(e, skin.id, skin.price, () => {
										profile.owned.push(skin.id);
										profile.skin = skin.id;
									})}
							>
								{confirming === skin.id ? 'Tap to confirm' : `🪙 ${skin.price}`}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="have">
				You have <b>💡 {profile.hints}</b> hints and <b>🧪 {profile.tubes}</b> extra tubes.
			</p>
			<div class="boosters">
				{#each BOOSTERS as booster, i (i)}
					{@const key = `booster-${i}`}
					<div class="booster">
						<span class="booster-icon">{booster.icon}</span>
						<div>
							<b>{booster.name}</b>
							<small>{booster.description}</small>
						</div>
						<button
							class="primary small"
							class:confirm={confirming === key}
							onclick={(e) =>
								buy(e, key, booster.price, () => {
									profile[booster.id] += booster.count;
								})}
						>
							{confirming === key ? 'Confirm' : `🪙 ${booster.price}`}
						</button>
					</div>
				{/each}
			</div>
			<p class="earn">
				Earn coins by clearing levels, keeping a daily streak, opening your daily gift, and
				unlocking trophies.
			</p>
		{/if}
	</div>
</section>

<style>
	.shop {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-rows: auto auto 1fr;
		height: 100%;
		width: min(680px, 100%);
		margin: 0 auto;
	}
	header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
	}
	.tabs {
		display: flex;
		gap: 6px;
		padding: 0 14px 10px;
	}
	.tabs button {
		flex: 1;
		padding: 10px;
		border-radius: 14px;
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
	}
	.tabs button.active {
		background: var(--text);
		color: var(--panel);
	}
	.scroll {
		overflow-y: auto;
		padding: 0 14px calc(24px + env(safe-area-inset-bottom));
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
	}
	.card {
		display: grid;
		gap: 8px;
		padding: 10px;
		border-radius: 20px;
		background: var(--surface);
		border: 2px solid transparent;
		text-align: center;
	}
	.card.active {
		border-color: var(--accent);
	}
	.theme-preview {
		display: flex;
		justify-content: center;
		align-items: end;
		gap: 8px;
		height: 90px;
		padding-bottom: 10px;
		border-radius: 14px;
		background: var(--bg);
	}
	.mini-tube {
		display: flex;
		flex-direction: column-reverse;
		gap: 1px;
		padding: 2px 3px 3px;
		border: 2px solid var(--glass-edge);
		border-top: none;
		border-radius: 0 0 10px 10px;
		background: var(--glass);
	}
	.skin-preview {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px;
		min-height: 90px;
		align-content: center;
		padding: 6px;
		border-radius: 14px;
		background: var(--surface);
	}
	.small {
		padding: 8px 10px;
		font-size: 14px;
		min-height: 0;
	}
	.confirm {
		animation: nudge 0.4s ease-in-out infinite alternate;
	}
	.have {
		text-align: center;
	}
	.boosters {
		display: grid;
		gap: 10px;
	}
	.booster {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: 18px;
		background: var(--surface);
	}
	.booster div {
		display: grid;
	}
	.booster small,
	.earn {
		color: var(--muted);
	}
	.booster-icon {
		font-size: 32px;
	}
	.earn {
		text-align: center;
		font-size: 14px;
	}
	@keyframes nudge {
		to {
			box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent), transparent 40%);
			filter: brightness(1.15);
		}
	}
</style>
