<script lang="ts">
  import { ModalHeader, ModalBody, ModalFooter } from 'carbon-components-svelte'
  import { createEventDispatcher } from 'svelte'

  export let savingFileName: string = ''

  const dispatch = createEventDispatcher()
</script>

<ModalHeader label="Unsaved Changes" />
<ModalBody>
  "{savingFileName}" has unsaved changes. Save or discard them?
</ModalBody>
<ModalFooter primaryButtonText="Save" secondaryButtonText="Discard" on:click:button--secondary={() => dispatch('discard')} />
