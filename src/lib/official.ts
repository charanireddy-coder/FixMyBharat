import { SupabaseClient } from '@supabase/supabase-js';
import {
  Complaint,
  ComplaintStatus,
  Department,
  UserProfile,
  ComplaintUpdate,
  Assignment,
} from '@/types';

export interface OperationalMetrics {
  total: number;
  submitted: number;
  under_review: number;
  in_progress: number;
  resolved: number;
  needs_attention: number;
}

export interface DetailedComplaint extends Complaint {
  citizen_profile?: UserProfile | null;
  assigned_official_profile?: UserProfile | null;
  department?: Department | null;
  updates?: ComplaintUpdate[];
  assignments?: Assignment[];
}

/**
 * Fetches real aggregate metrics from public.complaints
 */
export async function fetchOperationalMetrics(
  supabase: SupabaseClient
): Promise<{ metrics: OperationalMetrics; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('status');

    if (error) {
      return {
        metrics: {
          total: 0,
          submitted: 0,
          under_review: 0,
          in_progress: 0,
          resolved: 0,
          needs_attention: 0,
        },
        error: error.message,
      };
    }

    const items = (data as { status: string }[]) || [];
    const total = items.length;
    const submitted = items.filter((c) => c.status === 'submitted').length;
    const under_review = items.filter((c) => c.status === 'under_review').length;
    const in_progress = items.filter((c) => c.status === 'in_progress').length;
    const resolved = items.filter((c) => c.status === 'resolved').length;
    const needs_attention = items.filter((c) =>
      ['submitted', 'under_review', 'needs_information'].includes(c.status)
    ).length;

    return {
      metrics: {
        total,
        submitted,
        under_review,
        in_progress,
        resolved,
        needs_attention,
      },
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch metrics';
    return {
      metrics: {
        total: 0,
        submitted: 0,
        under_review: 0,
        in_progress: 0,
        resolved: 0,
        needs_attention: 0,
      },
      error: msg,
    };
  }
}

/**
 * Fetches recent active complaints requiring attention
 */
export async function fetchReportsRequiringAttention(
  supabase: SupabaseClient,
  limit = 10
): Promise<{ complaints: Complaint[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .in('status', ['submitted', 'under_review', 'needs_information', 'assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { complaints: [], error: error.message };
    }

    return { complaints: (data as Complaint[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch complaints';
    return { complaints: [], error: msg };
  }
}

/**
 * Fetches all municipal departments from public.departments
 */
export async function fetchAllDepartments(
  supabase: SupabaseClient
): Promise<{ departments: Department[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { departments: [], error: error.message };
    }

    return { departments: (data as Department[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch departments';
    return { departments: [], error: msg };
  }
}

/**
 * Fetches all assignable officials and admins from public.profiles
 */
export async function fetchAssignableOfficials(
  supabase: SupabaseClient
): Promise<{ officials: UserProfile[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['official', 'admin'])
      .order('full_name', { ascending: true });

    if (error) {
      return { officials: [], error: error.message };
    }

    return { officials: (data as UserProfile[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch assignable officials';
    return { officials: [], error: msg };
  }
}

/**
 * Fetches complete complaint details with joined operational context
 */
export async function fetchComplaintDetail(
  supabase: SupabaseClient,
  id: string
): Promise<{ complaint: DetailedComplaint | null; error: string | null }> {
  try {
    const cleanId = (id || '').trim();
    if (!cleanId) return { complaint: null, error: 'Complaint ID is required' };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    let query = supabase.from('complaints').select('*');
    if (isUuid) {
      query = query.eq('id', cleanId);
    } else if (/^\d+$/.test(cleanId.replace(/^#/, ''))) {
      query = query.eq('complaint_number', Number(cleanId.replace(/^#/, '')));
    } else {
      query = query.eq('id', cleanId);
    }

    const { data: complaintData, error: complaintErr } = await query.maybeSingle();

    if (complaintErr || !complaintData) {
      return { complaint: null, error: complaintErr?.message || 'Complaint not found' };
    }

    const complaint = complaintData as DetailedComplaint;
    const canonicalId = complaint.id;

    // Fetch related updates using canonical UUID
    const { data: updatesData } = await supabase
      .from('complaint_updates')
      .select('*')
      .eq('complaint_id', canonicalId)
      .order('created_at', { ascending: true });

    // Fetch related assignments using canonical UUID
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*')
      .eq('complaint_id', canonicalId)
      .order('assigned_at', { ascending: false });

    // Fetch department if assigned
    if (complaint.department_id) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('id', complaint.department_id)
        .maybeSingle();
      if (deptData) complaint.department = deptData as Department;
    }

    // Fetch assigned official profile if assigned
    if (complaint.assigned_to) {
      const { data: officialData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', complaint.assigned_to)
        .maybeSingle();
      if (officialData) complaint.assigned_official_profile = officialData as UserProfile;
    }

    // Fetch reporting citizen profile (permitted by RLS for officials)
    if (complaint.user_id) {
      const { data: citizenData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', complaint.user_id)
        .maybeSingle();
      if (citizenData) complaint.citizen_profile = citizenData as UserProfile;
    }

    // Attach updates with updater names if available
    const updates = (updatesData as ComplaintUpdate[]) || [];
    if (updates.length > 0) {
      const updaterIds = Array.from(new Set(updates.map((u) => u.updated_by).filter(Boolean))) as string[];
      if (updaterIds.length > 0) {
        const { data: updaters } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', updaterIds);

        const updaterMap = new Map<string, string>();
        (updaters as { id: string; full_name?: string }[] || []).forEach((u) => {
          if (u.full_name) updaterMap.set(u.id, u.full_name);
        });

        updates.forEach((u) => {
          if (u.updated_by && updaterMap.has(u.updated_by)) {
            u.updater_name = updaterMap.get(u.updated_by);
          }
        });
      }
    }
    complaint.updates = updates;
    complaint.assignments = (assignmentsData as Assignment[]) || [];

    return { complaint, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch complaint detail';
    return { complaint: null, error: msg };
  }
}

/**
 * Updates a complaint's status and automatically logs a complaint_update record
 */
export async function updateComplaintStatusWorkflow(
  supabase: SupabaseClient,
  params: {
    complaintId: string;
    newStatus: ComplaintStatus;
    oldStatus: ComplaintStatus;
    updatedBy: string;
    message: string;
    isPublic: boolean;
    resolutionNotes?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (params.newStatus === params.oldStatus) {
      return { success: false, error: 'Complaint is already in this status. No transition required.' };
    }

    const updatePayload: Record<string, unknown> = {
      status: params.newStatus,
      updated_at: new Date().toISOString(),
    };

    if (params.newStatus === 'resolved') {
      updatePayload.resolution_notes = params.resolutionNotes?.trim() || null;
      updatePayload.resolved_at = new Date().toISOString();
    } else if (params.oldStatus === 'resolved') {
      // Reopened complaint
      updatePayload.resolved_at = null;
    }

    // 1. Update complaint record
    const { error: updateErr } = await supabase
      .from('complaints')
      .update(updatePayload)
      .eq('id', params.complaintId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 2. Insert complaint update record into timeline
    const { error: logErr } = await supabase.from('complaint_updates').insert({
      complaint_id: params.complaintId,
      updated_by: params.updatedBy,
      old_status: params.oldStatus,
      new_status: params.newStatus,
      message: params.message.trim(),
      is_public: params.isPublic,
    });

    if (logErr) {
      return {
        success: false,
        error: `Complaint updated, but failed to log timeline update: ${logErr.message}`,
      };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status update failed';
    return { success: false, error: msg };
  }
}

/**
 * Assigns department and/or official to a complaint and logs to public.assignments
 */
export async function assignComplaint(
  supabase: SupabaseClient,
  params: {
    complaintId: string;
    departmentId: string | null;
    assignedToId: string | null;
    assignedById: string;
    notes?: string;
    currentDepartmentId?: string | null;
    currentAssignedToId?: string | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Update complaints table
    const { error: complaintErr } = await supabase
      .from('complaints')
      .update({
        department_id: params.departmentId,
        assigned_to: params.assignedToId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.complaintId);

    if (complaintErr) {
      return { success: false, error: complaintErr.message };
    }

    // 2. Insert into public.assignments
    const { error: assignErr } = await supabase.from('assignments').insert({
      complaint_id: params.complaintId,
      department_id: params.departmentId,
      assigned_to: params.assignedToId,
      assigned_by: params.assignedById,
      notes: params.notes?.trim() || 'Assigned for municipal operational review.',
    });

    if (assignErr) {
      return { success: true, error: null };
    }

    // 3. Add timeline entry in complaint_updates
    const noteText = params.notes?.trim()
      ? `Assignment updated: ${params.notes.trim()}`
      : 'Operational assignment updated.';

    await supabase.from('complaint_updates').insert({
      complaint_id: params.complaintId,
      updated_by: params.assignedById,
      message: noteText,
      is_public: false, // Internal official note
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Assignment failed';
    return { success: false, error: msg };
  }
}

/**
 * Adds an update message directly to public.complaint_updates
 */
export async function addComplaintUpdate(
  supabase: SupabaseClient,
  params: {
    complaintId: string;
    updatedBy: string;
    message: string;
    isPublic: boolean;
    currentStatus?: ComplaintStatus;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('complaint_updates').insert({
      complaint_id: params.complaintId,
      updated_by: params.updatedBy,
      message: params.message.trim(),
      is_public: params.isPublic,
      old_status: params.currentStatus || null,
      new_status: params.currentStatus || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to add update';
    return { success: false, error: msg };
  }
}
