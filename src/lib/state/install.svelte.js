// Captures the browser's install prompt so Settings can offer "Install app".

export const install = $state({
	/** @type {any} */
	prompt: null,
	installed: matchMedia('(display-mode: standalone)').matches
});

addEventListener('beforeinstallprompt', (event) => {
	event.preventDefault();
	install.prompt = event;
});
addEventListener('appinstalled', () => {
	install.prompt = null;
	install.installed = true;
});

export async function promptInstall() {
	const prompt = install.prompt;
	if (!prompt) return;
	install.prompt = null;
	await prompt.prompt();
}
