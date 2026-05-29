import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/audit-logs
 * 
 * Reads from the immutable `audit_events` table populated by Postgres triggers.
 * Supports pagination, filtering by table_name, action, and actor_role.
 * 
 * Query params:
 *   page     - 1-indexed page number (default 1)
 *   per_page - items per page, max 100 (default 25)
 *   table    - filter by table_name (e.g. 'sessions', 'profiles')
 *   action   - filter by action (e.g. 'INSERT', 'UPDATE', 'DELETE')
 *   role     - filter by actor_role (e.g. 'admin', 'mentor', 'mentee')
 */
export async function GET(request: Request) {
  try {
    // 1. Auth + admin role check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '50', 10)))
    const tableFilter = searchParams.get('table')
    const actionFilter = searchParams.get('action')
    const roleFilter = searchParams.get('role')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const adminClient = createAdminClient()

    // 3. Build query against audit_events
    let query = adminClient
      .from('audit_events')
      .select('id, event_time, actor_id, actor_role, action, table_name, record_id, old_values, new_values', { count: 'exact' })
      .order('event_time', { ascending: false })

    if (tableFilter) query = query.eq('table_name', tableFilter)
    if (actionFilter) query = query.eq('action', actionFilter)
    if (roleFilter) query = query.eq('actor_role', roleFilter)
    if (dateFrom) query = query.gte('event_time', dateFrom)
    if (dateTo) query = query.lte('event_time', dateTo)

    // Pagination
    const from = (page - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data: events, error: queryError, count } = await query

    if (queryError) {
      console.error('Audit events query error:', queryError)
      return NextResponse.json({ error: 'Failed to fetch audit events' }, { status: 500 })
    }

    // 4. Resolve actor names in bulk
    const actorIds = [...new Set((events || []).map(e => e.actor_id).filter(Boolean))]
    let actorMap: Record<string, string> = {}

    if (actorIds.length > 0) {
      const { data: actors } = await adminClient
        .from('profiles')
        .select('id, name')
        .in('id', actorIds)

      if (actors) {
        actorMap = Object.fromEntries(actors.map(a => [a.id, a.name || 'Unknown']))
      }
    }

    // 5. Transform to frontend-friendly format
    const logs = (events || []).map(e => ({
      id: e.id,
      timestamp: e.event_time,
      action: formatAction(e.action, e.table_name, e.old_values, e.new_values),
      performed_by: actorMap[e.actor_id] || 'System',
      type: e.table_name,
      raw_action: e.action,
      actor_role: e.actor_role,
      record_id: e.record_id,
    }))

    return NextResponse.json({
      logs,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / perPage)
      }
    })

  } catch (error: any) {
    console.error('Audit logs error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

/**
 * Generates a human-readable description from a raw audit event.
 */
function formatAction(
  action: string,
  tableName: string,
  oldValues: any,
  newValues: any
): string {
  const friendlyTable: Record<string, string> = {
    sessions: 'Session',
    profiles: 'Profile',
    mentor_assignments: 'Mentor Assignment',
    portfolio_ratings: 'Portfolio Rating',
    fortnightly_attendance: 'Attendance Record',
    career_counselling: 'Career Counselling',
    session_course_ratings: 'Course Rating',
    session_facility_feedback: 'Facility Feedback',
    enrollments: 'Enrollment',
  }

  const entity = friendlyTable[tableName] || tableName

  switch (action) {
    case 'INSERT':
      return describeInsert(entity, tableName, newValues)
    case 'UPDATE':
      return describeUpdate(entity, tableName, oldValues, newValues)
    case 'DELETE':
      return `${entity} record deleted`
    default:
      return `${action} on ${entity}`
  }
}

function describeInsert(entity: string, table: string, newVals: any): string {
  if (!newVals) return `New ${entity} created`

  if (table === 'sessions') {
    const status = newVals.status || 'draft'
    return `New ${entity} created (${status})`
  }
  if (table === 'profiles') {
    return `New ${entity} registered: ${newVals.name || 'unnamed'} (${newVals.role || 'unknown'})`
  }
  return `New ${entity} created`
}

function describeUpdate(entity: string, table: string, oldVals: any, newVals: any): string {
  if (!oldVals || !newVals) return `${entity} updated`

  if (table === 'sessions') {
    if (oldVals.status !== newVals.status) {
      return `${entity} status changed: ${oldVals.status || 'draft'} → ${newVals.status}`
    }
    if (!oldVals.mentor_signed_off && newVals.mentor_signed_off) {
      return `${entity} signed off by mentor`
    }
    if (!oldVals.student_acknowledged_at && newVals.student_acknowledged_at) {
      return `${entity} acknowledged by student`
    }
    return `${entity} updated`
  }

  return `${entity} updated`
}
