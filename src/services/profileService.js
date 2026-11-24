import { supabase, unwrap } from './client.js'

export async function getProfile(userId) {
  return unwrap(await supabase.from('profiles').select('*').eq('id', userId).single())
}

export async function updateProfile(userId, changes) {
  return unwrap(await supabase.from('profiles').update(changes).eq('id', userId).select().single())
}
