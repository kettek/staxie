<script>
  import SVG from './svg/mirrorH.svg?raw'
  const svg = SVG.split('\n')
    .filter((s) => !s.startsWith('<svg') && !s.startsWith('</svg'))
    .join('\n')

  export let size = 16

  export let title = undefined

  $: labelled = $$props['aria-label'] || $$props['aria-labelledby'] || title
  $: attributes = {
    'aria-hidden': labelled ? undefined : true,
    role: labelled ? 'img' : undefined,
    focusable: Number($$props['tabindex']),
  }
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" preserveAspectRatio="xMidYMid meet" width={size} height={size} {...attributes} {...$$restProps}>
  {#if title}<title>{title}</title>{/if}
  {@html svg}
</svg>
