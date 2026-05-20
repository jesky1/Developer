import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ===== Create default admin user =====
  const adminEmail = 'admin@goalzone.com'
  const adminUsername = 'admin'
  const adminPassword = 'admin123'
  const adminRole = 'admin'

  const existingAdmin = await prisma.adminUser.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { username: adminUsername },
      ],
    },
  })

  if (existingAdmin) {
    // Update existing admin: reset password hash to bcrypt + ensure active
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.adminUser.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        email: adminEmail,
        role: adminRole,
        isActive: true,
      },
    })
    console.log(`✅ Admin user already exists — password hash updated to bcrypt, role set to '${adminRole}'`)
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Username: ${existingAdmin.username}`)
  } else {
    // Create new admin user
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.adminUser.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        displayName: 'Admin',
        role: adminRole,
        isActive: true,
      },
    })
    console.log(`✅ Admin user created successfully!`)
    console.log(`   Email:    ${adminEmail}`)
    console.log(`   Username: ${adminUsername}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   Role:     ${adminRole}`)
  }

  // ===== Create default site settings =====
  const settings = [
    { key: 'site_name', value: 'GOALZONE', category: 'general', description: 'Site name', isPublic: true },
    { key: 'site_description', value: 'Live Football Scores & News', category: 'general', description: 'Site description', isPublic: true },
    { key: 'maintenance_mode', value: 'false', category: 'features', description: 'Maintenance mode', isPublic: false },
  ]

  for (const setting of settings) {
    const existing = await prisma.siteSetting.findUnique({ where: { key: setting.key } })
    if (!existing) {
      await prisma.siteSetting.create({ data: setting })
      console.log(`✅ Site setting created: ${setting.key}`)
    }
  }

  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
