import { supabase, unwrap } from './client.js'

export async function listCategories(userId, projectId) {
  return unwrap(
    await supabase.from('categories').select('*').eq('user_id', userId).eq('project_id', projectId).order('name'),
  )
}

export async function listAllCategories(userId) {
  return unwrap(await supabase.from('categories').select('*').eq('user_id', userId).order('name'))
}

export async function createCategory(userId, { projectId, name, type, icon, color }) {
  return unwrap(
    await supabase
      .from('categories')
      .insert({ user_id: userId, project_id: projectId, name: name.trim(), type, icon, color })
      .select()
      .single(),
  )
}

export async function updateCategory(userId, categoryId, changes) {
  return unwrap(
    await supabase.from('categories').update(changes).eq('user_id', userId).eq('id', categoryId).select().single(),
  )
}

export async function deleteCategory(userId, categoryId) {
  unwrap(await supabase.from('categories').delete().eq('user_id', userId).eq('id', categoryId))
}
