import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Async thunk for fetching municipality collaboration data from Airtable
export const fetchMunicipalityCollaborations = createAsyncThunk(
  'municipalityCollaborations/fetchMunicipalityCollaborations',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState()
      const { lastFetch, cacheDuration } = state.municipalityCollaborations

      // Check cache first
      if (lastFetch && (Date.now() - lastFetch) < cacheDuration) {
        console.log('Using cached municipality collaboration data')
        return null
      }

      // Same Airtable base/key setup as projectsSlice
      const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID
      const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY
      const tableName = encodeURIComponent('Municipalities and Municipal Coalitions')

      if (!baseId || !apiKey) {
        throw new Error('Missing Airtable environment variables')
      }

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }

      let allRecords = []
      let offset = null

      do {
        let url = `https://api.airtable.com/v0/${baseId}/${tableName}`
        if (offset) {
          url += `?offset=${offset}`
        }

        const response = await fetch(url, { headers })
        if (!response.ok) {
          console.error('Airtable API error:', response)
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        allRecords = [...allRecords, ...result.records]
        offset = result.offset
      } while (offset)

      const fieldMapping = {
        muni: 'Municipality',
        totalProjects: 'Total Projects',
        isMuni: 'Muni',
        isSubregion: 'IsSubregion',
        mapcSubRegion: 'MAPC Sub Region',
        munis: 'munis',
        projectsIDlist: "Projects",
        involvedProjects:"Project Name (from Projects)"
      }

      const transformedData = allRecords.map((record) => {
        const transformed = {}
        Object.entries(fieldMapping).forEach(([newKey, airtableField]) => {
            transformed[newKey] = record.fields[airtableField] || null
        })

        transformed.id = record.id
        transformed.createdTime = record.createdTime
      
        return transformed
      })
      return transformedData
    } catch (error) {
      console.error('Error fetching municipality collaboration data:', error)
      return rejectWithValue(error.message)
    }
  }
)

const municipalityCollaborationSlice = createSlice({
  name: 'municipalityCollaborations',
  initialState: {
    data: [],
    loading: false,
    error: null,
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000
  },
  reducers: {
    clearMunicipalityCollaborationCache: (state) => {
      state.lastFetch = null
      state.data = []
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMunicipalityCollaborations.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMunicipalityCollaborations.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload !== null) {
          state.data = action.payload
          state.lastFetch = Date.now()
        }
      })
      .addCase(fetchMunicipalityCollaborations.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { clearMunicipalityCollaborationCache } = municipalityCollaborationSlice.actions

// Selectors
export const selectAllMunicipalityCollaborations = (state) => state.municipalityCollaborations.data
export const selectMunicipalityCollaborationsLoading = (state) => state.municipalityCollaborations.loading
export const selectMunicipalityCollaborationsError = (state) => state.municipalityCollaborations.error
export const selectMunicipalityCollaborationsLastFetch = (state) => state.municipalityCollaborations.lastFetch

export default municipalityCollaborationSlice.reducer

