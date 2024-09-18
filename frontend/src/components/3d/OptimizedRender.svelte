<script lang="ts">
  import type { LoadedFile } from 'src/types/file'
  import { onMount } from 'svelte'

  export let file: LoadedFile
  $: file ? refreshMesh() : null

  function refreshMesh() {
    // TODO: Here we would run a greedy mesher against our slices.
  }

  onMount(() => {
    refreshMesh()
  })
</script>
