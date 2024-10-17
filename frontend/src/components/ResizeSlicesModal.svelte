<script lang="ts">
  import { Modal, TextInput, NumberInput } from 'carbon-components-svelte'
  import { enableShortcuts, disableShortcuts } from './Shortcuts.svelte'
  import { onMount } from 'svelte'
  import { fileStates } from '../stores/file'

  export let open: boolean = false
  export let heading: string = 'Resize Slices'
  export let onsubmit: (width: number, height: number) => void = () => {}

  let width: number = $fileStates.focused?.frameWidth || 0
  let height: number = $fileStates.focused?.frameHeight || 0

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
    onsubmit(width, height)
  }}
>
  <NumberInput id="resizeWidth" label="Width" bind:value={width} />
  <NumberInput id="resizeHeight" label="Height" bind:value={height} />
</Modal>
