import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { 
  serveHonoFunction, 
  successResponse, 
  errorResponse, 
  handleDatabaseError,
  type HandlerContext 
} from "../utils/functionWrapper.ts"

// Theme handler function - focused only on business logic
async function handleThemes(ctx: HandlerContext) {
  const { c, supabase } = ctx

  try {
    // Fetch theme configuration from database
    const { data, error } = await supabase
      .from('themes')
      .select('configs, version, updated_at, is_active, change_description, modified_by')
      .eq('area', 'content')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Theme fetch error:', error)
      
      // Return fallback if no theme found
      if (error.code === 'PGRST116') {
        return c.json(successResponse({
          configs: {
            theme: "default",
            colors: {
              primary: "#3b82f6",
              secondary: "#64748b"
            }
          },
          version: 0,
          updated_at: new Date().toISOString(),
          source: 'fallback'
        }, "No theme configuration found, using fallback"))
      }
      
      // Handle other database errors
      const dbError = handleDatabaseError(error)
      return c.json(dbError, 500)
    }

    // Return successful theme configuration
    return c.json(successResponse({
      configs: data.configs,
      version: data.version || 0,
      updated_at: data.updated_at,
      modified_by: data.modified_by,
      change_description: data.change_description,
      is_active: data.is_active,
      source: 'supabase'
    }, "Theme configuration retrieved successfully"))

  } catch (error) {
    console.error('Theme API error:', error)
    return c.json(errorResponse(`Failed to fetch theme configuration: ${error.message}`), 500)
  }
}

// Serve the function with default configuration
serveHonoFunction(handleThemes, {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'OPTIONS']
})
