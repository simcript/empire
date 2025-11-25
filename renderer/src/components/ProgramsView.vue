<template>
  <div class="h-full overflow-hidden flex flex-col bg-slate-900 text-slate-200">
    <div class="p-8 pb-4 flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <h2 class="text-3xl font-bold text-white">All Programs <span class="text-sm text-slate-400">{{programs.length}}</span></h2>
        <p class="text-slate-400">
          Browse installed applications and add them to your library.
        </p>
      </div>
      <div class="flex flex-wrap gap-4 items-center">
        <div class="flex-1 min-w-[240px]">
          <input
            v-model="search"
            type="text"
            placeholder="Search programs..."
            class="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          @click="handlePortableAdd"
          class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="portableLoading"
        >
          {{ portableLoading ? 'Adding...' : 'Add Portable App' }}
        </button>
        <button
          @click="reloadPrograms"
          class="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
        >
          {{ loading ? 'Scanning...' : 'Rescan' }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-8 pb-8">
      <div v-if="loading" class="text-center py-16 text-slate-400">
        Scanning Windows registry for installed programs...
      </div>

      <div v-else-if="filteredPrograms.length === 0" class="text-center py-16 text-slate-400">
        No programs found matching your search.
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <div
          v-for="program in filteredPrograms"
          :key="program.id"
          class="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-4"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden"
            >
              <img
                v-if="program.iconDataUrl"
                :src="program.iconDataUrl"
                :alt="program.name"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                :style="{ backgroundImage: generatePlaceholder(program.name) }"
              >
                {{ initials(program.name) }}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-semibold truncate">{{ program.name }}</p>
              <p class="text-sm text-slate-400 truncate">
                {{ program.publisher || 'Unknown publisher' }}
              </p>
            </div>
          </div>

          <div class="text-sm text-slate-400 space-y-1">
            <p v-if="program.installLocation" class="truncate">
              {{ program.installLocation }}
            </p>
            <p v-if="program.estimatedSize">
              Size: {{ formatSize(program.estimatedSize) }}
            </p>
          </div>

          <button
            @click="handleAdd(program)"
            class="mt-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="addingId === program.id"
          >
            {{ addingId === program.id ? 'Adding...' : 'Add to Library' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['added']);

const programs = ref([]);
const games = ref([]);
const loading = ref(true);
const search = ref('');
const addingId = ref(null);
const portableLoading = ref(false);

const filteredPrograms = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return programs.value;
  return programs.value.filter((program) => {
    return (
      program.name?.toLowerCase().includes(term) ||
      program.publisher?.toLowerCase().includes(term) ||
      program.installLocation?.toLowerCase().includes(term)
    );
  });
});

async function reloadPrograms() {
  loading.value = true;
  try {
    const result = await window.electronAPI.getInstalledPrograms();
    if (result?.success) {
      programs.value = result.programs || [];
    } else {
      console.error(result?.error || 'Failed to load programs');
    }
    loadGames();
  } catch (error) {
    console.error('Failed to load installed programs:', error);
  } finally {
    loading.value = false;
  }
}

async function loadGames() {
  try {
    const result = await window.electronAPI.getGames();
    if (result.success) {
      games.value = result.games;
    }
  } catch (error) {
    console.error('Error loading games:', error);
  }
}

async function handleAdd(program) {
  try {
    const payload = {
      name: program.name,
      installLocation: program.installLocation,
      displayIcon: program.displayIcon,
      executablePath: program.executablePath || program.installLocation,
    };

    const res = await window.electronAPI.addExternalProgram(payload);

    if (!res.success) throw new Error(res.error);

    const index = games.value.findIndex(g => g.id === res.game.id);
    if (index !== -1) {
      games.value[index] = res.game;
    } else {
      games.value.push(res.game);
    }
  } catch (error) {
    console.error("Failed to add program:", error);
  }
}


async function handlePortableAdd() {
  portableLoading.value = true;
  try {
    const selection = await window.electronAPI.pickPortableExecutable();
    if (selection?.canceled || !selection?.filePath) {
      return;
    }
    const result = await window.electronAPI.addExternalExecutable(selection.filePath);
    if (!result?.success) {
      throw new Error(result?.error || 'Failed to add portable app');
    }
    emit('added');
  } catch (error) {
    console.error('Failed to add portable executable:', error);
    alert(error.message);
  } finally {
    portableLoading.value = false;
  }
}

function initials(name = '') {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.[0] || 'A').toUpperCase();
}

function generatePlaceholder(text = '') {
  const colors = ['#4338ca', '#be185d', '#0ea5e9', '#16a34a', '#ca8a04', '#7c3aed'];
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return `linear-gradient(135deg, ${color}, ${color}80)`;
}

function formatSize(sizeInKb) {
  if (!sizeInKb || Number.isNaN(sizeInKb)) return 'Unknown size';
  const sizeInMb = sizeInKb / 1024;
  if (sizeInMb < 1024) {
    return `${sizeInMb.toFixed(1)} MB`;
  }
  return `${(sizeInMb / 1024).toFixed(1)} GB`;
}

onMounted(() => {
  reloadPrograms();
});
</script>

