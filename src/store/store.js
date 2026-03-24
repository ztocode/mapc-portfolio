import { configureStore } from '@reduxjs/toolkit'
import projectsReducer from './projectsSlice'
import municipalityCollaborationsReducer from './municipalityCollaborationSlice'

export const store = configureStore({
  reducer: {
    projects: projectsReducer,
    municipalityCollaborations: municipalityCollaborationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'projects/fetchProjects/fulfilled',
          'municipalityCollaborations/fetchMunicipalityCollaborations/fulfilled'
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdTime'],
        // Ignore these paths in the state
        ignoredPaths: ['projects.data', 'municipalityCollaborations.data'],
      },
    }),
}) 