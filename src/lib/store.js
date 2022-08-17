import { writable } from "svelte/store";

export const data = writable([
  [1, 1],
  [2, 2],
  [3, 3, 2, 2],
  [3, 3],
  [1, 1],
]);
