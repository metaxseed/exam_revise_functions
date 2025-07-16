import { Hono } from 'https://deno.land/x/hono@v3.11.8/mod.ts'
import { cors } from 'https://deno.land/x/hono@v3.11.8/middleware.ts'
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface HonoContext {
  req: Request
  json: (data: any, status?: number) => Response
  text: (text: string, status?: number) => Response
  status: (status: number) => Response
}

export interface FunctionConfig {
  enableCors?: boolean
  enableLogging?: boolean
  allowedMethods?: string[]
  allowedOrigins?: string | string[]
}

export interface HandlerContext {
  c: HonoContext
  supabase: SupabaseClient
  env: {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
  }
}

export type HandlerFunction = (ctx: HandlerContext) => Promise<Response>

const defaultConfig: FunctionConfig = {
  enableCors: true,
  enableLogging: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedOrigins: '*'
}

export function createHonoFunction(
  handler: HandlerFunction,
  config: FunctionConfig = {}
): Hono {
  const finalConfig = { ...defaultConfig, ...config }
  const app = new Hono()

  // CORS Middleware
  if (finalConfig.enableCors) {
    app.use('*', cors({
      origin: finalConfig.allowedOrigins as string,
      allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
      allowMethods: finalConfig.allowedMethods as string[]
    }))
  }

  // Request Logging Middleware
  if (finalConfig.enableLogging) {
    app.use('*', async (c, next) => {
      console.log(`${c.req.method} ${c.req.url}`)
      await next()
    })
  }

  // Environment Variables Setup
  app.use('*', async (c, next) => {
    // Get environment variables with fallbacks
    const supabaseUrl = Deno.env.get('_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return c.json({ 
        success: false,
        error: 'Missing environment variables' 
      }, 500)
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store in context for handler
    c.set('supabase', supabase)
    c.set('env', { SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: supabaseKey })

    await next()
  })

  // API Call Logging Middleware (after Supabase client is set up)
  app.use('*', async (c, next) => {
    const startTime = Date.now()
    
    // Extract request info
    const method = c.req.method
    const url = new URL(c.req.url)
    const endpoint = url.pathname
    const userAgent = c.req.header('user-agent') || 'Unknown'
    const forwardedFor = c.req.header('x-forwarded-for')
    const realIp = c.req.header('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'Unknown'
    
    // Get function name from URL path
    // URL format: /functions/v1/[function-name]/[sub-path]
    const pathParts = endpoint.split('/')
    let functionName = 'unknown'
    if (pathParts.length >= 4 && pathParts[1] === 'functions' && pathParts[2] === 'v1') {
      functionName = pathParts[3] // Extract function name
    } else {
      // For direct calls like /boards, /themes, etc, use the first path segment
      functionName = pathParts[1] || 'unknown'
    }
    
    // Get user ID from Authorization header if present
    let userId: string | null = null
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const authHeader = c.req.header('authorization')
      if (authHeader && supabase) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id || null
      }
    } catch (error) {
      // Continue without user ID if auth fails
      console.log('Could not extract user ID:', error.message)
    }

    // Continue to handler
    await next()

    // Calculate response time
    const responseTime = Date.now() - startTime
    
    // Get response info from headers
    const response = c.res
    const statusCode = response.status || 200
    const contentLength = response.headers.get('content-length')
    const responseSize = contentLength ? parseInt(contentLength) : 0

    // Log API call to database (fire and forget)
    const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
    if (env && method !== 'OPTIONS') { // Skip OPTIONS requests
      try {
        // Create service role client for logging (has permission to insert logs)
        const serviceKey = Deno.env.get('_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (serviceKey) {
          const serviceClient = createClient(env.SUPABASE_URL, serviceKey)
          
          serviceClient
            .from('api_call_logs')
            .insert({
              function_name: functionName,
              endpoint: endpoint,
              method: method,
              status_code: statusCode,
              response_time_ms: responseTime,
              user_id: userId,
              ip_address: ipAddress,
              user_agent: userAgent,
              request_size: 0, // Could calculate from req.body if needed
              response_size: responseSize,
              error_message: statusCode >= 400 ? `HTTP ${statusCode}` : null
            })
            .then(() => {
              console.log(`✅ Logged API call: ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`)
            })
            .catch((error) => {
              console.error('❌ Failed to log API call:', error.message)
            })
        } else {
          console.log('⚠️ Service role key not found, skipping API call logging')
        }
      } catch (error) {
        console.error('❌ Error setting up API call logging:', error.message)
      }
    }
  })

  // Main handler route (catches all paths)
  app.get('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // Support other HTTP methods
  app.post('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // Support OPTIONS requests for CORS
  app.options('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // Support other HTTP methods like PUT, DELETE, etc.
  app.put('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  app.delete('/*', async (c) => {
    try {
      const supabase = c.get('supabase') as SupabaseClient
      const env = c.get('env') as { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
      
      const context: HandlerContext = {
        c: c as HonoContext,
        supabase,
        env
      }

      return await handler(context)
    } catch (error) {
      console.error('Handler error:', error)
      return c.json({ 
        success: false,
        error: `Function error: ${error.message}` 
      }, 500)
    }
  })

  // 404 Handler
  app.notFound((c) => {
    return c.json({ 
      success: false,
      error: 'Endpoint not found' 
    }, 404)
  })

  // Global Error Handler
  app.onError((error, c) => {
    console.error('Global error:', error)
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500)
  })

  return app
}

export function serveHonoFunction(
  handler: HandlerFunction,
  config: FunctionConfig = {}
): void {
  const app = createHonoFunction(handler, config)
  Deno.serve(app.fetch)
}

// Helper function for standard success responses
export function successResponse(data: any, message: string = 'Success'): any {
  return {
    success: true,
    message,
    data
  }
}

// Helper function for standard error responses
export function errorResponse(error: string, code?: string): any {
  return {
    success: false,
    error,
    ...(code && { code })
  }
}

// Helper function for handling database errors
export function handleDatabaseError(error: any): any {
  console.error('Database error:', error)
  
  // Handle specific Supabase/PostgreSQL errors
  if (error.code === 'PGRST116') {
    return errorResponse('No data found', 'NOT_FOUND')
  }
  
  if (error.code === '42P01') {
    return errorResponse('Table does not exist', 'TABLE_NOT_FOUND')
  }
  
  if (error.code === '23505') {
    return errorResponse('Duplicate entry', 'DUPLICATE_ENTRY')
  }
  
  return errorResponse(`Database error: ${error.message}`, error.code)
} 
