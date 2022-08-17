<script>
  export let capacity;
  export let clickHandler;
</script>

<div class="vial" style="height: {capacity * 10}vw" on:click={clickHandler}>
  <slot />
</div>

<style>
  .vial {
    border: solid;
    border-color: #12259280;
    border-width: 0.3vw;
    border-radius: 1vw 1vw 10vw 10vw;
    overflow: hidden;

    display: flex;
    justify-content: flex-end;
    flex-direction: column;
    width: 10vw;
  }
</style>
