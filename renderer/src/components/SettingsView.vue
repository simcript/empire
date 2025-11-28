<template>
  <div class="h-full overflow-y-auto p-8">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-white mb-2">Settings</h2>
      <p class="text-slate-400">Configure Mag to match your library and controller preferences.</p>
    </div>

    <div class="max-w-2xl space-y-6">
      <div class="bg-slate-800 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-semibold text-white">Scan on Startup</h3>
            <p class="text-slate-400 text-sm mt-1">
              Automatically refresh Steam, Epic, and GOG libraries when launching Mag.
            </p>
          </div>
          <label class="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="localScanOnStartup"
              @change="handleScanToggle"
            />
            <span
              class="w-14 h-8 rounded-full transition-colors"
              :class="localScanOnStartup ? 'bg-blue-600' : 'bg-slate-600'"
            >
              <span
                class="absolute mt-1 ml-1 w-6 h-6 rounded-full bg-white transition-all"
                :class="localScanOnStartup ? 'translate-x-6' : 'translate-x-0'"
              ></span>
            </span>
          </label>
        </div>
        <button
          @click="handleRefresh"
          :disabled="refreshing"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ refreshing ? 'Refreshing...' : 'Refresh Game Library Now' }}
        </button>
        <p class="text-slate-500 text-xs">
          Last selected library folders are stored securely using electron-store.
        </p>
      </div>

      <div class="bg-slate-800 rounded-lg p-6 space-y-4">
        <h3 class="text-xl font-semibold text-white">Controller Sensitivity</h3>
        <p class="text-slate-400 text-sm">
          Adjust how much stick movement is required before the selection moves inside the grid.
        </p>
        <div class="flex items-center gap-4">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            :value="localControllerSensitivity"
            @input="handleSensitivityChange"
            class="flex-1 accent-blue-500"
          />
          <span class="text-white font-semibold w-12 text-right">
            {{ localControllerSensitivity.toFixed(1) }}
          </span>
        </div>
        <ul class="text-slate-300 text-sm space-y-1 list-disc list-inside">
          <li>D-Pad / Left Stick: Navigate games</li>
          <li>A Button: Launch selected game</li>
          <li>B Button: Go back to the previous view</li>
        </ul>
      </div>

      <div class="bg-slate-800 rounded-lg p-6">
        <h3 class="text-xl font-semibold text-white mb-4">About</h3>
        <p class="text-slate-400 text-sm">Mag Game Launcher v1.0.0</p>
        <p class="text-slate-400 text-sm mt-2">
          A modern Windows launcher that keeps Steam, Epic Games Store, and GOG Galaxy libraries
          together.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({
      scanOnStartup: true,
      controllerSensitivity: 0.5,
    }),
  },
})

const emit = defineEmits(['refresh', 'update-setting'])

const refreshing = ref(false)
const localScanOnStartup = ref(props.settings.scanOnStartup ?? true)
const localControllerSensitivity = ref(props.settings.controllerSensitivity ?? 0.5)

watch(
  () => props.settings.scanOnStartup,
  (value) => {
    localScanOnStartup.value = value ?? true
  }
)

watch(
  () => props.settings.controllerSensitivity,
  (value) => {
    localControllerSensitivity.value = value ?? 0.5
  }
)

async function handleRefresh() {
  refreshing.value = true
  try {
    emit('refresh')
    await new Promise((resolve) => setTimeout(resolve, 500))
  } finally {
    refreshing.value = false
  }
}

function handleScanToggle(event) {
  const value = event.target.checked
  localScanOnStartup.value = value
  emit('update-setting', { key: 'scanOnStartup', value })
}

function handleSensitivityChange(event) {
  const value = Number(event.target.value)
  localControllerSensitivity.value = value
  emit('update-setting', { key: 'controllerSensitivity', value })
}
</script>
