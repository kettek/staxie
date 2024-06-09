<script lang='ts'>
  import { Button } from 'carbon-components-svelte'
  import { Form, FormGroup, InlineNotification } from 'carbon-components-svelte'
  import { Grid, Row, Column } from "carbon-components-svelte"

  import {
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "carbon-components-svelte"

  import { SaveFilePath } from '../../wailsjs/go/main/App.js'

  export let open: boolean = false

  export let path: string = ''
  
  let error: string = ''
  let error2: string = ''
  
  async function selectPath() {
    try {
      path = await SaveFilePath(path)
    } catch(e) {
    error = "select"
    error2 = e
    }
  }
</script>

<ModalHeader label="Export to PNG"/>
<ModalBody>
  <Form on:submit={e=>e.preventDefault()}>
    <FormGroup legendText="Export">
      <Grid condensed>
        <Row>
          <Column>
            {path}
            <Button kind='secondary' on:click={selectPath}>Select Path</Button>
          </Column>
        </Row>
      </Grid>
    </FormGroup>
  </Form>
  {#if error}
    <InlineNotification
      kind="error"
      title={error}
      subtitle={error2}
    />
  {/if}
</ModalBody>
<ModalFooter
  primaryButtonText="Export"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => open = false}
/>
