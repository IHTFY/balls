<script>
  import Ball from "./lib/Ball.svelte";
  import { data } from "./lib/store.js";
  import Vial from "./lib/Vial.svelte";

  let stack = [];
  let capacity = 4;

  /**
   * @param {number} i the index of the vial clicked
   */
  const vialClicked = (i) => {
    stack.unshift(i);
    if (stack.length >= 2) {
      let [onto, from] = stack.map((i) => $data[i]);

      if (from.length && onto.length < capacity) {
        if (onto.length === 0 || from[0] === onto[0]) {
          data.update((vials) => {
            onto.unshift(from.shift());
            return vials;
          });
        }
      }
      stack = [];
    }
  };

  const randIndex = (arr) => Math.floor(Math.random() * arr.length);

  /**
   *
   * @param {number[][]} data 2d array
   * @param {number} iterations number of shuffle operations
   */
  const shuffle = (data, iterations = 10) => {
    // 1. pick a random vial
    // 2. only take a ball if it's on a same-color or solo.
    // 3. place onto any other non-full vial
    // TODO could log operations and not allow "2-cycle undo" by checking for
    //  a => b,..., b => a  && no x => a || b  or a || b  => x in between
    // But simpler to just add more iterations and maybe do a check at the end for pre-solved

    let prev = [null, null];
    bigLoop: for (let i = 0; i < iterations; i++) {
      3;
      let fromIndex = randIndex(data);
      let from = data[fromIndex];
      // if it's empty or there's a different color right below
      let tries = 0;
      while (
        from.length === 0 ||
        (from.length > 1 && from[from.length - 1] !== from[from.length - 2])
      ) {
        if (tries++ > 1000) continue bigLoop;
        from = data[randIndex(data)];
      }

      // could check for from !== to
      let toIndex = randIndex(data);
      tries = 0;
      while (toIndex === fromIndex || data[toIndex].length >= capacity) {
        if (tries++ > 1000) continue bigLoop;
        toIndex = randIndex(data);
      }
      if (prev[0] === toIndex && prev[1] === fromIndex) continue bigLoop;

      prev = [fromIndex, toIndex];
      let onto = data[toIndex];
      onto.unshift(from.shift());
    }
    return data;
  };

  const newPuzzle = (n, cap, blank) => {
    // TODO manage this global capacity, n, blank elsewhere
    capacity = cap;

    let ordered = [
      ...[...Array(n)].map((_, i) => Array(cap).fill(i + 1)),
      ...[...Array(blank)].map(() => []),
    ];

    shuffle(ordered, 1000);

    data.set(ordered);
  };

  newPuzzle(3, 4, 1);
</script>

<main>
  <button id="newPuzzle" on:click={() => newPuzzle(3, 4, 1)}>
    New Puzzle
  </button>
  <div class="holder">
    {#each $data as vial, index}
      <Vial {capacity} clickHandler={() => vialClicked(index)}>
        {#each vial as ball}
          <Ball value={ball} />
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
