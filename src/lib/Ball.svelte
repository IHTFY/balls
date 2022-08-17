<script>
  export let value;

  const phi = (1 + Math.sqrt(5)) / 2;
  const colors = (/** @type {number} */ n) => (n * phi * 360) % 360;
</script>

<div class="ball" style="background-color: hsl({colors(value)}, 100%, 50%);">
  <div class="ballLabel">
    {value}
  </div>
</div>

<style>
  .ball {
    display: flex;
    justify-content: center;
    aspect-ratio: 1;
    align-items: center;
    border-radius: 50%;
  }
</style>
