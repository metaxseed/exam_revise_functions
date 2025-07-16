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

// Audits handler function - handles stats, authentication logs, and author activities
async function handleAudits(ctx: HandlerContext) {
  const { c, supabase } = ctx

  try {
    // Get query parameters and path
    const url = new URL(c.req.url)
    const path = url.pathname
    const endpoint = path.split('/').pop() // Get the last part of the path

    console.log('🔍 Audits endpoint called:', {
      method: c.req.method,
      path,
      endpoint,
      url: c.req.url
    })

    // Route to different handlers based on endpoint
    if (endpoint === 'stats' || path.includes('/stats')) {
      return await handleAuditStats(ctx)
    } else if (endpoint === 'authentication' || path.includes('/authentication')) {
      return await handleAuthenticationLogs(ctx)
    } else if (endpoint === 'author-activities' || path.includes('/author-activities')) {
      return await handleAuthorActivities(ctx)
    } else if (endpoint === 'api-calls' || path.includes('/api-calls')) {
      return await handleApiCalls(ctx)
    } else {
      // Default behavior - return all available endpoints
      return c.json(successResponse({
        available_endpoints: [
          '/functions/v1/audits/stats',
          '/functions/v1/audits/authentication',
          '/functions/v1/audits/author-activities',
          '/functions/v1/audits/api-calls'
        ]
      }, "Audits API endpoints"))
    }
  } catch (error) {
    console.error('Error in audits function:', error)
    return c.json(errorResponse(`Failed to process audit request: ${error.message}`), 500)
  }
}

// Handle audit stats endpoint
async function handleAuditStats(ctx: HandlerContext) {
  const { c, supabase } = ctx

  if (c.req.method !== 'GET') {
    return c.json(errorResponse('Method not allowed'), 405)
  }

  try {
    console.log('📊 Fetching audit stats...')

    // Get today's date range
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Get yesterday's date range for comparison
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

    // Fetch today's login count from auth.audit_log_entries
    const { data: todayLogins, error: todayError } = await supabase
      .from('audit_log_entries')
      .select('id', { count: 'exact' })
      .eq('type', 'login_success')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())

    if (todayError) {
      console.error('Error fetching today logins:', todayError)
    }

    // Fetch yesterday's login count for growth calculation
    const { data: yesterdayLogins, error: yesterdayError } = await supabase
      .from('audit_log_entries')
      .select('id', { count: 'exact' })
      .eq('type', 'login_success')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())

    if (yesterdayError) {
      console.error('Error fetching yesterday logins:', yesterdayError)
    }

    // Fetch active sessions count
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .not('expires_at', 'lt', new Date().toISOString())

    if (sessionsError) {
      console.error('Error fetching active sessions:', sessionsError)
    }

    // Fetch today's content actions from audit_workflows
    const { data: contentActions, error: contentError } = await supabase
      .from('audit_workflows')
      .select('audit_id', { count: 'exact' })
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())

    if (contentError) {
      console.error('Error fetching content actions:', contentError)
    }

    // Calculate stats
    const todayLoginCount = todayLogins?.length || 0
    const yesterdayLoginCount = yesterdayLogins?.length || 0
    const loginGrowth = yesterdayLoginCount > 0 
      ? Math.round(((todayLoginCount - yesterdayLoginCount) / yesterdayLoginCount) * 100)
      : todayLoginCount > 0 ? 100 : 0

    const stats = {
      todayLogins: todayLoginCount,
      loginGrowth,
      activeSessions: activeSessions?.length || 0,
      contentActions: contentActions?.length || 0,
      apiCalls: Math.floor(Math.random() * 200) + 150 // Simulated for now
    }

    console.log('✅ Audit stats calculated:', stats)
    return c.json(successResponse(stats, "Audit statistics retrieved successfully"))

  } catch (error) {
    console.error('Error fetching audit stats:', error)
    return c.json(errorResponse(`Failed to fetch audit stats: ${error.message}`), 500)
  }
}

// Handle authentication logs endpoint
async function handleAuthenticationLogs(ctx: HandlerContext) {
  const { c, supabase } = ctx

  if (c.req.method !== 'GET') {
    return c.json(errorResponse('Method not allowed'), 405)
  }

  try {
    const url = new URL(c.req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const userId = url.searchParams.get('userId')

    console.log('🔐 Fetching authentication logs with params:', { page, limit, from, to, userId })

    const offset = (page - 1) * limit

    // Build query for authentication logs
    let query = supabase
      .from('audit_log_entries')
      .select(`
        id,
        type,
        user_id,
        ip_address,
        user_agent,
        created_at,
        payload
      `)
      .in('type', ['login_success', 'login_failure', 'logout'])
      .order('created_at', { ascending: false })

    // Apply filters
    if (from) {
      query = query.gte('created_at', from)
    }
    if (to) {
      query = query.lte('created_at', to)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Get total count
    const { count } = await supabase
      .from('audit_log_entries')
      .select('id', { count: 'exact', head: true })
      .in('type', ['login_success', 'login_failure', 'logout'])

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: authLogs, error: logsError } = await query

    if (logsError) {
      console.error('Error fetching authentication logs:', logsError)
      const dbError = handleDatabaseError(logsError)
      return c.json(dbError, 500)
    }

    // Get user details for the logs
    const userIds = [...new Set(authLogs?.map(log => log.user_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .in('id', userIds)

    // Transform logs with user data
    const transformedLogs = authLogs?.map(log => {
      const user = users?.find(u => u.id === log.user_id)
      const payload = log.payload as any
      
      return {
        id: log.id,
        action: log.type.replace('login_', '').replace('_', ' '),
        user_id: log.user_id,
        user_name: user?.raw_user_meta_data?.full_name || 'Unknown User',
        user_email: user?.email || 'Unknown Email',
        ip_address: log.ip_address || 'Unknown',
        user_agent: log.user_agent || 'Unknown',
        device_info: payload?.device_info || null,
        login_method: payload?.provider || 'email',
        created_at: log.created_at,
        status: log.type === 'login_success' ? 'success' : 
                log.type === 'login_failure' ? 'failed' : 'logout'
      }
    }) || []

    // Create chart data (last 7 days)
    const chartData = await generateAuthChartData(supabase)

    const result = {
      logs: transformedLogs,
      totalCount: count || 0,
      chartData
    }

    console.log('✅ Authentication logs fetched:', { count: transformedLogs.length, total: count })
    return c.json(successResponse(result, "Authentication logs retrieved successfully"))

  } catch (error) {
    console.error('Error fetching authentication logs:', error)
    return c.json(errorResponse(`Failed to fetch authentication logs: ${error.message}`), 500)
  }
}

// Handle author activities endpoint
async function handleAuthorActivities(ctx: HandlerContext) {
  const { c, supabase } = ctx

  if (c.req.method !== 'GET') {
    return c.json(errorResponse('Method not allowed'), 405)
  }

  try {
    const url = new URL(c.req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const userId = url.searchParams.get('userId')
    const action = url.searchParams.get('action')
    const status = url.searchParams.get('status')

    console.log('✍️ Fetching author activities with params:', { page, limit, from, to, userId, action, status })

    const offset = (page - 1) * limit

    // Build query for author activities
    let query = supabase
      .from('audit_workflows')
      .select(`
        audit_id,
        revision_id,
        user_id,
        action,
        from_status,
        to_status,
        comment,
        meta_data,
        created_at,
        users:user_id (
          user_id,
          fname,
          sname,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (from) {
      query = query.gte('created_at', from)
    }
    if (to) {
      query = query.lte('created_at', to)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (action) {
      query = query.eq('action', action)
    }
    if (status) {
      query = query.eq('to_status', status)
    }

    // Get total count
    let countQuery = supabase
      .from('audit_workflows')
      .select('audit_id', { count: 'exact', head: true })

    // Apply same filters to count query
    if (from) countQuery = countQuery.gte('created_at', from)
    if (to) countQuery = countQuery.lte('created_at', to)
    if (userId) countQuery = countQuery.eq('user_id', userId)
    if (action) countQuery = countQuery.eq('action', action)
    if (status) countQuery = countQuery.eq('to_status', status)

    const { count } = await countQuery

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: activities, error: activitiesError } = await query

    if (activitiesError) {
      console.error('Error fetching author activities:', activitiesError)
      const dbError = handleDatabaseError(activitiesError)
      return c.json(dbError, 500)
    }

    // Get content details for activities
    const revisionIds = [...new Set(activities?.map(activity => activity.revision_id).filter(Boolean))]
    const { data: revisions } = await supabase
      .from('content_revision')
      .select(`
        revision_id,
        title,
        topic_id,
        topics:topic_id (
          topic_name
        )
      `)
      .in('revision_id', revisionIds)

    // Transform activities with content data
    const transformedActivities = activities?.map(activity => {
      const user = activity.users
      const revision = revisions?.find(r => r.revision_id === activity.revision_id)
      
      return {
        audit_id: activity.audit_id,
        revision_id: activity.revision_id,
        user_id: activity.user_id,
        action: activity.action,
        from_status: activity.from_status,
        to_status: activity.to_status,
        comment: activity.comment,
        meta_data: activity.meta_data,
        created_at: activity.created_at,
        user_name: user ? `${user.fname} ${user.sname}` : 'Unknown User',
        user_email: user?.email || 'Unknown Email',
        content_title: revision?.title || 'Unknown Content',
        topic_name: revision?.topics?.topic_name || 'Unknown Topic'
      }
    }) || []

    // Create chart data and top authors
    const chartData = await generateActivityChartData(supabase)
    const topAuthors = await generateTopAuthors(supabase)

    const result = {
      activities: transformedActivities,
      totalCount: count || 0,
      chartData,
      topAuthors
    }

    console.log('✅ Author activities fetched:', { count: transformedActivities.length, total: count })
    return c.json(successResponse(result, "Author activities retrieved successfully"))

  } catch (error) {
    console.error('Error fetching author activities:', error)
    return c.json(errorResponse(`Failed to fetch author activities: ${error.message}`), 500)
  }
}

// Handle API calls logs endpoint
async function handleApiCalls(ctx: HandlerContext) {
  const { c, supabase } = ctx

  if (c.req.method !== 'GET') {
    return c.json(errorResponse('Method not allowed'), 405)
  }

  try {
    console.log('🔍 Fetching API calls data...')

    // Get query parameters
    const url = new URL(c.req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)
    const method = url.searchParams.get('method')
    const status = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const searchTerm = url.searchParams.get('search')

    const offset = (page - 1) * limit

    // Generate API calls data based on available edge functions and user sessions
    const apiCalls = await generateApiCallsData(supabase, {
      page,
      limit,
      method,
      status,
      search: searchTerm,
      endpoint: null
    })

    // Generate API metrics
    const apiMetrics = await generateApiMetrics(supabase)

    // Generate endpoint statistics
    const endpointStats = await generateEndpointStats(supabase)

    // Generate status code distribution
    const statusCodes = await generateStatusCodeDistribution(supabase)

    const result = {
      calls: apiCalls.calls,
      totalCount: apiCalls.totalCount,
      apiMetrics,
      endpointStats,
      statusCodes
    }

    console.log('✅ API calls data fetched:', { count: apiCalls.calls.length, total: apiCalls.totalCount })
    return c.json(successResponse(result, "API calls data retrieved successfully"))

  } catch (error) {
    console.error('Error fetching API calls:', error)
    return c.json(errorResponse(`Failed to fetch API calls: ${error.message}`), 500)
  }
}

// Helper function to generate authentication chart data
async function generateAuthChartData(supabase: any) {
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const { data: logins } = await supabase
      .from('audit_log_entries')
      .select('id', { count: 'exact' })
      .eq('type', 'login_success')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    const { data: logouts } = await supabase
      .from('audit_log_entries')
      .select('id', { count: 'exact' })
      .eq('type', 'logout')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    last7Days.push({
      date: date.toISOString().split('T')[0],
      logins: logins?.length || 0,
      logouts: logouts?.length || 0
    })
  }
  
  return last7Days
}

// Helper function to generate activity chart data
async function generateActivityChartData(supabase: any) {
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const { data: submissions } = await supabase
      .from('audit_workflows')
      .select('audit_id', { count: 'exact' })
      .eq('action', 'submit')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    const { data: approvals } = await supabase
      .from('audit_workflows')
      .select('audit_id', { count: 'exact' })
      .eq('action', 'accept')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    const { data: rejections } = await supabase
      .from('audit_workflows')
      .select('audit_id', { count: 'exact' })
      .eq('action', 'reject')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    const { data: publications } = await supabase
      .from('audit_workflows')
      .select('audit_id', { count: 'exact' })
      .eq('action', 'publish')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    last7Days.push({
      date: date.toISOString().split('T')[0],
      submissions: submissions?.length || 0,
      approvals: approvals?.length || 0,
      rejections: rejections?.length || 0,
      publications: publications?.length || 0
    })
  }
  
  return last7Days
}

// Helper function to generate top authors
async function generateTopAuthors(supabase: any) {
  const { data: topAuthors } = await supabase
    .from('audit_workflows')
    .select(`
      user_id,
      users:user_id (
        fname,
        sname,
        email
      )
    `)
    .limit(1000) // Get recent activities
  
  if (!topAuthors) return []
  
  // Count activities per user
  const userCounts = topAuthors.reduce((acc: any, activity: any) => {
    const userId = activity.user_id
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        user_name: activity.users ? `${activity.users.fname} ${activity.users.sname}` : 'Unknown',
        user_email: activity.users?.email || 'Unknown',
        activity_count: 0
      }
    }
    acc[userId].activity_count++
    return acc
  }, {})
  
  // Convert to array and sort by activity count
  return Object.values(userCounts)
    .sort((a: any, b: any) => b.activity_count - a.activity_count)
    .slice(0, 5) // Top 5 authors
}

// Helper function to generate API calls data from real logs
async function generateApiCallsData(supabase: any, filters: any) {
  try {
    const { page = 1, limit = 10, method, status, search, endpoint } = filters
    const offset = (page - 1) * limit

    // Build query for API call logs
    let query = supabase
      .from('api_call_logs')
      .select(`
        id,
        function_name,
        endpoint,
        method,
        status_code,
        response_time_ms,
        user_id,
        ip_address,
        user_agent,
        request_size,
        response_size,
        error_message,
        created_at
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (method && method !== 'all') {
      query = query.eq('method', method)
    }
    if (status && status !== 'all') {
      const statusCode = parseInt(status)
      if (!isNaN(statusCode)) {
        query = query.eq('status_code', statusCode)
      } else if (status.length === 1) {
        // Status filter like "2", "4", "5" for 2xx, 4xx, 5xx
        const statusRange = parseInt(status) * 100
        query = query.gte('status_code', statusRange).lt('status_code', statusRange + 100)
      }
    }
    if (search) {
      query = query.or(`endpoint.ilike.%${search}%,function_name.ilike.%${search}%`)
    }
    if (endpoint && endpoint !== 'all') {
      query = query.ilike('endpoint', `%${endpoint}%`)
    }

    // Get total count for pagination (apply same filters)
    let countQuery = supabase
      .from('api_call_logs')
      .select('id', { count: 'exact', head: true })

    // Apply same filters to count query
    if (method && method !== 'all') {
      countQuery = countQuery.eq('method', method)
    }
    if (status && status !== 'all') {
      const statusCode = parseInt(status)
      if (!isNaN(statusCode)) {
        countQuery = countQuery.eq('status_code', statusCode)
      } else if (status.length === 1) {
        const statusRange = parseInt(status) * 100
        countQuery = countQuery.gte('status_code', statusRange).lt('status_code', statusRange + 100)
      }
    }
    if (search) {
      countQuery = countQuery.or(`endpoint.ilike.%${search}%,function_name.ilike.%${search}%`)
    }
    if (endpoint && endpoint !== 'all') {
      countQuery = countQuery.ilike('endpoint', `%${endpoint}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error getting count:', countError)
    }

    console.log(`📊 API Call Logs Count: ${count}`)

    // Apply pagination
    const { data: logs, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching API call logs:', error)
      // Return empty data if table doesn't exist yet or no data
      return {
        calls: [],
        totalCount: 0
      }
    }

    console.log(`📋 API Call Logs Retrieved: ${logs?.length || 0} records`)

    // Transform data for frontend
    const calls = logs?.map(log => ({
      id: log.id,
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.status_code,
      response_time: log.response_time_ms || 0,
      user_id: log.user_id || 'anonymous',
      user_name: 'Anonymous User', // We'll fetch user names separately if needed
      ip_address: log.ip_address || 'Unknown',
      user_agent: log.user_agent || 'Unknown',
      timestamp: log.created_at,
      size: log.response_size || 0
    })) || []

    return {
      calls,
      totalCount: count || 0
    }
  } catch (error) {
    console.error('Error in generateApiCallsData:', error)
    // Return empty data on error
    return {
      calls: [],
      totalCount: 0
    }
  }
}

// Helper function to generate API metrics from real data
async function generateApiMetrics(supabase: any) {
  try {
    const now = new Date()
    const metrics = []
    
    for (let i = 6; i >= 0; i--) {
      const intervalStart = new Date(now.getTime() - (i + 1) * 5 * 60 * 1000) // 5-minute intervals
      const intervalEnd = new Date(now.getTime() - i * 5 * 60 * 1000)
      
      // Get API calls in this time interval
      const { data: logs } = await supabase
        .from('api_call_logs')
        .select('status_code, response_time_ms')
        .gte('created_at', intervalStart.toISOString())
        .lt('created_at', intervalEnd.toISOString())
      
      const requests = logs?.length || 0
      const errors = logs?.filter(log => log.status_code >= 400).length || 0
      const avgResponse = logs?.length > 0 
        ? Math.round(logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logs.length)
        : 0
      
      metrics.push({
        time: intervalEnd.toTimeString().slice(0, 5), // HH:MM format
        requests,
        errors,
        avg_response: avgResponse
      })
    }
    
    return metrics
  } catch (error) {
    console.error('Error generating API metrics:', error)
    return []
  }
}

// Helper function to generate endpoint statistics from real data
async function generateEndpointStats(supabase: any) {
  try {
    // Get all API calls grouped by endpoint
    const { data: logs } = await supabase
      .from('api_call_logs')
      .select('endpoint, status_code, response_time_ms')
      .order('created_at', { ascending: false })
      .limit(1000) // Last 1000 calls for stats
    
    if (!logs || logs.length === 0) {
      return []
    }
    
    // Group by endpoint and calculate stats
    const endpointMap = new Map()
    
    logs.forEach(log => {
      const endpoint = log.endpoint
      if (!endpointMap.has(endpoint)) {
        endpointMap.set(endpoint, {
          endpoint,
          calls: 0,
          totalTime: 0,
          errors: 0
        })
      }
      
      const stats = endpointMap.get(endpoint)
      stats.calls++
      stats.totalTime += log.response_time_ms || 0
      if (log.status_code >= 400) {
        stats.errors++
      }
    })
    
    // Convert to array and calculate final stats
    const endpoints = Array.from(endpointMap.values()).map(stats => ({
      endpoint: stats.endpoint,
      calls: stats.calls,
      avg_time: stats.calls > 0 ? Math.round(stats.totalTime / stats.calls) : 0,
      error_rate: stats.calls > 0 ? Number(((stats.errors / stats.calls) * 100).toFixed(1)) : 0
    }))
    
    // Sort by call count descending
    endpoints.sort((a, b) => b.calls - a.calls)
    
    return endpoints.slice(0, 10) // Top 10 endpoints
  } catch (error) {
    console.error('Error generating endpoint stats:', error)
    return []
  }
}

// Helper function to generate status code distribution from real data
async function generateStatusCodeDistribution(supabase: any) {
  try {
    // Get all status codes from API call logs
    const { data: logs } = await supabase
      .from('api_call_logs')
      .select('status_code')
      .order('created_at', { ascending: false })
      .limit(1000) // Last 1000 calls for distribution
    
    if (!logs || logs.length === 0) {
      return []
    }
    
    // Count status codes
    const statusCodeMap = new Map()
    logs.forEach(log => {
      const code = log.status_code.toString()
      statusCodeMap.set(code, (statusCodeMap.get(code) || 0) + 1)
    })
    
    const totalCalls = logs.length
    
    // Convert to array with percentages
    const statusCodes = Array.from(statusCodeMap.entries())
      .map(([code, count]) => ({
        code,
        count,
        percentage: Number(((count / totalCalls) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
    
    return statusCodes
  } catch (error) {
    console.error('Error generating status code distribution:', error)
    return []
  }
}

// Serve the function with default configuration
serveHonoFunction(handleAudits, {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
})
