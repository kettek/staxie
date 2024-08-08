<script lang="ts">
  let left: HTMLElement
  let leftWidth = '50%'

  function gripper(el: HTMLElement) {
    let dragging: boolean = false

    el.addEventListener('mousedown', start)

    function start(e: MouseEvent) {
      e.preventDefault()
      dragging = true
      window.addEventListener('mouseup', stop)
      window.addEventListener('mouseleave', stop)
      window.addEventListener('mousemove', move)
    }
    function stop(e: MouseEvent) {
      e.preventDefault()
      dragging = false
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('mouseleave', stop)
      window.removeEventListener('mousemove', move)
    }
    function move(e: MouseEvent) {
      if (!dragging) return
      e.preventDefault()
      const rect = left.getBoundingClientRect()
      left.style.flexBasis = e.clientX - rect.left + 'px'
    }
  }

  export let hideLeft: boolean = false
  export let hideRight: boolean = false
  export let rightFocused: boolean = false
</script>

<main class="split">
  {#if !hideLeft}
    <section class="left {hideRight ? 'solo' : ''}" bind:this={left} style="flex-basis: {leftWidth}" on:mousedown={() => (rightFocused = false)}>
      <slot name="left"></slot>
    </section>
  {/if}
  {#if !hideLeft && !hideRight}
    <aside use:gripper />
  {/if}
  {#if !hideRight}
    <section class="right" on:mousedown={() => (rightFocused = true)}>
      <slot name="right"></slot>
    </section>
  {/if}
</main>

<style>
  main {
    display: flex;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    height: 100%;
  }
  aside {
    flex-grow: 0;
    flex-shrink: 0;
    width: 0.2rem;
    background-color: var(--cds-ui-01, #8d8d8d);
    cursor: col-resize;
  }
  .left {
    flex-grow: 0;
    flex-shrink: 0;
  }
  .left.solo {
    flex-grow: 1;
    flex-shrink: 1;
  }
  .right {
    flex-grow: 1;
    flex-shrink: 1;
    overflow-x: auto;
  }
</style>
