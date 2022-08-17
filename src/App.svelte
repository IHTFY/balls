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
</script>

<main>
  {#each $data as vial, index}
    <Vial {capacity} clickHandler={() => vialClicked(index)}>
      {#each vial as ball}
        <Ball value={ball} />
      {/each}
    </Vial>
  {/each}
</main>

<style>
  main {
    display: flex;
    justify-content: flex;
    flex-direction: row;
    gap: 1em;
    user-select: none;
  }
</style>
