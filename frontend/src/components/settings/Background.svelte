<script lang="ts">
  import Input from '../common/Input.svelte'
  import { editor2DSettings } from '../../stores/editor2d'
  import { Column, Grid, Row } from 'carbon-components-svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input labelWidth="10" label="Background Color" type="text" bind:value={$editor2DSettings.backgroundColor} width={7} />
      <Input type="color" bind:value={$editor2DSettings.backgroundColor} />
    </Row>
  </Column>
</Grid>
