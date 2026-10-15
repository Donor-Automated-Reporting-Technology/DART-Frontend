<!--
  ProviderMap — the approximate place of an internet provider, from an IP
  address. Leaflet with OpenStreetMap tiles; loaded only in the browser and
  only when shown. The circle is wide on purpose: the place is where the
  provider registers the address, not where the person was.
-->
<template>
  <div class="provider-map">
    <div ref="el" class="map" role="img" :aria-label="`Map around ${label}`" />
    <p class="caption">
      <AppIcon name="map-pin" :size="14" />
      <span>Approximate. This is where the internet provider registers the address, not where the person was.</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  latitude: number
  longitude: number
  label: string
  /** Only the country is known: zoom out further. */
  countryOnly?: boolean
}>()

const el = ref<HTMLElement | null>(null)
let map: import('leaflet').Map | null = null
let layers: import('leaflet').LayerGroup | null = null
let L: typeof import('leaflet') | null = null

function draw() {
  if (!map || !L || !layers) return
  layers.clearLayers()
  const center: [number, number] = [props.latitude, props.longitude]
  const radius = props.countryOnly ? 250_000 : 25_000
  const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0a7c6e'
  L.circle(center, { radius, color, weight: 1.5, fillColor: color, fillOpacity: 0.12 }).addTo(layers)
  L.circleMarker(center, { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
    .bindTooltip(props.label, { direction: 'top', offset: [0, -6] })
    .addTo(layers)
  map.setView(center, props.countryOnly ? 5 : 9)
}

onMounted(async () => {
  L = await import('leaflet')
  if (!el.value) return
  map = L.map(el.value, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map)
  layers = L.layerGroup().addTo(map)
  draw()
  // The drawer animates open; measure again once it has its size.
  setTimeout(() => map?.invalidateSize(), 250)
})

watch(() => [props.latitude, props.longitude, props.countryOnly], draw)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<style scoped>
.provider-map { display: flex; flex-direction: column; gap: 8px; }
.map { height: 240px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); background: var(--hover-bg); z-index: 0; }
.caption { margin: 0; display: flex; gap: 6px; align-items: flex-start; font-size: 0.8125rem; line-height: 1.4; color: var(--text-secondary); }
.caption :deep(svg) { flex: none; margin-top: 2px; }
</style>
