<script lang="ts">
  import { Modal, TextInput } from 'carbon-components-svelte'
  import { enableShortcuts, disableShortcuts } from './Shortcuts.svelte'
  import { onMount } from 'svelte'

  export let open: boolean = false
  export let heading: string = 'Rename'
  export let onsubmit: (v: string) => void = () => {}
  export let isvalid: (v: string) => boolean = () => true

  export let text: string = ''

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
  primaryButtonDisabled={!isvalid(text)}
  on:close={() => (open = false)}
  on:click:button--secondary={() => (open = false)}
  on:submit={() => {
    open = false
    onsubmit(text)
  }}
>
  <TextInput id="rename" labelText="New name" bind:value={text} invalid={!isvalid(text)} />
</Modal>
