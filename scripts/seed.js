// scripts/seed.js
// Run once to populate initial team members into Firestore.
// No Firebase Auth needed — just Firestore.
//
// Usage:
//   1. Download your serviceAccountKey.json from Firebase Console
//      (Project Settings → Service Accounts → Generate new private key)
//   2. Place it as scripts/serviceAccountKey.json
//   3. npm install firebase-admin uuid (in /scripts folder or root)
//   4. node scripts/seed.js

const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Edit this list to match your actual team ──────────────────────
const USERS = [
  { name: "Admin",         role: "admin",              },
  { name: "Meera P.",      role: "creative_head",      },
  { name: "Arjun V.",      role: "avp",                },
  { name: "Nisha A.",      role: "assistant_manager",  },
  { name: "Riya Krishnan", role: "pm_head",            },
  { name: "Sanjay R.",     role: "content_lead",       },
  { name: "Kiran D.",      role: "design_lead",        },
  { name: "Priya N.",      role: "video_lead",         },
  { name: "Rahul M.",      role: "seo_lead",           },
  { name: "Divya S.",      role: "social_media_lead",  },
  { name: "Ananya S.",     role: "content_member",     },
  { name: "James T.",      role: "content_member",     },
  { name: "Sana R.",       role: "design_member",      },
  { name: "Dev K.",        role: "video_member",       },
  { name: "Arun P.",       role: "seo_member",         },
  { name: "Sneha R.",      role: "social_media_member" },
];

const ROLE_TEAM_MAP = {
  pm_member: "performance_marketing",
  pm_head: "lead_1",
  content_lead: "lead_2",      content_member: "content",
  design_lead: "lead_2",       design_member: "design",
  video_lead: "lead_2",        video_member: "video",
  seo_lead: "lead_2",          seo_member: "seo",
  social_media_lead: "lead_2", social_media_member: "social_media",
  creative_head: "lead_1",     assistant_manager: "lead_1",
  avp: "lead_1",               admin: "lead_1",
};

async function seed() {
  console.log("Seeding users...");
  for (const u of USERS) {
    const id = uuidv4();
    await db.collection("users").doc(id).set({
      id, name: u.name, role: u.role,
      team: ROLE_TEAM_MAP[u.role],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ ${u.name} (${u.role})`);
  }

  console.log("\nSeeding sample tasks...");
  const users = (await db.collection("users").get()).docs.map((d) => d.data());
  const pm   = users.find((u) => u.role === "pm_member");
  const avp  = users.find((u) => u.role === "avp");

  const sampleTasks = [
    {
      title: "Instagram post for MRCP launch",
      description: "Engaging post announcing new MRCP batch starting May 2025.",
      type: "pm_content_design", priority: "high",
      stage: "initiated",
      createdBy: pm?.id || users[0].id, assignedTo: null, assignedBy: null,
      dueDate: new Date(Date.now() + 7 * 86400000),
    },
    {
      title: "Video reel — MRCOG success stories",
      description: "60-second reel with student testimonials.",
      type: "pm_content_video", priority: "urgent",
      stage: "initiated",
      createdBy: pm?.id || users[0].id, assignedTo: null, assignedBy: null,
      dueDate: new Date(Date.now() + 3 * 86400000),
    },
    {
      title: "Company profile brochure update",
      description: "Update PDF with new partner logos and 2025 stats.",
      type: "external", priority: "medium",
      stage: "ext_initiated",
      createdBy: avp?.id || users[0].id, assignedTo: null, assignedBy: null,
      dueDate: new Date(Date.now() + 14 * 86400000),
    },
  ];

  for (const t of sampleTasks) {
    const ref = await db.collection("tasks").add({
      ...t,
      attachments: [], comments: [],
      history: [{ action: "created", by: t.createdBy, byName: users.find((u) => u.id === t.createdBy)?.name || "Admin", stage: t.stage, timestamp: new Date() }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ Task: ${t.title} (${ref.id})`);
  }

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
