import { supabase as browserClient } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * All database calls now require a userId to ensure data isolation.
 */

export interface Database {
  projects: any[];
  designers: any[];
  clients: any[];
  settings: any;
  products: any[];
}

const defaultDb: Database = {
  projects: [],
  designers: [],
  clients: [],
  settings: {},
  products: []
};

/**
 * Reads the entire database for a specific user
 */
export async function readDb(userId: string, customClient?: SupabaseClient): Promise<Database> {
  if (!userId) return defaultDb;

  const supabase = customClient || browserClient;

  try {
    const [projects, designers, clients, settings, products] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId).order('createdAt', { ascending: false }),
      supabase.from('designers').select('*').eq('user_id', userId).order('createdAt', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', userId).order('createdAt', { ascending: false }),
      supabase.from('settings').select('*').eq('user_id', userId).limit(1),
      supabase.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (projects.error) console.error('Projects fetch error:', projects.error);
    if (designers.error) console.error('Designers fetch error:', designers.error);
    if (clients.error) console.error('Clients fetch error:', clients.error);
    if (settings.error) console.error('Settings fetch error:', settings.error);
    if (products.error) console.error('Products fetch error:', products.error);

    const projectsData = projects.data || [];
    
    // Auto-healing logic: ensure all projects have sequential CAD/YY-YY/XXXX series orderIds
    const sortedProjects = [...projectsData].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (parseFloat(a.id) || 0);
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (parseFloat(b.id) || 0);
      return dateA - dateB;
    });

    const fyCounters: Record<string, number> = {};
    const updates: Promise<any>[] = [];
    let needsUpdate = false;

    // Pass 1: scan and initialize financial year counters based on existing valid series
    sortedProjects.forEach(p => {
      if (p.orderId && !p.orderId.startsWith('ORD-') && p.orderId !== 'Pending') {
        const projectDate = p.createdAt ? new Date(p.createdAt) : (p.id ? new Date(parseFloat(p.id)) : new Date());
        const year = projectDate.getFullYear();
        const month = projectDate.getMonth();
        let fyStart = year;
        let fyEnd = year + 1;
        if (month < 3) {
          fyStart = year - 1;
          fyEnd = year;
        }
        const fyString = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;
        
        const match = p.orderId.match(/CAD\/\d{2}-\d{2}\/(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > (fyCounters[fyString] || 0)) {
            fyCounters[fyString] = num;
          }
        }
      }
    });

    // Pass 2: assign sequential IDs to projects that have default or empty orderIds
    sortedProjects.forEach(p => {
      const projectDate = p.createdAt ? new Date(p.createdAt) : (p.id ? new Date(parseFloat(p.id)) : new Date());
      const year = projectDate.getFullYear();
      const month = projectDate.getMonth();
      let fyStart = year;
      let fyEnd = year + 1;
      if (month < 3) {
        fyStart = year - 1;
        fyEnd = year;
      }
      const fyString = `${fyStart.toString().slice(-2)}-${fyEnd.toString().slice(-2)}`;

      const isRandomOrEmpty = !p.orderId || p.orderId.startsWith('ORD-') || p.orderId === 'Pending';
      
      if (isRandomOrEmpty) {
        fyCounters[fyString] = (fyCounters[fyString] || 0) + 1;
        const serialNo = fyCounters[fyString].toString().padStart(4, '0');
        const correctOrderId = `CAD/${fyString}/${serialNo}`;
        
        p.orderId = correctOrderId;
        needsUpdate = true;
        
        updates.push(
          (async () => {
            const { error } = await supabase
              .from('projects')
              .update({ orderId: correctOrderId })
              .eq('id', p.id)
              .eq('user_id', userId);
            if (error) {
              console.error(`Error updating project ${p.id} orderId:`, error.message);
            }
          })()
        );
      }
    });

    if (needsUpdate && updates.length > 0) {
      await Promise.all(updates);
    }

    return {
      projects: projectsData,
      designers: designers.data || [],
      clients: clients.data || [],
      settings: settings.data?.[0] || {},
      products: products.data || [],
    };
  } catch (error) {
    console.error('Unexpected error in readDb:', error);
    return defaultDb;
  }
}

/**
 * Insert a new record tied to a specific user
 */
export async function insertRecord(table: string, data: any, userId: string, customClient?: SupabaseClient) {
  if (!userId) throw new Error('Authentication required');
  const supabase = customClient || browserClient;
  const { error } = await supabase.from(table).insert({ ...data, user_id: userId });
  if (error) throw new Error(`Insert failed: ${error.message}`);
}

/**
 * Update a record by id (isolation handled by eq('user_id'))
 */
export async function updateRecord(table: string, id: string, data: any, userId: string, customClient?: SupabaseClient) {
  if (!userId) throw new Error('Authentication required');
  const supabase = customClient || browserClient;
  const { error } = await supabase.from(table).update(data).eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Update failed: ${error.message}`);
}

/**
 * Delete a record by id
 */
export async function deleteRecord(table: string, id: string, userId: string, customClient?: SupabaseClient) {
  if (!userId) throw new Error('Authentication required');
  const supabase = customClient || browserClient;
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function upsertSettings(data: any, userId: string, customClient?: SupabaseClient) {
  if (!userId) throw new Error('Authentication required');
  const supabase = customClient || browserClient;
  
  // 1. Check for existing record
  const { data: records } = await supabase
    .from('settings')
    .select('id')
    .eq('user_id', userId);

  if (records && records.length > 0) {
    // 2. Update existing
    const { error } = await supabase.from('settings').update(data).eq('user_id', userId);
    if (error) throw new Error(`Settings update failed: ${error.message}`);
  } else {
    // 3. Insert new with manual ID increment (Fallback for non-serial PK)
    const { data: maxRow } = await supabase
      .from('settings')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    const nextId = (maxRow?.[0]?.id || 0) + 1;
    
    const { error } = await supabase.from('settings').insert({ 
      ...data, 
      id: nextId,
      user_id: userId 
    });
    if (error) throw new Error(`Settings insert failed: ${error.message}`);
  }
}
