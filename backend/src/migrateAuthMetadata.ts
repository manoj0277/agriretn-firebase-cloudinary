import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function run() {
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key)
  const { data: profiles, error: pErr } = await supabase.from('users').select('id,email,phone,name')
  if (pErr) {
    console.error('Failed to load profiles', pErr.message)
    process.exit(1)
  }
  let page = 1
  const perPage = 200
  const authByEmail: Record<string, { id: string }> = {}
  for (;;) {
    const { data: list, error: lErr } = await supabase.auth.admin.listUsers({ page, perPage })
    if (lErr) {
      console.error('Failed to list auth users', lErr.message)
      process.exit(1)
    }
    if (!list || list.users.length === 0) break
    for (const u of list.users) {
      const e = (u.email || '').toLowerCase()
      if (e) authByEmail[e] = { id: u.id }
    }
    if (list.users.length < perPage) break
    page++
  }
  let updated = 0
  for (const prof of profiles || []) {
    const email = (prof as any).email ? String((prof as any).email).toLowerCase() : ''
    const phone = (prof as any).phone ? String((prof as any).phone) : ''
    const name = (prof as any).name ? String((prof as any).name) : ''
    if (!email || (!phone && !name)) continue
    const auth = authByEmail[email]
    if (!auth) continue
    const { error } = await supabase.auth.admin.updateUserById(auth.id, { user_metadata: { phone, full_name: name } })
    if (!error) updated++
  }
  console.log(`Updated ${updated} auth users with metadata`)
}

run().catch(err => { console.error(err?.message || err); process.exit(1) })