<script lang="ts">
  import { ModalHeader, ModalBody, ModalFooter } from 'carbon-components-svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  function handleSecondary(evt: CustomEvent<{ text: string }>) {
    if (evt.detail.text === 'Discard') {
      dispatch('discard')
    } else if (evt.detail.text === 'Cancel') {
      dispatch('cancel')
    }
  }
</script>

<ModalHeader label="Unsaved Changes" />
<ModalBody>There are one or more files with unsaved changes. Save or discard them?</ModalBody>
<ModalFooter primaryButtonText="Save & Quit" secondaryButtons={[{ text: 'Cancel' }, { text: 'Discard & Quit' }]} on:click:button--secondary={handleSecondary} />
