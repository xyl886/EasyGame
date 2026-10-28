<script setup lang="ts">
/**
 * 单色线性图标（1.7px 描边，随 currentColor 变色）。
 * 遵循 Open Design craft 规则：界面 chrome 不用 emoji 充当图标。
 */
type IconName =
  | 'logo'
  | 'settings'
  | 'trophy'
  | 'help'
  | 'volume-on'
  | 'volume-off'
  | 'sun'
  | 'moon'
  | 'arrow-left'
  | 'arrow-right'
  | 'close'
  | 'play'
  | 'pause'
  | 'restart'
  | 'undo'
  | 'share'
  | 'check'
  | 'flag'
  | 'shuffle'
  | 'lightbulb'
  | 'pencil'
  | 'hand'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number | string
  }>(),
  { size: 20 },
)

const ICONS: Record<IconName, string> = {
  logo: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  settings:
    '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5.5a2.5 2.5 0 0 0 0 5H8M16 5h2.5a2.5 2.5 0 0 1 0 5H16"/><path d="M12 13v3M9 20h6M10 20v-2h4v2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.1 1-1.1 2"/><path d="M12 17h.01"/>',
  'volume-on':
    '<path d="M4 9.5h3L12 5.5v13L7 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  'volume-off': '<path d="M4 9.5h3L12 5.5v13L7 14.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5.5l11 6.5-11 6.5z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  restart: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4.5V9h-4.5"/>',
  undo: '<path d="M9 7H4V2"/><path d="M4 7a8 8 0 1 1-1 6"/>',
  share:
    '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/>',
  shuffle:
    '<path d="M4 7h3.5l9 10H20"/><path d="M17 4.5 20 7l-3 2.5"/><path d="M4 17h3.5l2-2.2"/><path d="M14.5 9.2 17 7"/><path d="M17 17h3M17 14.5 20 17l-3 2.5"/>',
  lightbulb:
    '<path d="M9.5 18h5"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z"/>',
  pencil: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l4 4"/>',
  hand: '<path d="M8.5 11V5.8a1.5 1.5 0 0 1 3 0V10"/><path d="M11.5 9.5V4.8a1.5 1.5 0 0 1 3 0V10"/><path d="M14.5 5.8a1.5 1.5 0 0 1 3 0V13"/><path d="M8.5 11a1.5 1.5 0 0 0-3 0v3.5c0 3.6 2.4 6.5 6 6.5h1.5c3.3 0 5.5-2.2 5.5-5.5"/>',
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="ICONS[props.name]"
  />
</template>
