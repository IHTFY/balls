// Runs puzzle generation and search off the main thread so animations stay smooth.
import { run } from './game/tasks.js';

self.onmessage = (/** @type {MessageEvent} */ { data }) => {
	self.postMessage({ id: data.id, result: run(data.task) });
};
