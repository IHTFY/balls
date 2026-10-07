// Short notifications that slide in at the top of the screen.

/** @typedef {{ id: number, icon: import('../ui/icons.js').IconName, title: string, body?: string }} Toast */

/** @type {Toast[]} */
export const toasts = $state([]);
let nextId = 0;

/** @param {Omit<Toast, 'id'>} toast */
export function notify(toast) {
	const id = nextId++;
	toasts.push({ ...toast, id });
	setTimeout(() => dismiss(id), 3800);
}

/** @param {number} id */
export function dismiss(id) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}
