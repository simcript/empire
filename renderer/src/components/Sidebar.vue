<template>
  <aside class="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
    <div class="p-6 border-b border-slate-700">
      <h1 class="text-2xl font-bold text-white">Empire</h1>
      <p class="text-sm text-slate-400 mt-1">Game Launcher</p>
    </div>
    
    <nav class="flex-1 p-4">
      <button
        v-for="section in sections"
        :key="section.id"
        @click="$emit('section-change', section.id)"
        :class="[
          'w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors',
          activeSection === section.id
            ? 'bg-slate-700 text-white'
            : 'text-slate-300 hover:bg-slate-700/50'
        ]"
      >
        <span class="mr-3">{{ section.icon }}</span>
        {{ section.label }}
      </button>
    </nav>
  </aside>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  activeSection: {
    type: String,
    required: true,
  },
});

defineEmits(['section-change']);

const sections = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'favorites', label: 'Favorites', icon: '⭐' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'exit', label: 'Exit', icon: '🚪' },
];
</script>



