/**
 * Appwrite Setup Script
 * ----------------------------------------------------
 * Creates the full database structure for the app:
 * profiles(handled by Appwrite Auth), pets, listings, posts,
 * conversations, messages, playdate_requests
 *
 * HOW TO USE:
 * 1. npm install node-appwrite
 * 2. Create an API key in Appwrite Console:
 *    Project Settings > API Keys > Create Key
 *    (needs "databases.write" scope at minimum)
 * 3. Fill in the config values below.
 * 4. Run: node appwrite-setup.js
 *
 * Notes:
 * - Appwrite Auth handles users automatically (like Supabase),
 *   so there is no separate "profiles" table required — but we
 *   create one anyway to store extra fields (bio, location, etc.)
 *   linked by userId.
 * - Permissions here are a starting point — tighten as needed.
 * ----------------------------------------------------
 */

require('dotenv').config();
const { Client, Databases, Storage, Permission, Role, ID } = require('node-appwrite');

// ------------------ CONFIG ------------------
// Values are loaded from .env — see backend/.env
const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'petapp_db';
const DATABASE_NAME = 'PetApp Database';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Missing config. Make sure backend/.env has APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY set.');
  process.exit(1);
}
// ---------------------------------------------

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function run() {
  console.log('Creating database...');
  try {
    await databases.create(DATABASE_ID, DATABASE_NAME);
  } catch (e) {
    if (e.code === 409 || e.code === 403) {
      console.log('Database already exists (or plan limit reached), continuing with existing database...');
    } else {
      throw e;
    }
  }

  // ------------------------------------------------------------
  // PROFILES
  // ------------------------------------------------------------
  await createCollection('profiles', 'Profiles', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
  ], true); // documentSecurity: true — update/delete permission is set per-document at creation, owner-only
  await addAttrs('profiles', [
    ['userId', 'string', 64, true],
    ['username', 'string', 64, true],
    ['fullName', 'string', 128, false],
    ['avatarUrl', 'string', 512, false],
    ['bio', 'string', 1024, false],
    ['location', 'string', 128, false],
    ['isBreeder', 'boolean', null, false, false],
    ['isFeatured', 'boolean', null, false, false],
    ['isAdmin', 'boolean', null, false, false], // SECURITY: must default false — never true
  ]);
  await addIndex('profiles', 'idx_userId', 'unique', ['userId']);

  // ------------------------------------------------------------
  // PETS
  // ------------------------------------------------------------
  await createCollection('pets', 'Pets', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
  ], true); // documentSecurity: true — update/delete permission set per-document at creation, owner-only
  await addAttrs('pets', [
    ['ownerId', 'string', 64, true],
    ['name', 'string', 64, true],
    ['species', 'string', 32, true],
    ['breed', 'string', 64, false],
    ['gender', 'string', 16, false],
    ['size', 'string', 16, false],
    ['ageYears', 'double', null, false],
    ['ageMonths', 'integer', null, false],
    ['color', 'string', 64, false],
    ['vaccinated', 'boolean', null, false],
    ['neutered', 'boolean', null, false],
    ['friendlyWith', 'string', 256, false],
    ['weight', 'integer', null, false],
    ['photoUrl', 'string', 512, false],
    ['bio', 'string', 1024, false],
    ['location', 'string', 128, false],
    ['isSearchable', 'boolean', null, false, true], // default true
  ]);
  await addIndex('pets', 'idx_owner', 'key', ['ownerId']);
  await addIndex('pets', 'idx_species', 'key', ['species']);

  // ------------------------------------------------------------
  // LISTINGS
  // ------------------------------------------------------------
  await createCollection('listings', 'Listings', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
  ]);
  await addAttrs('listings', [
    ['sellerId', 'string', 64, true],
    ['title', 'string', 128, true],
    ['description', 'string', 2048, false],
    ['price', 'double', null, true],
    ['category', 'string', 64, false],
    ['imageUrl', 'string', 512, false],
    ['status', 'string', 16, false, 'active'],
    ['phone', 'string', 64, false, ''],
    ['location', 'string', 128, false, ''],
    ['sellerLocation', 'string', 128, false, ''],
  ]);
  await addIndex('listings', 'idx_seller', 'key', ['sellerId']);
  await addIndex('listings', 'idx_category', 'key', ['category']);

  // ------------------------------------------------------------
  // POSTS
  // ------------------------------------------------------------
  await createCollection('posts', 'Posts', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
    Permission.update(Role.users()), // needed so other users can toggle likes / bump commentCount
    Permission.delete(Role.users()), // needed so the post's author can delete it
  ]);
  await addAttrs('posts', [
    ['userId', 'string', 64, true],
    ['authorName', 'string', 128, false],   // denormalized for fast feed rendering
    ['content', 'string', 2048, false],
    ['imageUrl', 'string', 512, false],
    ['dogName', 'string', 64, false],
    ['postType', 'string', 32, false, 'Regular Post'], // e.g. "Lost Dog Alert", "Found Dog", "Looking for Mate"
    ['location', 'string', 128, false],
    ['likes', 'string', 64, false, null, true],  // array of user IDs who liked this post
    ['commentCount', 'integer', null, false, 0],
  ]);
  await addIndex('posts', 'idx_user', 'key', ['userId']);

  // ------------------------------------------------------------
  // CONVERSATIONS
  // ------------------------------------------------------------
  await createCollection('conversations', 'Conversations', [
    Permission.read(Role.users()), // narrowed at query time by participantIds
    Permission.create(Role.users()),
    Permission.update(Role.users()), // needed so participants can update unreadCounts when they read messages
  ]);
  await addAttrs('conversations', [
    ['listingId', 'string', 64, false],
    ['participantIds', 'string', 64, true, null, true], // array of user IDs
    ['unreadCounts', 'string', 4096, false, '{}'], // JSON string: { [userId]: count }
    ['lastMessage', 'string', 2048, false],
    ['lastMessageAt', 'datetime', null, false],
  ]);
  // Note: Appwrite does not support indexes on array attributes,
  // so participantIds is queried directly (e.g. Query.contains) without a custom index.

  // ------------------------------------------------------------
  // MESSAGES
  // ------------------------------------------------------------
  await createCollection('messages', 'Messages', [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
  ]);
  await addAttrs('messages', [
    ['conversationId', 'string', 64, true],
    ['senderId', 'string', 64, true],
    ['senderName', 'string', 128, false],
    ['content', 'string', 2048, true],
  ]);
  await addIndex('messages', 'idx_conversation', 'key', ['conversationId']);

  // ------------------------------------------------------------
  // PLAYDATE REQUESTS
  // ------------------------------------------------------------
  await createCollection('playdate_requests', 'Playdate Requests', [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
  ]);
  await addAttrs('playdate_requests', [
    ['requesterPetId', 'string', 64, true],
    ['targetPetId', 'string', 64, true],
    ['status', 'string', 16, false, 'pending'],
    ['message', 'string', 512, false],
  ]);
  await addIndex('playdate_requests', 'idx_target', 'key', ['targetPetId']);
  await addIndex('playdate_requests', 'idx_requester', 'key', ['requesterPetId']);

  // ------------------------------------------------------------
  // COMMENTS
  // ------------------------------------------------------------
  // documentSecurity = true: each comment document carries its own
  // permissions (set at creation time in the frontend), so only the
  // comment's author can update/delete it — not every logged-in user.
  await createCollection('comments', 'Comments', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
  ], true);
  await addAttrs('comments', [
    ['postId', 'string', 64, true],
    ['userId', 'string', 64, true],
    ['authorName', 'string', 128, false],
    ['content', 'string', 1024, true],
  ]);
  await addIndex('comments', 'idx_post', 'key', ['postId']);

  // ------------------------------------------------------------
  // STORAGE BUCKETS
  // ------------------------------------------------------------
  console.log('Creating storage buckets...');
  await createBucket('images', 'App Images', [
    Permission.read(Role.any()),
    Permission.create(Role.users()),
  ]);

  console.log('\nAll done! Database, collections, and storage are ready in Appwrite.');
}

async function createBucket(id, name, permissions) {
  try {
    await storage.createBucket(
      id,
      name,
      permissions,
      false,   // fileSecurity
      true,    // enabled
      30 * 1024 * 1024, // 30MB max file size
      ['jpg', 'jpeg', 'png', 'webp', 'gif'] // allowed extensions
    );
    console.log(`  + bucket ${name}`);
  } catch (e) {
    if (e.code === 409 || e.code === 403) {
      console.log(`  bucket ${name} already exists (or plan limit reached), continuing...`);
    } else {
      throw e;
    }
  }
}

// ------------------ HELPERS ------------------

async function createCollection(id, name, permissions, documentSecurity = false) {
  console.log(`Creating collection: ${name}...`);
  try {
    await databases.createCollection(DATABASE_ID, id, name, permissions, documentSecurity);
  } catch (e) {
    if (e.code !== 409) throw e;
    // Collection already exists — but permissions may have changed since it was
    // first created (e.g. adding `update` access), so sync them now too.
    console.log(`  Collection "${name}" already exists — syncing permissions...`);
    await databases.updateCollection(DATABASE_ID, id, name, permissions, documentSecurity);
  }
}

// attr = [key, type, size, required, default?, isArray?]
async function addAttrs(collectionId, attrs) {
  for (const [key, type, size, required, def, isArray] of attrs) {
    try {
      if (type === 'string') {
        await databases.createStringAttribute(
          DATABASE_ID, collectionId, key, size, required, def ?? undefined, isArray ?? false
        );
      } else if (type === 'double') {
        await databases.createFloatAttribute(
          DATABASE_ID, collectionId, key, required, undefined, undefined, def ?? undefined, isArray ?? false
        );
      } else if (type === 'integer') {
        await databases.createIntegerAttribute(
          DATABASE_ID, collectionId, key, required, undefined, undefined, def ?? undefined, isArray ?? false
        );
      } else if (type === 'boolean') {
        await databases.createBooleanAttribute(
          DATABASE_ID, collectionId, key, required, def ?? undefined, isArray ?? false
        );
      } else if (type === 'datetime') {
        await databases.createDatetimeAttribute(
          DATABASE_ID, collectionId, key, required, def ?? undefined, isArray ?? false
        );
      }
      console.log(`  + attribute ${key}`);
    } catch (e) {
      if (e.code !== 409) throw e;
      console.log(`  attribute ${key} already exists, continuing...`);
    }
    // Appwrite needs a short delay between attribute creations while it indexes
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function addIndex(collectionId, indexId, type, attributes) {
  try {
    await databases.createIndex(DATABASE_ID, collectionId, indexId, type, attributes);
    console.log(`  + index ${indexId}`);
  } catch (e) {
    if (e.code !== 409) throw e;
    console.log(`  index ${indexId} already exists, continuing...`);
  }
}

run().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
