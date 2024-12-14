<script lang="ts">
  import { ModalHeader, ModalBody, ModalFooter } from 'carbon-components-svelte'
  import { createEventDispatcher } from 'svelte'

  export let savingFileName: string = ''

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
<ModalBody>
  "{savingFileName}" has unsaved changes. Save or discard them?
</ModalBody>
<ModalFooter primaryButtonText="Save" secondaryButtons={[{ text: 'Cancel' }, { text: 'Discard' }]} on:click:button--secondary={handleSecondary} />
