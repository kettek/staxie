<script lang="ts">
  import Input from '../common/Input.svelte'
  import { editor2DSettings, editor2DSettingsDefault } from '../../stores/editor2d'
  import { Column, Grid, Row } from 'carbon-components-svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input noPadding labelWidth="10" type="checkbox" label="Minified Palette Panel" bind:checked={$editor2DSettings.minifiedLeftPanel} />
    </Row>
  </Column>
</Grid>
