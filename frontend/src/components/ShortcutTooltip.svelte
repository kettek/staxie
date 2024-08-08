<script lang="ts">
  import { getShortcutKeys } from './Shortcuts.svelte'

  export let group: string
  export let cmd: string
  $: keys = getShortcutKeys(group, cmd)
</script>

<main>
  <span>{cmd}</span>
  {#each keys as key}
    <aside>{key}</aside>
  {/each}
</main>

<style>
  main {
    display: inline-block;
    pointer-events: none;
  }
  aside {
    display: inline-block;
    margin-left: 0.2rem;
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.1);
  }
</style>
