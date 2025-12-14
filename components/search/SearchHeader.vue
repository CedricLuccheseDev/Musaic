<script setup lang="ts">
withDefaults(defineProps<{
  showSearch?: boolean
  loading?: boolean
}>(), {
  showSearch: true,
  loading: false
})

const searchInput = defineModel<string>('modelValue', { default: '' })

const emit = defineEmits<{
  search: []
}>()

function onSearch() {
  emit('search')
}
</script>

<template>
  <PageHeader sticky>
    <template #center>
      <div v-if="showSearch" class="w-full max-w-xl">
        <SearchBar
          v-model="searchInput"
          :loading="loading"
          @search="onSearch"
        />
      </div>
    </template>
    <template #center-mobile>
      <SearchBar
        v-if="showSearch"
        v-model="searchInput"
        :loading="loading"
        @search="onSearch"
      />
    </template>
  </PageHeader>
</template>
