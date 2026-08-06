// Migrates the hardcoded seed family (src/lib/data/seedFamily.ts) to Supabase.
// Converts the bidirectional relation arrays into single deduplicated edges.
//
// Usage: npx tsx scripts/migrate-seed.ts
// Requires PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { seedFamilyData } from '../src/lib/data/seedFamily'

const loadEnv = () => {
  try {
    const content = readFileSync(resolve(import.meta.dirname, '../.env'), 'utf8')

    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
      if (match && !line.trim().startsWith('#') && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // no .env file: rely on the process environment
  }
}

loadEnv()

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set them in .env)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

type Edge = { member_a: string; member_b: string; type: string }

const main = async () => {
  const { count, error: countError } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })

  if (countError) throw new Error(`Could not read members table: ${countError.message}`)

  if ((count ?? 0) > 0 && !process.argv.includes('--force')) {
    console.error(`members table already has ${count} rows. Re-run with --force to add anyway.`)
    process.exit(1)
  }

  // 1. Insert members, mapping old string ids to generated uuids.
  const idMap = new Map<string, string>()

  for (const member of seedFamilyData.members) {
    const { data, error } = await supabase
      .from('members')
      .insert({
        name: member.name,
        family_name: member.familyName,
        birth_date: member.birthDate ?? null
      })
      .select('id')
      .single()

    if (error) throw new Error(`Inserting member ${member.name}: ${error.message}`)

    idMap.set(member.id, data.id)
  }

  // 2. Build deduplicated edges. Unknown references are skipped and reported.
  const edges = new Map<string, Edge>()
  const skipped = new Set<string>()

  const uuidOf = (oldId: string) => {
    const uuid = idMap.get(oldId)
    if (!uuid) skipped.add(oldId)
    return uuid
  }

  const addParentEdge = (parentOldId: string, childOldId: string) => {
    const parent = uuidOf(parentOldId)
    const child = uuidOf(childOldId)
    if (!parent || !child) return

    edges.set(`${parent}|${child}|parent`, { member_a: parent, member_b: child, type: 'parent' })
  }

  const addUndirectedEdge = (oldA: string, oldB: string, type: string) => {
    const a = uuidOf(oldA)
    const b = uuidOf(oldB)
    if (!a || !b) return

    // Store undirected edges once, normalized like the DB constraint expects.
    const [low, high] = a < b ? [a, b] : [b, a]
    edges.set(`${low}|${high}|${type}`, { member_a: low, member_b: high, type })
  }

  for (const member of seedFamilyData.members) {
    member.parents.forEach((parentId) => addParentEdge(parentId, member.id))
    member.children.forEach((childId) => addParentEdge(member.id, childId))
    member.partner.forEach((partnerId) => addUndirectedEdge(member.id, partnerId, 'partner'))
    member.previousPartners.forEach((partnerId) =>
      addUndirectedEdge(member.id, partnerId, 'previous_partner')
    )
    member.siblings.forEach((siblingId) => addUndirectedEdge(member.id, siblingId, 'sibling'))
  }

  const { error: edgesError } = await supabase.from('relationships').insert([...edges.values()])

  if (edgesError) throw new Error(`Inserting relationships: ${edgesError.message}`)

  // 3. Report.
  console.log(`Inserted ${idMap.size} members and ${edges.size} relationships.`)

  const byType = new Map<string, number>()
  for (const edge of edges.values()) byType.set(edge.type, (byType.get(edge.type) ?? 0) + 1)
  for (const [type, total] of byType) console.log(`  ${type}: ${total}`)

  if (skipped.size > 0) {
    console.log(`Skipped references to unknown member ids: ${[...skipped].join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
