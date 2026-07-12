import { Client, Account, Databases, Storage } from 'appwrite';

// ------------------ CONFIG ------------------
// Loaded from frontend/.env — see VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID
// These are safe to expose in frontend code — this is your PUBLIC project ID,
// not a secret API key. Never put your Appwrite API key in frontend code.
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!ENDPOINT || !PROJECT_ID) {
  throw new Error(
    'Missing Appwrite config. Make sure frontend/.env has VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID set, then restart your dev server.'
  );
}

export const DATABASE_ID = 'petapp_db';
export const IMAGES_BUCKET_ID = 'images';

export const COLLECTIONS = {
  PROFILES: 'profiles',
  PETS: 'pets',
  LISTINGS: 'listings',
  POSTS: 'posts',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  PLAYDATE_REQUESTS: 'playdate_requests',
  COMMENTS: 'comments',
};
// ---------------------------------------------

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export default client;
