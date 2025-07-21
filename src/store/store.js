import { configureStore } from '@reduxjs/toolkit'
import projectsReducer from './projectsSlice'

export const store = configureStore({
  reducer: {
    projects: projectsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['projects/fetchProjects/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdTime'],
        // Ignore these paths in the state
        ignoredPaths: ['projects.data'],
      },
    }),
}) 