import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Async thunk for fetching projects from Airtable
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState()
      const { lastFetch, cacheDuration } = state.projects
      
      // Check if we have cached data and it's still valid
      if (lastFetch && (Date.now() - lastFetch) < cacheDuration) {
        console.log('Using cached projects data')
        return null // Return null to indicate we should use cached data
      }

      // Get environment variables
      const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID
      const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY
      let tableName = encodeURIComponent('MAPC Project (New)')
      

      if (!baseId || !apiKey) {
        throw new Error('Missing Airtable environment variables')
      }

      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }

      let allRecords = []
      let offset = null
      let pageCount = 0

      do {
        pageCount++

        // Build the API URL with pagination
        let url = `https://api.airtable.com/v0/${baseId}/${tableName}`
        if (offset) {
          url += `?offset=${offset}`
        }

        // Make the API request
        const response = await fetch(url, { headers })
        
        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()

        // Add records from this page to our collection
        allRecords = [...allRecords, ...result.records]

        // Get the offset for the next page
        offset = result.offset

      } while (offset)

      // Transform the data
      const transformedData = allRecords.map(record => {
        const transformed = {}
        
        // Add the key field
        if (record.fields['Project Name']) {
          transformed.name = record.fields['Project Name']
        }

        // Map other fields
        const fieldMapping = {
          recordId: "Record ID",
          projectStatus: "Project Status",
          projectDescription: "Project Description",
          projectType: "Type of Project",
          client: "Client(s)",
          municipalityCollaboration: "Municipal Collaboration",
          geographicFocus: "Geographic Focus",
          mapcSubRegions: "MAPC Sub Regions Represented (Auto)",
          projectManager: "Project Manager",
          leadDepartment: "Lead Department/Team",
          internalCollaborators: "Internal Collaborators (Dept and Teams Only)",
          projectYear: "Project Year",
          startDate: "Start Date",
          anticipatedEndDate: "Anticipated End Date",
          attachmentUrls: "Attachment URLs",
          actualCompletionDate: "Actual Completion Date",
          metroCommon2050goals: "MetroCommon 2050 Goals",
        }

        Object.entries(fieldMapping).forEach(([newKey, airtableField]) => {
          if (record.fields[airtableField]) {
            transformed[newKey] = record.fields[airtableField]
          }
        })

        // Add record ID and created time
        transformed.id = record.id
        transformed.createdTime = record.createdTime

        return transformed
      })

      return transformedData

    } catch (error) {
      console.error('Error fetching projects:', error)
      return rejectWithValue(error.message)
    }
  }
)

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    data: [],
    loading: false,
    error: null,
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000, // 5 minutes in milliseconds
    viewMode: 'dashboard' // 'dashboard' or 'table'
  },
  reducers: {
    setViewMode: (state, action) => {
      state.viewMode = action.payload
    },
    clearCache: (state) => {
      state.lastFetch = null
      state.data = []
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        // Only update data if we actually fetched new data
        if (action.payload !== null) {
          state.data = action.payload
          state.lastFetch = Date.now()
        }
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { setViewMode, clearCache } = projectsSlice.actions

// Selectors
export const selectAllProjects = (state) => state.projects.data
export const selectProjectsLoading = (state) => state.projects.loading
export const selectProjectsError = (state) => state.projects.error
export const selectLastFetch = (state) => state.projects.lastFetch
export const selectViewMode = (state) => state.projects.viewMode

export default projectsSlice.reducer
