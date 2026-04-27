const mockUser = {
  id: 'mock-user-1',
  email: 'demo@kodingvibes.local',
  name: 'Demo User',
  username: 'demouser',
  avatar_url: null,
  banner_url: null,
  is_admin: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockSession = {
  user: mockUser,
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
}

export const mockDb = {
  posts: {
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  },
  comments: {
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
  },
  users: {
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: mockUser, error: null }),
      }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
  },
  votes: {
    select: () => ({
      eq: () => Promise.resolve({ data: [], error: null }),
    }),
    upsert: () => Promise.resolve({ data: null, error: null }),
  },
  groups: {
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
  },
  notifications: {
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
}

export const mockSupabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    getSession: () => Promise.resolve({ data: { session: mockSession }, error: null }),
    signInWithOAuth: () => Promise.resolve({ data: { url: '/', error: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: (event: string, session: { user: typeof mockUser } | null) => void) => {
      callback('SIGNED_IN', { user: mockUser })
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    exchangeCodeForSession: () => Promise.resolve({ error: null }),
  },
  from: (table: string) => mockDb[table as keyof typeof mockDb] || mockDb.posts,
  storage: mockDb.storage,
}

export function createMockClient() {
  return mockSupabase
}
