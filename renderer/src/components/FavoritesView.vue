<template>
  <div class="h-full overflow-y-auto p-8">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-white mb-2">Favorites</h2>
      <p class="text-slate-400">{{ games.length }} favorite games</p>
    </div>
    
    <div v-if="games.length === 0" class="text-center py-16">
      <p class="text-slate-400 text-lg">No favorite games yet</p>
      <p class="text-slate-500 text-sm mt-2">Add games to favorites from the Library</p>
    </div>
    
    <div 
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
    >
      <GameCard
        v-for="(game, index) in games"
        :key="game.id"
        :game="game"
        :index="index"
        :is-favorite="true"
        :is-selected="false"
        @launch="handleLaunch"
        @toggle-favorite="handleToggleFavorite"
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import GameCard from './GameCard.vue';

const props = defineProps({
  games: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['launch', 'toggle-favorite']);

function handleLaunch(game) {
  emit('launch', game);
}

function handleToggleFavorite(gameId) {
  emit('toggle-favorite', gameId);
}
</script>



