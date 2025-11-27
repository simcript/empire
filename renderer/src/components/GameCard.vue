<template>
  
        <div :data-game-index="index"
              @click="$emit('click')"
              @dblclick="$emit('launch', game)"
              class="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-4"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden"
            >
              <img
                v-if="game.coverPath"
                :src="game.coverPath"
                :alt="game.title"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                :style="{ backgroundImage: generatePlaceholder(game.title) }"
              >
                {{ initials(game.title) }}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-semibold truncate">{{ game.title }}</p>
              <p class="text-sm text-slate-400 truncate">
                {{ game.publisher || 'Unknown publisher' }}
              </p>
            </div>
          </div>

          <div class="text-sm text-slate-400 space-y-1">
            <p v-if="game.installLocation" class="truncate">
              {{ game.installLocation }}
            </p>
            <p v-if="game.estimatedSize">
              Size: {{ formatSize(game.estimatedSize) }}
            </p>
          </div>
          <div class="mt-auto flex gap-2 items-center">
            <button
              @click.stop="$emit('toggle-favorite', game.id)"
              :class="[
                'w-10 h-10 rounded-md flex items-center justify-center transition border',
                isFavorite
                  ? 'bg-yellow-500 border-yellow-500 text-white'
                  : 'bg-transparent border-yellow-500 text-yellow-500 hover:bg-yellow-500/20'
              ]"
            >
  ⭐
</button>

  <button
    class="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
    
    @click="$emit('launch', game)"
    >
    Play
  </button>
</div>

        </div>

</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  game: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['click', 'launch', 'toggle-favorite']);

const placeholderCache = new Map();


function generatePlaceholder(text = '') {
  const colors = ['#4338ca', '#be185d', '#0ea5e9', '#16a34a', '#ca8a04', '#7c3aed'];
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return `linear-gradient(135deg, ${color}, ${color}80)`;
}

function initials(name = '') {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.[0] || 'A').toUpperCase();
}

function getPlatformClass(platform) {
  const classes = {
    steam: 'bg-blue-600 text-white',
    epic: 'bg-purple-600 text-white',
    gog: 'bg-yellow-600 text-black',
  };
  return classes[platform] || 'bg-slate-600 text-white';
}
</script>

