import type { CrowdDetailTier, CrowdInitConfig, CrowdStepSnapshot } from './types'

type AvatarState = {
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  speed: number
  ampX: number
  ampY: number
  linked: boolean
  tier: CrowdDetailTier
  bodyRadius: number
  mass: number
}

const FRAME_MS = 16.667
const COLLISION_RESTITUTION = 0.58
const COLLISION_TANGENTIAL_FRICTION = 0.12
const OVERLAP_SEPARATION_GAIN = 0.016
const VELOCITY_DAMPING = 0.955
const SPRITE_SIZE_BOOST = 1.65
const MOTION_FORCE_GAIN = 0.0039
const COLLISION_DISTANCE_FACTOR = 0.62

const hashSeed = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const makeSeededRandom = (seed: number) => {
  let state = seed || 123456789
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const tierQuota = (count: number, coarsePointer: boolean) => {
  if (count <= 0) return { full: 0, lite: 0 }

  if (coarsePointer) {
    if (count <= 36) return { full: count, lite: 0 }
    if (count <= 72) return { full: Math.min(18, count), lite: Math.min(20, count - 18) }
    if (count <= 140) return { full: Math.min(12, count), lite: Math.min(22, count - 12) }
    return { full: Math.min(10, count), lite: Math.min(16, count - 10) }
  }

  if (count <= 54) return { full: Math.min(28, count), lite: Math.min(16, count - 28) }
  if (count <= 120) return { full: Math.min(22, count), lite: Math.min(30, count - 22) }
  return { full: Math.min(18, count), lite: Math.min(26, count - 18) }
}

const assignDetailTiers = (avatars: AvatarState[], maxRadius: number, coarsePointer: boolean) => {
  const quota = tierQuota(avatars.length, coarsePointer)
  const ranked = avatars
    .map((avatar, index) => {
      const centerScore = Math.max(0, 1 - Math.hypot(avatar.x, avatar.y) / Math.max(maxRadius, 1))
      const frontScore = clamp((avatar.y + maxRadius) / Math.max(maxRadius * 2, 1), 0, 1)
      return {
        index,
        score: frontScore * 0.64 + centerScore * 0.36
      }
    })
    .sort((a, b) => b.score - a.score)

  ranked.forEach(({ index }, rank) => {
    if (rank < quota.full) {
      avatars[index].tier = 2
      return
    }

    if (rank < quota.full + quota.lite) {
      avatars[index].tier = 1
      return
    }

    avatars[index].tier = 0
  })
}

export class CrowdPhysicsEngine {
  private avatars: AvatarState[] = []
  private readonly random: () => number
  private readonly count: number
  private readonly unlinkedCount: number
  private readonly coarsePointer: boolean
  private radius: number
  private spriteSize = 8
  private collisionsEnabled = true
  private collisionStride = 1
  private collisionPhase = 0
  private maxBodyRadius = 5

  constructor(config: CrowdInitConfig) {
    this.random = makeSeededRandom(hashSeed(config.seedKey))
    this.count = Math.max(0, config.count)
    this.unlinkedCount = Math.max(0, config.unlinkedCount)
    this.radius = Math.max(20, config.radius)
    this.coarsePointer = config.coarsePointer
    this.buildInitialState()
  }

  setRadius(radius: number) {
    this.radius = Math.max(20, radius)
  }

  private buildInitialState() {
    if (this.count === 0) {
      this.avatars = []
      return
    }

    const denseFactor = clamp((this.count - 16) / 38, 0, 1)
    const minSpriteSize = Math.max(4.1, Math.min(5.4, this.radius * 0.07))
    const maxSpriteSize = Math.max(minSpriteSize + 1.4, Math.min(12.8, this.radius * 0.152))
    const baseSpriteSize = Math.max(
      minSpriteSize,
      Math.min(maxSpriteSize, 17.6 - Math.sqrt(this.count) * 1.16 - denseFactor * 0.08)
    )
    const spriteSize = baseSpriteSize * SPRITE_SIZE_BOOST
    const edgeInset = Math.max(spriteSize * 0.9, this.radius * (this.coarsePointer ? 0.125 : 0.088), 7)
    const maxRadius = Math.max(10, this.radius - edgeInset)
    const minDistance = Math.max(3.1, spriteSize * (0.56 + denseFactor * 0.05))
    const motionScale = clamp(this.radius / 150, 0.72, 1.08)

    this.spriteSize = spriteSize
    this.collisionsEnabled = this.count > 1 && (!this.coarsePointer || this.count <= 72)
    this.collisionStride = this.count > 108 ? 2 : 1

    const avatars: AvatarState[] = []
    for (let i = 0; i < this.count; i += 1) {
      let x = 0
      let y = 0
      let placed = false

      for (let attempt = 0; attempt < 360; attempt += 1) {
        const angle = this.random() * Math.PI * 2
        const distance = Math.sqrt(this.random()) * maxRadius
        x = Math.cos(angle) * distance
        y = Math.sin(angle) * distance

        let overlaps = false
        for (const other of avatars) {
          const dx = x - other.x
          const dy = y - other.y
          if (dx * dx + dy * dy < minDistance * minDistance) {
            overlaps = true
            break
          }
        }

        if (!overlaps) {
          placed = true
          break
        }
      }

      if (!placed) {
        const fallbackAngle = (i / Math.max(this.count, 1)) * Math.PI * 2
        const fallbackDistance = maxRadius * (0.65 + this.random() * 0.25)
        x = Math.cos(fallbackAngle) * fallbackDistance
        y = Math.sin(fallbackAngle) * fallbackDistance
      }

      avatars.push({
        x,
        y,
        vx: (this.random() - 0.5) * 0.12 * motionScale,
        vy: (this.random() - 0.5) * 0.12 * motionScale,
        phase: this.random() * Math.PI * 2,
        speed: (0.00045 + this.random() * 0.00018) * motionScale,
        ampX: spriteSize * (0.1 + this.random() * 0.2) * (0.9 + motionScale * 0.2),
        ampY: spriteSize * (0.1 + this.random() * 0.2) * (0.9 + motionScale * 0.2),
        linked: i >= this.unlinkedCount,
        tier: 0,
        bodyRadius: Math.max(2.2, spriteSize * 0.4),
        mass: 1
      })
    }

    assignDetailTiers(avatars, maxRadius, this.coarsePointer)
    for (const avatar of avatars) {
      const tierMotionScale = avatar.tier === 2 ? 1 : avatar.tier === 1 ? 0.82 : 0.62
      avatar.vx *= tierMotionScale
      avatar.vy *= tierMotionScale
      avatar.speed *= tierMotionScale
      avatar.ampX *= tierMotionScale
      avatar.ampY *= tierMotionScale

      const radiusScale = avatar.tier === 2 ? 0.4 : avatar.tier === 1 ? 0.35 : 0.31
      const linkedScale = avatar.linked ? 1 : 0.95
      avatar.bodyRadius = Math.max(2.2, spriteSize * radiusScale * linkedScale)
      avatar.mass = avatar.tier === 2 ? 1.15 : avatar.tier === 1 ? 1 : 0.9
    }

    this.maxBodyRadius = avatars.reduce((max, avatar) => Math.max(max, avatar.bodyRadius), 2.2)

    this.avatars = avatars
  }

  step(dtMs: number, timestamp: number) {
    if (this.avatars.length === 0) return

    const dt = clamp(dtMs / FRAME_MS, 0.25, 2)
    const edgeInset = Math.max(
      this.spriteSize * 0.9,
      this.radius * (this.coarsePointer ? 0.125 : 0.088),
      7
    )
    const maxRadius = Math.max(8, this.radius - edgeInset)
    const collisionDistance = Math.max(3.6, this.spriteSize * COLLISION_DISTANCE_FACTOR)
    const collisionDistanceSq = collisionDistance * collisionDistance

    for (const avatar of this.avatars) {
      const tierScale = avatar.tier === 2 ? 1 : avatar.tier === 1 ? 0.82 : 0.62
      const t = timestamp * avatar.speed + avatar.phase
      avatar.vx += Math.cos(t) * avatar.ampX * MOTION_FORCE_GAIN * tierScale * dt
      avatar.vy += Math.sin(t * 1.07) * avatar.ampY * MOTION_FORCE_GAIN * tierScale * dt
    }

    if (this.collisionsEnabled) {
      const cellSize = Math.max(collisionDistance, this.maxBodyRadius * 2)
      const grid = new Map<string, number[]>()
      const gridX = new Array<number>(this.avatars.length)
      const gridY = new Array<number>(this.avatars.length)

      for (let i = 0; i < this.avatars.length; i += 1) {
        const avatar = this.avatars[i]
        const cx = Math.floor(avatar.x / cellSize)
        const cy = Math.floor(avatar.y / cellSize)
        gridX[i] = cx
        gridY[i] = cy
        const key = `${cx}:${cy}`
        const bucket = grid.get(key)
        if (bucket) {
          bucket.push(i)
        } else {
          grid.set(key, [i])
        }
      }

      for (let i = 0; i < this.avatars.length; i += 1) {
        const avatar = this.avatars[i]
        const cx = gridX[i]
        const cy = gridY[i]

        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const neighbor = grid.get(`${cx + ox}:${cy + oy}`)
            if (!neighbor) continue

            for (const j of neighbor) {
              if (j <= i) continue
              if (this.collisionStride > 1 && (i + j + this.collisionPhase) % this.collisionStride !== 0) {
                continue
              }

              const other = this.avatars[j]
              const dx = avatar.x - other.x
              const dy = avatar.y - other.y
              const distSq = dx * dx + dy * dy
              if (distSq <= 0.000001) {
                const escapeAngle = (i * 0.73 + j * 1.31 + this.collisionPhase * 0.53) %
                  (Math.PI * 2)
                const nx = Math.cos(escapeAngle)
                const ny = Math.sin(escapeAngle)
                avatar.x += nx * 0.08
                avatar.y += ny * 0.08
                other.x -= nx * 0.08
                other.y -= ny * 0.08
                continue
              }

              const minDistance = avatar.bodyRadius + other.bodyRadius
              const minDistanceSq = minDistance * minDistance
              if (distSq >= Math.max(collisionDistanceSq, minDistanceSq)) continue

              const dist = Math.sqrt(distSq)
              const nx = dx / dist
              const ny = dy / dist
              const overlap = minDistance - dist
              if (overlap <= 0) continue

              const invMassA = 1 / avatar.mass
              const invMassB = 1 / other.mass
              const invMassSum = invMassA + invMassB
              const correction = Math.max(overlap - 0.02, 0) * 0.62

              avatar.x += nx * correction * (invMassA / invMassSum)
              avatar.y += ny * correction * (invMassA / invMassSum)
              other.x -= nx * correction * (invMassB / invMassSum)
              other.y -= ny * correction * (invMassB / invMassSum)

              const rvx = avatar.vx - other.vx
              const rvy = avatar.vy - other.vy
              const velAlongNormal = rvx * nx + rvy * ny

              if (velAlongNormal < 0) {
                const impulseMag = (-(1 + COLLISION_RESTITUTION) * velAlongNormal) / invMassSum
                const impulseX = impulseMag * nx
                const impulseY = impulseMag * ny

                avatar.vx += impulseX * invMassA
                avatar.vy += impulseY * invMassA
                other.vx -= impulseX * invMassB
                other.vy -= impulseY * invMassB

                const tangentX = rvx - velAlongNormal * nx
                const tangentY = rvy - velAlongNormal * ny
                const tangentLen = Math.hypot(tangentX, tangentY)

                if (tangentLen > 0.0001) {
                  const tx = tangentX / tangentLen
                  const ty = tangentY / tangentLen
                  const jt = clamp(
                    (-(rvx * tx + rvy * ty)) / invMassSum,
                    -impulseMag * COLLISION_TANGENTIAL_FRICTION,
                    impulseMag * COLLISION_TANGENTIAL_FRICTION
                  )

                  avatar.vx += tx * jt * invMassA
                  avatar.vy += ty * jt * invMassA
                  other.vx -= tx * jt * invMassB
                  other.vy -= ty * jt * invMassB
                }
              }

              const overlapBoost = overlap * OVERLAP_SEPARATION_GAIN * dt
              avatar.vx += nx * overlapBoost * invMassA
              avatar.vy += ny * overlapBoost * invMassA
              other.vx -= nx * overlapBoost * invMassB
              other.vy -= ny * overlapBoost * invMassB
            }
          }
        }
      }

      if (this.collisionStride > 1) {
        this.collisionPhase = (this.collisionPhase + 1) % this.collisionStride
      }
    }

    for (const avatar of this.avatars) {
      const maxSpeed = avatar.tier === 2 ? 0.31 : avatar.tier === 1 ? 0.26 : 0.2
      const speedNow = Math.hypot(avatar.vx, avatar.vy)
      if (speedNow > maxSpeed) {
        const scale = maxSpeed / speedNow
        avatar.vx *= scale
        avatar.vy *= scale
      }

      const distanceFromCenter = Math.hypot(avatar.x, avatar.y) || 0.001
      if (distanceFromCenter > maxRadius) {
        const excess = distanceFromCenter - maxRadius
        const nx = avatar.x / distanceFromCenter
        const ny = avatar.y / distanceFromCenter
        avatar.x -= nx * excess
        avatar.y -= ny * excess

        const outwardVelocity = avatar.vx * nx + avatar.vy * ny
        if (outwardVelocity > 0) {
          avatar.vx -= nx * outwardVelocity * 1.78
          avatar.vy -= ny * outwardVelocity * 1.78
        }

        avatar.vx -= nx * excess * 0.02
        avatar.vy -= ny * excess * 0.02
      }

      avatar.vx *= VELOCITY_DAMPING
      avatar.vy *= VELOCITY_DAMPING
      const stepScale = avatar.tier === 2 ? 0.7 : avatar.tier === 1 ? 0.62 : 0.5
      avatar.x += avatar.vx * dt * stepScale
      avatar.y += avatar.vy * dt * stepScale
    }
  }

  snapshot(): CrowdStepSnapshot {
    const count = this.avatars.length
    const positions = new Float32Array(count * 2)
    const linked = new Uint8Array(count)
    const tiers = new Uint8Array(count)
    const order = new Uint16Array(count)

    for (let i = 0; i < count; i += 1) {
      const avatar = this.avatars[i]
      positions[i * 2] = avatar.x
      positions[i * 2 + 1] = avatar.y
      linked[i] = avatar.linked ? 1 : 0
      tiers[i] = avatar.tier
      order[i] = i
    }

    order.sort((a, b) => positions[a * 2 + 1] - positions[b * 2 + 1])

    return {
      positions,
      depthOrder: order,
      linked,
      tiers,
      spriteSize: this.spriteSize,
      radius: this.radius
    }
  }
}
