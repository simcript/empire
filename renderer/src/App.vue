<template>
  <div class="flex h-screen bg-slate-900 text-slate-200">
    <Sidebar
      :active-section="activeSection"
      @section-change="handleSectionChange"
    />
    <main class="flex-1 overflow-hidden">
      <GameGrid
        v-if="activeSection === 'library'"
        :games="games"
        :favorites="favorites"
        :controller-sensitivity="settings.controllerSensitivity"
        @launch="handleLaunch"
        @toggle-favorite="handleToggleFavorite"
        @controller-back="handleControllerBack"
      />
      <FavoritesView
        v-else-if="activeSection === 'favorites'"
        :games="favoriteGames"
        @launch="handleLaunch"
        @toggle-favorite="handleToggleFavorite"
      />
      <SettingsView
        v-else-if="activeSection === 'settings'"
        :settings="settings"
        @refresh="handleRefresh"
        @update-setting="handleSettingUpdate"
      />
      <ProgramsView
        v-else-if="activeSection === 'programs'"
        @added="handleProgramsUpdated"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import GameGrid from './components/GameGrid.vue';
import FavoritesView from './components/FavoritesView.vue';
import SettingsView from './components/SettingsView.vue';
import ProgramsView from './components/ProgramsView.vue';

const activeSection = ref('library');
const games = ref([]);
const favorites = ref([]);
const settings = ref({
  scanOnStartup: true,
  controllerSensitivity: 0.5,
});
const sectionHistory = ref([]);

const favoriteGames = computed(() => {
  return games.value.filter((game) => favorites.value.includes(game.id));
});

onMounted(async () => {
  await loadSettings();
  await loadGames();
});

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

async function loadSettings() {
  try {
    const currentSettings = await window.electronAPI.getSettings();
    settings.value = {
      scanOnStartup: currentSettings?.scanOnStartup ?? true,
      controllerSensitivity: currentSettings?.controllerSensitivity ?? 0.5,
      favorites: currentSettings?.favorites ?? [],
    };
    favorites.value = settings.value.favorites;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function handleLaunch(game) {
  try {
    
    const payload = {
      platform: game.platform,
      appId: game.appId,
      launchCommand: game.launchCommand,
      executablePath: game.executablePath,
      installLocation: game.installLocation,
      title: game.title || game.name,
    };
    const result = await window.electronAPI.launchGame(payload);
    if (!result.success) {
      alert(`Failed to launch game: ${result.error}`);
    }
  } catch (error) {
    console.error('Error launching game:', error);
    alert(`Failed to launch game: ${error.message}`);
  }
}

async function handleToggleFavorite(gameId) {
  try {
    const exists = favorites.value.includes(gameId);
    const updatedFavorites = exists
      ? favorites.value.filter((id) => id !== gameId)
      : [...favorites.value, gameId];
    favorites.value = updatedFavorites;
    await window.electronAPI.setSetting('favorites', updatedFavorites);
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

async function handleRefresh() {
  try {
    const result = await window.electronAPI.refreshGames();
    if (result.success) {
      games.value = result.games;
    }
  } catch (error) {
    console.error('Error refreshing games:', error);
  }
}

async function handleSettingUpdate(payload) {
  const { key, value } = payload;
  try {
    const result = await window.electronAPI.setSetting(key, value);
    if (result?.settings) {
      settings.value = {
        ...settings.value,
        ...result.settings,
      };
      favorites.value = result.settings.favorites ?? favorites.value;
    } else {
      settings.value = {
        ...settings.value,
        [key]: value,
      };
    }
  } catch (error) {
    console.error('Error updating setting:', error);
  }
}

function handleSectionChange(section) {
  if (section === 'exit') {
    window.electronAPI?.quitApp?.();
    return;
  }
  if (section !== activeSection.value) {
    sectionHistory.value.push(activeSection.value);
    activeSection.value = section;
  }
}

function handleControllerBack() {
  if (sectionHistory.value.length > 0) {
    const previous = sectionHistory.value.pop();
    activeSection.value = previous || 'library';
  } else if (activeSection.value !== 'library') {
    activeSection.value = 'library';
  }
}

function handleProgramsUpdated() {
  loadGames();
}
</script>



