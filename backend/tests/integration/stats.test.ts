import request from 'supertest'
import app from '../../src/app'
import { prisma } from '../../src/shared/db/prisma'
import { clearTables } from '../helpers/db'
import { bootstrapAdmin, registerUser } from '../helpers/auth'

let superAdminToken: string
let teamAdminToken: string
let coachToken: string
let superAdminId: string
let teamAdminId: string
let coachId: string

beforeAll(async () => {
  await clearTables()

  const admin = await bootstrapAdmin('super@stats.com', 'Admin1234')
  superAdminToken = admin.token
  superAdminId = admin.id

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: 'Team',
    lastName: 'Lead',
    email: 'lead@stats.com',
    password: 'LeadPass1234',
    role: 'TEAM_ADMIN',
  })
  teamAdminToken = teamAdmin.token
  teamAdminId = teamAdmin.id

  const coach = await registerUser(superAdminToken, {
    firstName: 'Casey',
    lastName: 'Coach',
    email: 'coach@stats.com',
    password: 'CoachPass1234',
    role: 'COACH',
  })
  coachToken = coach.token
  coachId = coach.id

  await prisma.userInvite.create({
    data: {
      email: 'pending@stats.com',
      role: 'COACH',
      token: 'pending-stats-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: superAdminId,
    },
  })

  const team = await prisma.team.create({
    data: {
      name: 'stats_team',
      description: 'stats test team',
      teamLeadId: teamAdminId,
      createdById: superAdminId,
      isActive: true,
    },
  })

  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: coachId,
      isActive: true,
    },
  })

  const offering = await prisma.eventOffering.create({
    data: {
      key: 'stats_offering',
      name: 'Stats Offering',
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
    },
  })

  const interactionType = await prisma.eventInteractionType.create({
    data: {
      key: 'stats_interaction',
      name: 'Stats Interaction',
      supportsMultipleHosts: true,
      supportsRoundRobin: true,
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
    },
  })

  const event = await prisma.event.create({
    data: {
      name: 'Stats Event',
      description: 'Event for stats tests',
      teamId: team.id,
      offeringId: offering.id,
      interactionTypeId: interactionType.id,
      assignmentStrategy: 'ROUND_ROBIN',
      durationSeconds: 1800,
      locationType: 'VIRTUAL',
      locationValue: 'https://example.com/room',
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
    },
  })

  await prisma.eventHost.createMany({
    data: [
      { eventId: event.id, hostUserId: coachId, hostOrder: 1, isActive: true },
      { eventId: event.id, hostUserId: superAdminId, hostOrder: 2, isActive: true },
    ],
  })

  await prisma.booking.createMany({
    data: [
      {
        studentName: 'Upcoming Student',
        studentEmail: 'upcoming@student.com',
        teamId: team.id,
        eventId: event.id,
        hostUserId: coachId,
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        timezone: 'UTC',
        status: 'CONFIRMED',
      },
      {
        studentName: 'Completed Student',
        studentEmail: 'completed@student.com',
        teamId: team.id,
        eventId: event.id,
        hostUserId: superAdminId,
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        timezone: 'UTC',
        status: 'COMPLETED',
      },
    ],
  })
})

afterAll(clearTables)

describe('GET /api/v1/stats/dashboard', () => {
  it('returns dashboard stats with timeframe metadata for admins', async () => {
    const res = await request(app)
      .get('/api/v1/stats/dashboard?timeframe=month')
      .set('Authorization', `Bearer ${superAdminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.timeframe).toMatchObject({
      key: 'month',
      label: 'This month',
      rangeLabel: expect.any(String),
    })
    expect(res.body.data.metrics).toMatchObject({
      scheduledBookings: expect.any(Number),
      upcomingBookings: expect.any(Number),
      activeUsers: expect.any(Number),
      activeEvents: expect.any(Number),
      activeTeams: expect.any(Number),
    })
  })
})

describe('GET /api/v1/stats/bookings', () => {
  it('scopes booking stats to the signed-in coach', async () => {
    const res = await request(app)
      .get('/api/v1/stats/bookings?timeframe=month')
      .set('Authorization', `Bearer ${coachToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.metrics.totalBookings).toBe(1)
    expect(res.body.data.metrics.upcomingBookings).toBe(1)
    expect(res.body.data.metrics.completedBookings).toBe(0)
  })
})

describe('GET /api/v1/stats/users', () => {
  it('blocks coaches from admin-only stats endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/stats/users?timeframe=month')
      .set('Authorization', `Bearer ${coachToken}`)

    expect(res.status).toBe(403)
  })

  it('returns user summary metrics for admins', async () => {
    const res = await request(app)
      .get('/api/v1/stats/users?timeframe=month')
      .set('Authorization', `Bearer ${teamAdminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.metrics).toMatchObject({
      newUsers: expect.any(Number),
      activeUsers: expect.any(Number),
      pendingInvites: expect.any(Number),
      coaches: expect.any(Number),
    })
  })
})
