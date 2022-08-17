<script>
  import { flip } from "svelte/animate";
  import { quadInOut } from "svelte/easing";
  import { crossfade } from "svelte/transition";
  import Ball from "./lib/Ball.svelte";
  import { data } from "./lib/store.js";
  import Vial from "./lib/Vial.svelte";

  let stack = [];
  let capacity = 4;
  let uid = 0;

  const [send, receive] = crossfade({
    duration: (d) => Math.sqrt(d * 200),
    easing: quadInOut,

    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        duration: 200,
        easing: quadInOut,
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

  const checkHistory = (hist, candidate) => {
    if (!hist.length) return true;
    for (let i = hist.length - 1; i >= 0; i--) {
      let past = hist[i];
      if (
        past[0] === candidate[0] ||
        past[1] === candidate[1] ||
        (past[0] === candidate[1] && past[1] !== candidate[0]) ||
        (past[1] === candidate[0] && past[0] !== candidate[1])
      ) {
        return true;
      }
    }
    return false;
  };

  const getEntropy = (/** @type {number[][]} */ data) => {
    let leftHome = 0; // ball is not in original vial
    let newNeighbor = 0; // ball has a different number next to it
    for (let i = 0; i < data.length; i++) {
      let vial = data[i];
      for (let j = 0; j < vial.length; j++) {
        let ball = vial[j];
        if (ball !== i) leftHome++;
        if (vial[j + 1] && vial[j + 1] !== ball) newNeighbor++;
      }
    }
    // weight newNeighbor more, since a solution permutation could still have a max leftHome
    return leftHome + newNeighbor * 10;
  };

  const move = (/** @type {Object[][]} */ data2d, iterations = 20) => {
    // let successes = 0;
    let history = [];

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
      // must be a different destination, and can't place into full
      while (toIndex === fromIndex || data2d[toIndex].length >= capacity) {
        if (!perm.length) break bigLoop;
        toIndex = perm.pop();
      }

      if (!checkHistory(history, [fromIndex, toIndex])) continue bigLoop;

      history.push([fromIndex, toIndex]);
      let onto = data2d[toIndex];
      onto.unshift(from.shift());
    }

    let entropy = getEntropy(data2d);

    return {
      entropy: entropy,
      shuffled: data2d,
    };
  };

  /**
   *
   * @param {number[][]} data 2d array
   * @param {number} iterations number of shuffle operations
   */
  const shuffle = (data, iterations = 20) => {
    // save initial state
    const unmixed = structuredClone(data);

    let bestEntropy = 0;
    let bestShuffled = null;

    let { entropy, shuffled } = move(data, iterations);
    let tries = 0;
    while (tries++ < 50) {
      // use initial state
      data = structuredClone(unmixed);
      ({ entropy, shuffled } = move(data, iterations));
      if (entropy > bestEntropy) {
        bestEntropy = entropy;
        bestShuffled = shuffled;
      }
    }
    return bestShuffled;
  };

  let startingState;

  const resetPuzzle = () => {
    data.set(structuredClone(startingState));
  };

  const newPuzzle = (
    //**
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

    let mixed = shuffle(structuredClone(ordered), 20);

    // wrap each value in an object with an id
    let wrapped = mixed.map((/** @type {number[]} */ vial) =>
      vial.map((ball) => ({ id: uid++, value: ball }))
    );

    startingState = structuredClone(wrapped);
    data.set(wrapped);
  };

  newPuzzle(4, 5, 2);
</script>

<main>
  <button id="newPuzzle" on:click={() => newPuzzle(4, 5, 2)}>
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
