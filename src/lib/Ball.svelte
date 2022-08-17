<script>
  export let value;

  const phi = (1 + Math.sqrt(5)) / 2;
  const colors = (/** @type {number} */ n) => (n * phi * 360) % 360;
</script>

<div class="ball" style="background-color: hsl({colors(value)}, 100%, 50%);">
  {value}
</div>

<style>
  .ball {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    text-align: center;
    border-radius: 50%;
    line-height: 10vw;
  }
</style>
