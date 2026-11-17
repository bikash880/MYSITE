// npm run db:seed — inserts demo content into EMPTY collections only (never overwrites your data).
import { connect, DEFAULT_PROFILE, DEFAULT_SETTINGS, ensureIndexes } from "./_db.mjs";

const now = new Date();
const stamp = (docs) => docs.map((d) => ({ created_at: now, updated_at: now, ...d }));

const DEMO = {
  skills: [
    { name: "TypeScript", category: "Frontend", level: 90, icon: "🟦", sort_order: 1 },
    { name: "React / Next.js", category: "Frontend", level: 92, icon: "⚛️", sort_order: 2 },
    { name: "Tailwind CSS", category: "Frontend", level: 88, icon: "🎨", sort_order: 3 },
    { name: "Node.js", category: "Backend", level: 85, icon: "🟩", sort_order: 4 },
    { name: "MongoDB", category: "Backend", level: 82, icon: "🍃", sort_order: 5 },
    { name: "Figma", category: "Design", level: 75, icon: "✏️", sort_order: 6 },
  ],
  experiences: [
    { role: "Senior Developer", company: "Acme Corp", location: "Remote", start_date: "2023-01-01", end_date: null, is_current: true, description: "Leading the web platform team and building design systems.", sort_order: 1 },
    { role: "Frontend Developer", company: "Startup Inc", location: "Berlin", start_date: "2021-03-01", end_date: "2022-12-31", is_current: false, description: "Shipped the customer dashboard used by 50k users.", sort_order: 2 },
  ],
  education: [
    { degree: "B.Tech in Computer Science", institution: "Your University", location: "Your City", start_date: "2017-08-01", end_date: "2021-05-31", is_current: false, description: "Graduated with distinction.", sort_order: 1 },
  ],
  projects: [
    { title: "Realtime Chat App", slug: "realtime-chat-app", summary: "A Slack-style chat app with channels, presence and file sharing.", content: "<h2>Overview</h2><p>Built with Next.js, MongoDB and WebSockets.</p>", image_url: null, category: "Web", tech: ["Next.js", "MongoDB", "Tailwind"], live_url: "https://example.com", github_url: "https://github.com", featured: true, published: true, sort_order: 1 },
    { title: "Fitness Tracker", slug: "fitness-tracker", summary: "Cross-platform mobile app to track workouts and progress.", content: "<p>React Native app with offline sync.</p>", image_url: null, category: "Mobile", tech: ["React Native", "Expo", "SQLite"], live_url: null, github_url: "https://github.com", featured: true, published: true, sort_order: 2 },
    { title: "Brand Identity", slug: "brand-identity", summary: "Logo, colour system and UI kit for a coffee startup.", content: "<p>Full brand identity design.</p>", image_url: null, category: "Design", tech: ["Figma", "Illustrator"], live_url: null, github_url: null, featured: false, published: true, sort_order: 3 },
  ],
  certificates: [
    { title: "Full-Stack Web Development", issuer: "Example Online Academy", issue_date: "2024-06-15", expiry_date: null, credential_id: "FSWD-2024-0001", credential_url: null, image_url: null, skills: ["React", "Node.js", "MongoDB"], description: "Replace this demo certificate with your own from the admin panel.", featured: true, published: true, sort_order: 1 },
    { title: "Cloud Fundamentals", issuer: "Example Cloud Institute", issue_date: "2024-02-10", expiry_date: "2027-02-10", credential_id: "CF-88213", credential_url: null, image_url: null, skills: ["Cloud", "Networking", "Security"], description: "Core cloud concepts, architecture and security.", featured: true, published: true, sort_order: 2 },
    { title: "UI / UX Design Specialization", issuer: "Example Design School", issue_date: "2023-09-01", expiry_date: null, credential_id: null, credential_url: null, image_url: null, skills: ["Figma", "Prototyping", "User Research"], description: "User-centred design, wireframing and prototyping.", featured: true, published: true, sort_order: 3 },
  ],
};

const { client, db } = await connect();
try {
  await ensureIndexes(db);
  await db.collection("profile").updateOne({ _id: "main" }, { $setOnInsert: { ...DEFAULT_PROFILE, updated_at: now } }, { upsert: true });
  await db.collection("settings").updateOne({ _id: "main" }, { $setOnInsert: { ...DEFAULT_SETTINGS, updated_at: now } }, { upsert: true });

  for (const [name, docs] of Object.entries(DEMO)) {
    const count = await db.collection(name).countDocuments();
    if (count > 0) {
      console.log(`• ${name}: already has ${count} document(s) — skipped`);
      continue;
    }
    await db.collection(name).insertMany(stamp(docs));
    console.log(`✔ ${name}: inserted ${docs.length}`);
  }
  console.log("Done. Edit or delete the demo content from /admin.");
} finally {
  await client.close();
}
