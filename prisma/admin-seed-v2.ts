import { PrismaClient } from '@prisma/client'
import { createHmac, randomBytes } from 'crypto'

const prisma = new PrismaClient()

// HMAC-SHA256 password hashing - MUST match src/lib/auth.ts
const HMAC_KEY = 'goalzone-hmac-key-for-passwords'

function hmacHash(password: string, salt: string): string {
  return createHmac('sha256', HMAC_KEY).update(salt + password).digest('hex')
}

function generateSalt(): string {
  return randomBytes(16).toString('hex')
}

function hashPassword(password: string): string {
  const salt = generateSalt()
  const hash = hmacHash(password, salt)
  return `${salt}:${hash}`
}

async function main() {
  console.log('🌱 Running admin-seed-v2...')

  // 1. Create default admin user with HMAC-SHA256 hash (matching auth.ts)
  const existingAdmin = await prisma.adminUser.findUnique({ where: { username: 'admin' } })
  const existingEmail = await prisma.adminUser.findUnique({ where: { email: 'admin@goalzone.app' } })
  if (!existingAdmin && !existingEmail) {
    const passwordHash = hashPassword('admin123')
    const admin = await prisma.adminUser.create({
      data: {
        username: 'admin',
        email: 'admin@goalzone.app',
        passwordHash,
        displayName: 'Super Admin',
        role: 'superadmin',
        isActive: true,
      },
    })
    console.log(`✅ Created admin user: ${admin.username} (admin/admin123)`)
  } else {
    // Update password hash for existing admin (by username or email)
    const target = existingAdmin || existingEmail
    if (target) {
      const passwordHash = hashPassword('admin123')
      await prisma.adminUser.update({
        where: { id: target.id },
        data: { passwordHash },
      })
      console.log('✅ Updated admin password hash for existing user (HMAC-SHA256)')
    }
  }

  // 2. Create sample AdUnit entries
  const adUnits = [
    { name: 'Homepage Banner', slotId: 'home-banner-001', placement: 'header', adType: 'display' },
    { name: 'Article Top Banner', slotId: 'article-top-001', placement: 'article_top', adType: 'display' },
    { name: 'Article Bottom Banner', slotId: 'article-bottom-001', placement: 'article_bottom', adType: 'display' },
    { name: 'Sidebar Rectangle', slotId: 'sidebar-rect-001', placement: 'sidebar', adType: 'display' },
    { name: 'In-Feed Ad', slotId: 'in-feed-001', placement: 'in_feed', adType: 'in_feed' },
    { name: 'Article In-Content', slotId: 'in-article-001', placement: 'article_bottom', adType: 'in_article' },
    { name: 'Footer Banner', slotId: 'footer-banner-001', placement: 'footer', adType: 'display' },
    { name: 'Mobile Anchor', slotId: 'mobile-anchor-001', placement: 'footer', adType: 'anchor' },
  ]

  for (const unit of adUnits) {
    const existing = await prisma.adUnit.findUnique({ where: { slotId: unit.slotId } })
    if (!existing) {
      await prisma.adUnit.create({
        data: {
          ...unit,
          impressions: Math.floor(Math.random() * 10000) + 1000,
          clicks: Math.floor(Math.random() * 200) + 20,
          revenue: Math.round((Math.random() * 50 + 10) * 100) / 100,
        },
      })
    }
  }
  console.log(`✅ Created ${adUnits.length} ad units`)

  // 3. Create sample AdSenseReport entries (last 14 days)
  for (let i = 13; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    const existing = await prisma.adSenseReport.findUnique({ where: { date: dateStr } })
    if (!existing) {
      const impressions = Math.floor(Math.random() * 5000) + 2000
      const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.01))
      const revenue = Math.round(clicks * (Math.random() * 0.3 + 0.1) * 100) / 100
      const ctr = Math.round((clicks / impressions) * 100 * 100) / 100
      const cpc = clicks > 0 ? Math.round((revenue / clicks) * 100) / 100 : 0
      const rpm = Math.round((revenue / impressions) * 1000 * 100) / 100
      const pageViews = Math.floor(impressions * (Math.random() * 0.5 + 0.8))
      const activeViewCtr = Math.round(ctr * (Math.random() * 0.3 + 0.7) * 100) / 100

      await prisma.adSenseReport.create({
        data: {
          date: dateStr,
          impressions,
          clicks,
          revenue,
          ctr,
          cpc,
          rpm,
          pageViews,
          activeViewCtr,
        },
      })
    }
  }
  console.log('✅ Created AdSense reports for last 14 days')

  // 4. Create sample ScheduledTask entries
  const tasks = [
    { type: 'auto_article', schedule: '*/30 * * * *', isEnabled: true },
    { type: 'trending_scrape', schedule: '0 */2 * * *', isEnabled: true },
    { type: 'telegram_post', schedule: '0 9,18 * * *', isEnabled: false },
    { type: 'adsense_sync', schedule: '0 0 * * *', isEnabled: true },
  ]

  for (const task of tasks) {
    const existing = await prisma.scheduledTask.findFirst({ where: { type: task.type } })
    if (!existing) {
      await prisma.scheduledTask.create({ data: task })
    }
  }
  console.log(`✅ Created ${tasks.length} scheduled tasks`)

  // 5. Create sample TrafficLog entries (last 7 days, ~100 entries)
  const pages = ['/', '/live', '/standings', '/scorers', '/news', '/news/match-report-1', '/about']
  const countries = ['US', 'GB', 'ID', 'IN', 'BR', 'DE', 'FR', 'ES', 'NG', 'MX']
  const devices = ['desktop', 'mobile', 'tablet']
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge']
  const osList = ['Windows', 'macOS', 'Linux', 'Android', 'iOS']
  const referrers = ['google.com', 'twitter.com', 'facebook.com', 'direct', 'reddit.com']

  const trafficCount = await prisma.trafficLog.count()
  if (trafficCount === 0) {
    const sessionId = `sess_${Date.now()}`
    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 7)
      const hoursAgo = Math.floor(Math.random() * 24)
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000)

      await prisma.trafficLog.create({
        data: {
          path: pages[Math.floor(Math.random() * pages.length)],
          referrer: referrers[Math.floor(Math.random() * referrers.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          device: devices[Math.floor(Math.random() * devices.length)],
          browser: browsers[Math.floor(Math.random() * browsers.length)],
          os: osList[Math.floor(Math.random() * osList.length)],
          utmSource: Math.random() > 0.7 ? 'google' : '',
          utmMedium: Math.random() > 0.7 ? 'organic' : '',
          utmCampaign: Math.random() > 0.9 ? 'launch' : '',
          sessionId: `${sessionId}_${Math.floor(Math.random() * 50)}`,
          duration: Math.floor(Math.random() * 300) + 10,
          createdAt,
        },
      })
    }
    console.log('✅ Created 100 sample traffic log entries')
  } else {
    console.log('⏭️ Traffic logs already exist, skipping')
  }

  console.log('\n🎉 Admin seed v2 completed!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
