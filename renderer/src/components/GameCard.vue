<template>
  <div
    :data-game-index="index"
    @click="$emit('click')"
    @dblclick="$emit('launch', game)"
    :class="[
      'relative bg-slate-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200',
      isSelected ? 'ring-4 ring-blue-500 scale-105' : 'hover:scale-105 hover:shadow-xl',
      'hover:bg-slate-700'
    ]"
  >
    <div class="aspect-[3/4] relative bg-gradient-to-br from-slate-700 to-slate-900">
      <img
        v-if="game.coverPath"
        :src="game.coverPath"
        :alt="game.title"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center p-4"
        :style="{ backgroundImage: `url('${generatePlaceholder(game.title)}')` }"
      >
        <p class="text-white font-bold text-center text-sm leading-tight">
          {{ game.title }}
        </p>
      </div>
      
      <div class="absolute top-2 right-2">
        <button
          @click.stop="$emit('toggle-favorite', game.id)"
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
            isFavorite
              ? 'bg-yellow-500 text-white'
              : 'bg-black/50 text-slate-300 hover:bg-black/70'
          ]"
        >
          ⭐
        </button>
      </div>
      
      <div class="absolute bottom-2 left-2">
        <span
          class="px-2 py-1 text-xs font-semibold rounded"
          :class="getPlatformClass(game.platform)"
        >
          {{ game.platform.toUpperCase() }}
        </span>
      </div>
    </div>
    
    <div class="p-3">
      <h3 class="text-sm font-semibold text-white truncate">{{ game.title }}</h3>
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
  if (placeholderCache.has(text)) {
    return placeholderCache.get(text);
  }

  const colors = ['#4338ca', '#be185d', '#0ea5e9', '#16a34a', '#ca8a04', '#7c3aed'];
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  const sanitizedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="100%" height="100%" fill="${color}" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="32">${sanitizedText}</text></svg>`;
  const encoded =
    typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function'
      ? globalThis.btoa(unescape(encodeURIComponent(svg)))
      : typeof Buffer !== 'undefined'
        ? Buffer.from(svg).toString('base64')
        : '';
  const dataUri = `data:image/svg+xml;base64,${encoded}`;
  placeholderCache.set(text, dataUri);
  return dataUri;
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

