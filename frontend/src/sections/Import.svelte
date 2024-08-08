<script lang="ts">
  import * as Vio from '../globals/importers/vio'

  import { onMount } from 'svelte'

  import { ModalHeader, ModalBody, ModalFooter, Dropdown, Button, Grid, Row, Column, Checkbox } from 'carbon-components-svelte'
  import type { LoadedFile } from '../types/file'

  export let open: boolean = false
  export let valid: boolean = false

  let updateSource: boolean = false
  let updateImage: boolean = false

  let selectedId: string = 'ves'

  let results: Vio.VioImportResults

  export const onImport: () => Promise<LoadedFile> = async () => {
    if (selectedId === 'ves') {
      return await Vio.Import(results, updateSource, updateImage)
    }
    throw new Error('Unknown import type')
  }

  async function openFile() {
    valid = false
    if (selectedId === 'ves') {
      const filepath = await Vio.Open()
      results = await Vio.Read(filepath)
    } else {
      throw new Error('Unknown import type')
    }
    valid = true
  }

  onMount(() => {
    valid = false
  })
</script>

<ModalHeader label="Importie" />
<ModalBody hasForm>
  <Grid condensed narrow>
    <Row condensed narrow>
      <Column>
        <Dropdown bind:selectedId items={[{ id: 'ves', text: 'VES Spritestack' }]} />
      </Column>
      <Column>
        <Button size="field" kind="secondary" on:click={openFile}>Open File</Button>
      </Column>
    </Row>
    {#if selectedId === 'ves'}
      <Row condensed narrow>
        <Column>
          <Checkbox labelText="Update Source VES File" bind:checked={updateSource} />
        </Column>
      </Row>
      <Row condensed narrow>
        <Column>
          <Checkbox labelText="Update PNG Image" bind:checked={updateImage} />
        </Column>
      </Row>
    {/if}
  </Grid>
</ModalBody>
<ModalFooter primaryButtonText="Import" secondaryButtonText="Cancel" primaryButtonDisabled={!valid} on:click:button--secondary={() => (open = false)} />
