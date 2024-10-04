<script lang="ts">
  import { Modal, TextInput, NumberInput } from 'carbon-components-svelte'
  import { enableShortcuts, disableShortcuts } from './Shortcuts.svelte'
  import { onMount } from 'svelte'

  export let open: boolean = false
  export let heading: string = 'Replace Pixel Indices'
  export let onsubmit: (from: number, to: number) => void = () => {}

  export let fromIndex: number = 0
  let toIndex: number = 0

  onMount(() => {
    disableShortcuts()
    return () => {
      enableShortcuts()
    }
  })
</script>

<Modal
  preventCloseOnClickOutside
  bind:open
  modalHeading={heading}
  primaryButtonText="Apply"
  secondaryButtonText="Cancel"
  on:close={() => (open = false)}
  on:click:button--secondary={() => (open = false)}
  on:submit={() => {
    open = false
    onsubmit(fromIndex, toIndex)
  }}
>
  <NumberInput id="fromIndex" label="From Index" bind:value={fromIndex} />
  <NumberInput id="toIndex" label="To Index" bind:value={toIndex} />
</Modal>
