<template>
  <div class="h-full overflow-y-auto p-8">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-white mb-2">Game Library</h2>
      <p class="text-slate-400">{{ games.length }} games found</p>
    </div>
    
    <div 
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
      ref="gridRef"
    >
      <GameCard
        v-for="(game, index) in games"
        :key="game.id"
        :game="game"
        :index="index"
        :is-favorite="favorites.includes(game.id)"
        :is-selected="selectedIndex === index"
        @click="selectGame(index)"
        @launch="handleLaunch"
        @toggle-favorite="handleToggleFavorite"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import GameCard from './GameCard.vue';

const props = defineProps({
  games: {
    type: Array,
    default: () => [],
  },
  favorites: {
    type: Array,
    default: () => [],
  },
  controllerSensitivity: {
    type: Number,
    default: 0.5,
  },
});

const emit = defineEmits(['launch', 'toggle-favorite', 'controller-back']);

const gridRef = ref(null);
const selectedIndex = ref(0);
const columns = ref(6);
const NAVIGATION_COOLDOWN_MS = 160;
let lastNavigationTime = 0;

function selectGame(index) {
  selectedIndex.value = index;
}

function handleLaunch(game) {
  emit('launch', game);
}

function handleToggleFavorite(gameId) {
  emit('toggle-favorite', gameId);
}

function updateColumns() {
  if (gridRef.value) {
    const width = gridRef.value.offsetWidth;
    if (width < 640) columns.value = 2;
    else if (width < 768) columns.value = 3;
    else if (width < 1024) columns.value = 4;
    else if (width < 1280) columns.value = 5;
    else columns.value = 6;
  }
}

function moveSelection(delta) {
  if (!props.games.length) return;
  const nextIndex = Math.min(
    props.games.length - 1,
    Math.max(0, selectedIndex.value + delta),
  );
  if (nextIndex !== selectedIndex.value) {
    selectedIndex.value = nextIndex;
    scrollToSelected();
  }
}

function moveVertical(deltaRows) {
  moveSelection(deltaRows * columns.value);
}

let rafId = null;
const lastButtonStates = {
  buttonA: false,
  buttonB: false,
};

function processGamepadInput(gamepad) {
  const deadzone = Math.min(1, Math.max(0.1, props.controllerSensitivity || 0.5));
  const axesX = gamepad.axes[0] || 0;
  const axesY = gamepad.axes[1] || 0;

  const dpadLeft = gamepad.buttons[14]?.pressed;
  const dpadRight = gamepad.buttons[15]?.pressed;
  const dpadUp = gamepad.buttons[12]?.pressed;
  const dpadDown = gamepad.buttons[13]?.pressed;

  const now = performance.now();
  if (now - lastNavigationTime > NAVIGATION_COOLDOWN_MS) {
    if (dpadLeft || axesX < -deadzone) {
      moveSelection(-1);
      lastNavigationTime = now;
    } else if (dpadRight || axesX > deadzone) {
      moveSelection(1);
      lastNavigationTime = now;
    } else if (dpadUp || axesY < -deadzone) {
      moveVertical(-1);
      lastNavigationTime = now;
    } else if (dpadDown || axesY > deadzone) {
      moveVertical(1);
      lastNavigationTime = now;
    }
  }

  const buttonAPressed = Boolean(gamepad.buttons[0]?.pressed);
  if (buttonAPressed && !lastButtonStates.buttonA && props.games[selectedIndex.value]) {
    handleLaunch(props.games[selectedIndex.value]);
  }
  lastButtonStates.buttonA = buttonAPressed;

  const buttonBPressed = Boolean(gamepad.buttons[1]?.pressed);
  if (buttonBPressed && !lastButtonStates.buttonB) {
    emit('controller-back');
  }
  lastButtonStates.buttonB = buttonBPressed;
}

function pollGamepads() {
  const gamepads = navigator.getGamepads?.();
  if (gamepads && gamepads[0]) {
    processGamepadInput(gamepads[0]);
  }
  rafId = requestAnimationFrame(pollGamepads);
}

function scrollToSelected() {
  if (gridRef.value) {
    const cards = gridRef.value.querySelectorAll('[data-game-index]');
    const selectedCard = cards[selectedIndex.value];
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

watch(
  () => props.games.length,
  () => {
    if (selectedIndex.value > props.games.length - 1) {
      selectedIndex.value = Math.max(0, props.games.length - 1);
    }
  }
);

onMounted(() => {
  updateColumns();
  window.addEventListener('resize', updateColumns);
  rafId = requestAnimationFrame(pollGamepads);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateColumns);
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
});
</script>

