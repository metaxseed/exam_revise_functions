// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { 
  serveHonoFunction, 
  successResponse, 
  errorResponse, 
  handleDatabaseError,
  type HandlerContext 
} from "../utils/functionWrapper.ts"

// Subjects handler function - combines logic from subjects.ts and subjects-by-board.ts
async function handleSubjects(ctx: HandlerContext) {
  const { c, supabase } = ctx

  try {
    // Only allow GET requests
    if (c.req.method !== 'GET') {
      return c.json(errorResponse('Method not allowed'), 405)
    }

    // Get query parameters
    const url = new URL(c.req.url)
    const exam_short_name = url.searchParams.get('exam_short_name')
    const board_id = url.searchParams.get('board_id')

    if (!exam_short_name) {
      return c.json(errorResponse('exam_short_name is required'), 400)
    }

    console.log('API: Fetching exam ID for:', exam_short_name)

    // Normalize case for case-insensitive search
    const normalizedExamName = String(exam_short_name).toUpperCase()

    // First get the exam_id from the exam_short_name using case-insensitive search
    const { data: examsData, error: examError } = await supabase
      .from('exam')
      .select('exam_id, exam_short_name')
      .ilike('exam_short_name', normalizedExamName)
      .limit(1)

    if (examError) {
      console.error('Error fetching exam ID:', examError)

      // Debug: List all available exams
      const { data: allExams } = await supabase
        .from('exam')
        .select('exam_id, exam_short_name')
        .limit(10)

      console.log('Available exams:', allExams)
      
      const dbError = handleDatabaseError(examError)
      return c.json(dbError, 500)
    }

    if (!examsData || examsData.length === 0) {
      console.error('No exam found with short name:', normalizedExamName)
      return c.json(errorResponse('No exam found with the provided short name'), 404)
    }

    console.log('Found exam:', examsData[0])
    const exam_id = examsData[0].exam_id

    // Build the query for subjects
    let query = supabase
      .from('subject')
      .select(`
        *,
        board:board_id (board_short_name)
      `)
      .eq('exam_id', exam_id)

    // If board_id is provided, filter by it (subjects-by-board.ts logic)
    if (board_id) {
      if (!board_id) {
        return c.json(errorResponse('board_id is required when filtering by board'), 400)
      }
      query = query.eq('board_id', board_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subjects:', error)
      const dbError = handleDatabaseError(error)
      return c.json(dbError, 500)
    }

    // Transform the data to include board_short_name at the top level
    const transformedData = data.map((item: any) => ({
      ...item,
      board_short_name: item.board?.board_short_name || 'Unknown'
    }))

    const message = board_id 
      ? "Subjects by board retrieved successfully" 
      : "Subjects retrieved successfully"

    return c.json(successResponse(transformedData, message))
  } catch (error) {
    console.error('Error in subjects function:', error)
    return c.json(errorResponse(`Failed to fetch subjects: ${error.message}`), 500)
  }
}

// Serve the function with default configuration
serveHonoFunction(handleSubjects, {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})
