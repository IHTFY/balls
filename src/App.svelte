<script>
  import { flip } from "svelte/animate";
  import { quintInOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import Ball from "./lib/Ball.svelte";
  import { data } from "./lib/store.js";
  import Vial from "./lib/Vial.svelte";

  let stack = [];
  let capacity = 4;
  let uid = 0;

  const [send, receive] = crossfade({
    duration: (d) => Math.sqrt(d * 200),

    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        // duration: 600,
        easing: quintInOut,
        css: (t) => `
					transform: ${transform} scale(${t});
				`,
      };
    },
  });

  /**
   * @param {number} i the index of the vial clicked
   */
  const vialClicked = (i) => {
    stack.unshift(i);
    if (stack.length >= 2) {
      let [onto, from] = stack.map((i) => $data[i]);

      if (from.length && onto.length < capacity) {
        if (onto.length === 0 || from[0].value === onto[0].value) {
          data.update((vials) => {
            onto.unshift(from.shift());
            stack = [];
            return vials;
          });
        }
      }
    }
  };

  const permutation = (/** @type {number} */ n) => {
    let perm = [];
    for (let i = 0; i < n; i++) {
      perm.splice(Math.floor(Math.random() * (i + 1)), 0, i);
    }
    return perm;
  };

  /**
   *
   * @param {number[][]} data2d 2d array
   * @param {number} iterations number of shuffle operations
   */
  const shuffle = (data2d, iterations = 10) => {
    // 1. pick a random vial, non-empty
    // 2. only take a ball if it's on a same-color or solo.
    // 3. place onto any other non-full vial

    let prev = [null, null];
    bigLoop: for (let i = 0; i < iterations; i++) {
      let perm = permutation(data2d.length);
      let fromIndex = perm.pop();
      let from = data2d[fromIndex];
      while (
        from.length <= 0 || // can't take from empty
        (from.length > 1 && from[0] !== from[1]) // don't take if non-reversible
      ) {
        if (!perm.length) break bigLoop;
        fromIndex = perm.pop();
        from = data2d[fromIndex];
      }

      perm = permutation(data2d.length);
      let toIndex = perm.pop();
      while (toIndex === fromIndex || data2d[toIndex].length >= capacity) {
        if (!perm.length) break bigLoop;
        toIndex = perm.pop();
      }
      if (prev[0] === toIndex && prev[1] === fromIndex) continue bigLoop;

      prev = [fromIndex, toIndex];
      let onto = data2d[toIndex];
      console.log(from, onto);
      onto.unshift(from.shift());
    }
    return data2d;
  };

  let startingState;

  const resetPuzzle = () => {
    data.set(structuredClone(startingState));
  };

  const newPuzzle = (
    /** @type {number} */ n,
    /** @type {number} */ cap,
    /** @type {number} */ blank
  ) => {
    // TODO manage this global capacity, n, blank elsewhere
    capacity = cap;

    let ordered = [
      ...[...Array(n)].map((_, i) => Array(cap).fill(i + 1)),
      ...[...Array(blank)].map(() => []),
    ];

    shuffle(ordered, 100);

    // wrap each value in an object with an id
    ordered = ordered.map((vial) =>
      vial.map((ball) => ({ id: uid++, value: ball }))
    );

    startingState = structuredClone(ordered);
    data.set(ordered);
  };

  newPuzzle(5, 5, 3);
</script>

<main>
  <button id="newPuzzle" on:click={() => newPuzzle(5, 5, 3)}>
    New Puzzle
  </button>
  <button id="resetPuzzle" on:click={resetPuzzle}> Reset </button>
  <div class="holder">
    {#each $data as vial, index}
      <Vial {capacity} clickHandler={() => vialClicked(index)}>
        {#each vial as ball (ball.id)}
          <div
            in:receive={{ key: ball.id }}
            out:send={{ key: ball.id }}
            animate:flip
          >
            <Ball value={ball.value} />
          </div>
        {/each}
      </Vial>
    {/each}
  </div>
</main>

<style>
  .holder {
    display: flex;
    justify-content: flex;
    flex-direction: row;
    gap: 1em;
    user-select: none;
  }
</style>
