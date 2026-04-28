// Notes-feature-specific storage keys
// Auth keys live in src/shared/utils/storage.ts

export const NOTES_STORAGE_KEYS = {
  FOLDER: 'justme_notes_folder_id',
  IMAGES_FOLDER: 'justme_images_folder_id',
  VIDEOS_FOLDER: 'justme_videos_folder_id',
  CACHE: 'justme_notes_cache',
  LAST_NOTE: 'justme_last_note',
} as const
