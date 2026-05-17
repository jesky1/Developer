import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed Admin Users
  const adminUsers = [
    { username: "superadmin", email: "admin@goalzone.app", displayName: "Super Admin", role: "superadmin", isActive: true, lastLoginAt: new Date() },
    { username: "johndoe", email: "john@goalzone.app", displayName: "John Doe", role: "admin", isActive: true, lastLoginAt: new Date(Date.now() - 3600000) },
    { username: "janewriter", email: "jane@goalzone.app", displayName: "Jane Writer", role: "editor", isActive: true, lastLoginAt: new Date(Date.now() - 7200000) },
    { username: "mikeviewer", email: "mike@goalzone.app", displayName: "Mike Viewer", role: "viewer", isActive: false, lastLoginAt: new Date(Date.now() - 86400000) },
    { username: "sarahedit", email: "sarah@goalzone.app", displayName: "Sarah Editor", role: "editor", isActive: true, lastLoginAt: new Date(Date.now() - 14400000) },
  ];

  for (const u of adminUsers) {
    await prisma.adminUser.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }
  console.log("✅ Admin users seeded");

  // Seed Site Settings
  const settings = [
    { key: "site_name", value: "GOALZONE", category: "branding", description: "Site name displayed in header and title", isPublic: true },
    { key: "site_description", value: "Live Football Scores, Standings & Real-Time Updates", category: "branding", description: "Site meta description", isPublic: true },
    { key: "primary_color", value: "#00ff88", category: "branding", description: "Primary accent color (neon green)", isPublic: true },
    { key: "maintenance_mode", value: "false", category: "general", description: "Enable maintenance mode to show holding page", isPublic: false },
    { key: "registration_enabled", value: "true", category: "features", description: "Allow new user registrations", isPublic: false },
    { key: "ai_news_enabled", value: "true", category: "features", description: "Enable AI-powered news generation", isPublic: false },
    { key: "live_updates_enabled", value: "true", category: "features", description: "Enable real-time WebSocket match updates", isPublic: true },
    { key: "max_news_per_day", value: "10", category: "features", description: "Maximum AI-generated news articles per day", isPublic: false },
    { key: "polls_enabled", value: "true", category: "features", description: "Enable fan polling on matches", isPublic: true },
    { key: "notifications_enabled", value: "true", category: "notifications", description: "Enable push notifications for goals", isPublic: true },
    { key: "email_notifications", value: "true", category: "notifications", description: "Send email notifications for important events", isPublic: false },
    { key: "google_analytics_id", value: "G-XXXXXXXXXX", category: "seo", description: "Google Analytics tracking ID", isPublic: false },
    { key: "seo_keywords", value: "football, live scores, soccer, premier league, la liga", category: "seo", description: "Default SEO keywords", isPublic: false },
    { key: "contact_email", value: "hello@goalzone.app", category: "general", description: "Contact email address", isPublic: true },
    { key: "timezone", value: "UTC", category: "general", description: "Default timezone for match times", isPublic: false },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("✅ Site settings seeded");

  // Seed Activity Logs
  const superAdmin = await prisma.adminUser.findUnique({ where: { username: "superadmin" } });
  const johnAdmin = await prisma.adminUser.findUnique({ where: { username: "johndoe" } });
  const janeEditor = await prisma.adminUser.findUnique({ where: { username: "janewriter" } });

  if (superAdmin && johnAdmin && janeEditor) {
    const activities = [
      { userId: superAdmin.id, action: "login", resource: "auth", details: JSON.stringify({ method: "password" }), ip: "192.168.1.1" },
      { userId: superAdmin.id, action: "update", resource: "setting", resourceId: "maintenance_mode", details: JSON.stringify({ from: "true", to: "false" }), ip: "192.168.1.1" },
      { userId: johnAdmin.id, action: "create", resource: "news", details: JSON.stringify({ title: "Premier League Transfer Roundup" }), ip: "10.0.0.5" },
      { userId: janeEditor.id, action: "generate", resource: "news", details: JSON.stringify({ count: 3, categories: ["Breaking", "Match Report"] }), ip: "10.0.0.8" },
      { userId: superAdmin.id, action: "update", resource: "match", resourceId: "match_1", details: JSON.stringify({ field: "status", from: "LIVE", to: "FT" }), ip: "192.168.1.1" },
      { userId: johnAdmin.id, action: "create", resource: "user", details: JSON.stringify({ username: "sarahedit", role: "editor" }), ip: "10.0.0.5" },
      { userId: janeEditor.id, action: "delete", resource: "news", resourceId: "old_article_1", details: JSON.stringify({ reason: "outdated" }), ip: "10.0.0.8" },
      { userId: superAdmin.id, action: "login", resource: "auth", details: JSON.stringify({ method: "password" }), ip: "192.168.1.2" },
      { userId: johnAdmin.id, action: "update", resource: "player", resourceId: "player_5", details: JSON.stringify({ field: "rating", from: "7.2", to: "8.1" }), ip: "10.0.0.5" },
      { userId: superAdmin.id, action: "update", resource: "setting", resourceId: "ai_news_enabled", details: JSON.stringify({ from: "false", to: "true" }), ip: "192.168.1.1" },
      { userId: janeEditor.id, action: "create", resource: "news", details: JSON.stringify({ title: "Champions League Semi-Final Preview" }), ip: "10.0.0.8" },
      { userId: superAdmin.id, action: "create", resource: "user", details: JSON.stringify({ username: "mikeviewer", role: "viewer" }), ip: "192.168.1.1" },
    ];

    // Create activities with different timestamps
    for (let i = 0; i < activities.length; i++) {
      const hoursAgo = i * 2;
      await prisma.activityLog.create({
        data: {
          ...activities[i],
          createdAt: new Date(Date.now() - hoursAgo * 3600000),
        },
      });
    }
    console.log("✅ Activity logs seeded");
  }

  // Seed Page Views (analytics data for last 7 days)
  const countries = ["ID", "US", "GB", "DE", "FR", "BR", "AR", "ES", "IT", "NG", "JP", "KR", "AU", "MX", "IN"];
  const devices = ["desktop", "mobile", "tablet"];
  const browsers = ["Chrome", "Firefox", "Safari", "Edge"];
  const oses = ["Windows", "macOS", "Linux", "Android", "iOS"];
  const referrers = ["google.com", "twitter.com", "facebook.com", "direct", "reddit.com", "bing.com", ""];

  for (let day = 6; day >= 0; day--) {
    const viewsPerDay = Math.floor(Math.random() * 300) + 200;
    for (let v = 0; v < viewsPerDay; v++) {
      const hourOffset = day * 24 + Math.floor(Math.random() * 24);
      await prisma.pageView.create({
        data: {
          path: "/",
          referrer: referrers[Math.floor(Math.random() * referrers.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          device: devices[Math.floor(Math.random() * devices.length)],
          browser: browsers[Math.floor(Math.random() * browsers.length)],
          os: oses[Math.floor(Math.random() * oses.length)],
          duration: Math.floor(Math.random() * 300) + 10,
          createdAt: new Date(Date.now() - hourOffset * 3600000),
        },
      });
    }
  }
  console.log("✅ Page views seeded (7 days of data)");

  // Seed Contact Messages
  const messages = [
    { name: "Ahmad Rizki", email: "ahmad@email.com", subject: "Live scores not updating", message: "Hi, the live scores on my phone are not updating in real-time. Is there an issue with the WebSocket connection?", status: "unread" },
    { name: "Sarah Connor", email: "sarah.c@email.com", subject: "Feature request: Dark mode schedule", message: "Would love to be able to schedule when dark mode turns on and off automatically based on time of day.", status: "read" },
    { name: "Lionel Fan", email: "lionel@email.com", subject: "Great app!", message: "Just wanted to say this is the best football scores app I've used. The real-time updates are amazing!", status: "replied", reply: "Thank you so much for the kind words! We're glad you're enjoying the app." },
    { name: "Maria Garcia", email: "maria@email.com", subject: "La Liga standings error", message: "The La Liga standings seem to be showing incorrect points for Barcelona. They should have 72 points, not 69.", status: "unread" },
    { name: "Chen Wei", email: "chen.w@email.com", subject: "API access for research", message: "I'm a data science researcher. Is there any way to get API access to your match data for academic purposes?", status: "archived" },
  ];

  for (const m of messages) {
    await prisma.contactMessage.create({ data: m });
  }
  console.log("✅ Contact messages seeded");

  console.log("\n🎉 Admin panel seed data complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
