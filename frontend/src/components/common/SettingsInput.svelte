<script lang="ts">
  import { Bee } from 'carbon-icons-svelte'
  import Button from './Button.svelte'
  import Input from './Input.svelte'

  export let value: string | number = ''
  export let defaultValue: string | number = ''
</script>

<Input bind:value {...$$restProps} />
{#if value !== defaultValue}
  <Button kind="ghost" size="small" icon={Bee} tooltip="Restore Default" tooltipPosition="top" tooltipAlignment="center" on:click={(e) => (value = defaultValue)} />
{/if}
