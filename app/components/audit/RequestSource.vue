<!--
  RequestSource — where one logged action came from: the device (browser and
  system, or the tablet), the network (IP address and internet provider) and
  a map of the provider's approximate place.
-->
<template>
  <div class="source">
    <section class="block" aria-labelledby="src-device">
      <h3 id="src-device" class="block-title">Device</h3>
      <div v-if="device" class="device">
        <span class="device-icon"><AppIcon :name="deviceIcon(device)" :size="20" /></span>
        <div class="device-main">
          <p class="device-summary">{{ device.kind === 'app' ? (device.tablet_name ?? 'WellReach app') : device.summary }}</p>
          <p class="muted">{{ deviceTypeLabel(device) }}</p>
        </div>
      </div>
      <p v-else class="muted">Not recorded. Entries from before 16 October 2026 do not have it.</p>

      <dl v-if="device" class="facts">
        <template v-if="device.kind === 'app'">
          <div v-if="device.model"><dt>Model</dt><dd>{{ device.model }}</dd></div>
          <div v-if="device.os_version"><dt>System</dt><dd>{{ [device.os, device.os_version].filter(Boolean).join(' ') }}</dd></div>
          <div v-if="device.app_version"><dt>App version</dt><dd>{{ device.app_version }}</dd></div>
        </template>
        <template v-else>
          <div v-if="device.browser"><dt>Browser</dt><dd>{{ [device.browser, device.browser_version].filter(Boolean).join(' ') }}</dd></div>
          <div v-if="device.os"><dt>System</dt><dd>{{ [device.os, device.os_version].filter(Boolean).join(' ') }}</dd></div>
        </template>
      </dl>
      <details v-if="device?.user_agent" class="raw">
        <summary>Technical details</summary>
        <code>{{ device.user_agent }}</code>
      </details>
    </section>

    <section class="block" aria-labelledby="src-network">
      <h3 id="src-network" class="block-title">Network</h3>
      <dl class="facts">
        <div class="wide">
          <dt>IP address</dt>
          <dd class="ip-row">
            <span class="mono">{{ ip ?? 'Not recorded' }}</span>
            <button v-if="ip" type="button" class="copy" :aria-label="copied ? 'Copied' : 'Copy IP address'" @click="copy">
              <AppIcon :name="copied ? 'check' : 'copy'" :size="14" />
              {{ copied ? 'Copied' : 'Copy' }}
            </button>
          </dd>
        </div>
        <div v-if="location?.provider" class="wide"><dt>Internet provider</dt><dd>{{ location.provider }}<span v-if="location.asn" class="muted"> · AS{{ location.asn }}</span></dd></div>
        <div v-if="ip" class="wide">
          <dt>Place</dt>
          <dd><span v-if="flag" class="flag" aria-hidden="true">{{ flag }}</span> {{ placeLabel(location) }}</dd>
        </div>
      </dl>
      <p v-if="location?.private" class="muted">
        A private address: the request came from inside a local or server network, so there is no place to show.
      </p>
      <p v-else-if="ip && isHostingNetwork" class="note">
        <AppIcon name="alert-circle" :size="14" />
        <span>This is a hosting company's address. Before 16 October 2026 the website recorded its own server instead of the visitor.</span>
      </p>
    </section>

    <section v-if="hasPoint(location)" class="block" aria-labelledby="src-map">
      <div class="block-head">
        <h3 id="src-map" class="block-title">Map</h3>
        <a class="map-link" :href="osmLink" target="_blank" rel="noopener">
          Open in OpenStreetMap <AppIcon name="external-link" :size="13" />
        </a>
      </div>
      <ProviderMap
        :latitude="location.latitude"
        :longitude="location.longitude"
        :label="placeLabel(location)"
        :country-only="!location.city"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RequestDevice, RequestLocation } from '../../services/activityLogApi'
import { countryFlag, deviceIcon, deviceTypeLabel, hasPoint, placeLabel } from '../../utils/requestSource'
import ProviderMap from './ProviderMap.vue'

const props = defineProps<{ ip: string | null | undefined; device?: RequestDevice | null; location?: RequestLocation | null }>()

const flag = computed(() => countryFlag(props.location?.country_code))
// Cloud and hosting networks: the address is a server, not a person.
const isHostingNetwork = computed(() => /vercel|amazon|google|microsoft|cloudflare|digitalocean|hetzner|ovh/i.test(props.location?.provider ?? ''))
const osmLink = computed(() => {
  const l = props.location
  return l && hasPoint(l) ? `https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=${l.city ? 10 : 5}/${l.latitude}/${l.longitude}` : '#'
})

const copied = ref(false)
async function copy() {
  if (!props.ip) return
  try {
    await navigator.clipboard.writeText(props.ip)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* clipboard blocked: the address is on screen */ }
}
</script>

<style scoped>
.source { display: flex; flex-direction: column; gap: 24px; }
.block { display: flex; flex-direction: column; gap: 12px; }
.block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.block-title { margin: 0; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
.muted { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }

.device { display: flex; align-items: center; gap: 12px; }
.device-icon {
  flex: none; width: 44px; height: 44px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--link, var(--primary));
}
.device-main { min-width: 0; }
.device-summary { margin: 0; font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); overflow-wrap: anywhere; }

.facts { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
.facts .wide { grid-column: 1 / -1; }
.facts dt { font-size: 0.8125rem; color: var(--text-secondary); }
.facts dd { margin: 2px 0 0; font-size: 0.9375rem; color: var(--text-primary); overflow-wrap: anywhere; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem; }
.ip-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.copy {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 8px;
  border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-size: 0.75rem; cursor: pointer;
}
.copy:hover { color: var(--text-primary); background: var(--hover-bg); }
.flag { font-size: 1rem; }

.raw summary { cursor: pointer; font-size: 0.8125rem; color: var(--text-secondary); }
.raw code {
  display: block; margin-top: 8px; padding: 10px 12px; border-radius: 8px; background: var(--hover-bg);
  font-size: 0.75rem; line-height: 1.5; color: var(--text-secondary); overflow-wrap: anywhere; white-space: pre-wrap;
}
.note { margin: 0; display: flex; gap: 6px; align-items: flex-start; font-size: 0.8125rem; line-height: 1.45; color: var(--text-secondary); }
.note :deep(svg) { flex: none; margin-top: 2px; }
.map-link { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: var(--link, var(--primary)); text-decoration: none; }
.map-link:hover { text-decoration: underline; }
</style>
