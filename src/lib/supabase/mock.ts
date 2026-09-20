/**
 * Mock Supabase client used when NEXT_PUBLIC_SUPABASE_URL is missing or a
 * placeholder. It exists so the app boots without a backend.
 *
 * The important property is that it must support *any* query chain. Server
 * Components build chains like
 * `.from('posts').select(...).eq(...).eq(...).gte(...).order(...)` and then
 * await them; a hand-written mock that only implements `.select().order()`
 * makes every one of those pages throw instead of rendering empty. So the
 * builder below answers every chainable method with itself and is awaitable,
 * resolving to an empty result. Auth and storage keep their explicit shapes.
 */

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

type QueryResult = {
  data: unknown
  error: null
  count: null
  status: number
  statusText: string
}

const EMPTY_RESULT: QueryResult = {
  data: null,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK',
}

type Row = Record<string, unknown>

// Methods that end a chain and resolve to rows rather than to a single object.
type Chainable = {
  then: Promise<QueryResult>['then']
  catch: Promise<QueryResult>['catch']
  finally: Promise<QueryResult>['finally']
  single: () => Chainable
  maybeSingle: () => Chainable
  returns: () => Chainable
  [key: string]: unknown
}

export interface MockQueryBuilder extends Chainable {
  eq: (...args: unknown[]) => MockQueryBuilder
  neq: (...args: unknown[]) => MockQueryBuilder
  gt: (...args: unknown[]) => MockQueryBuilder
  gte: (...args: unknown[]) => MockQueryBuilder
  lt: (...args: unknown[]) => MockQueryBuilder
  lte: (...args: unknown[]) => MockQueryBuilder
  in: (...args: unknown[]) => MockQueryBuilder
  is: (...args: unknown[]) => MockQueryBuilder
  like: (...args: unknown[]) => MockQueryBuilder
  ilike: (...args: unknown[]) => MockQueryBuilder
  match: (...args: unknown[]) => MockQueryBuilder
  or: (...args: unknown[]) => MockQueryBuilder
  not: (...args: unknown[]) => MockQueryBuilder
  filter: (...args: unknown[]) => MockQueryBuilder
  order: (...args: unknown[]) => MockQueryBuilder
  limit: (...args: unknown[]) => MockQueryBuilder
  range: (...args: unknown[]) => MockQueryBuilder
  select: (...args: unknown[]) => MockQueryBuilder
  insert: (...args: unknown[]) => MockQueryBuilder
  update: (...args: unknown[]) => MockQueryBuilder
  upsert: (...args: unknown[]) => MockQueryBuilder
  delete: (...args: unknown[]) => MockQueryBuilder
  rpc: (...args: unknown[]) => MockQueryBuilder
}

/**
 * Builds a chainable, awaitable query stub. Every builder method returns the
 * same object; awaiting it yields an empty result. `single()`/`maybeSingle()`
 * also resolve to an empty result (with `data: null`), which is what callers
 * test for with `if (data)`.
 */
function createQueryBuilder(result: QueryResult = EMPTY_RESULT): MockQueryBuilder {
  const promise = Promise.resolve(result)

  const builder = {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  } as unknown as MockQueryBuilder

  const methods = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'like', 'ilike',
    'match', 'or', 'not', 'filter', 'order', 'limit', 'range', 'select',
    'insert', 'update', 'upsert', 'delete', 'rpc', 'single', 'maybeSingle',
    'returns',
  ]

  for (const method of methods) {
    ;(builder as Row)[method] = () => builder
  }

  return builder
}

export interface MockQueryClient {
  select: (...args: unknown[]) => MockQueryBuilder
  insert: (...args: unknown[]) => MockQueryBuilder
  update: (...args: unknown[]) => MockQueryBuilder
  upsert: (...args: unknown[]) => MockQueryBuilder
  delete: (...args: unknown[]) => MockQueryBuilder
}

export const mockDb: Record<string, MockQueryClient> = new Proxy(
  {},
  {
    get: () =>
      new Proxy({} as MockQueryClient, {
        get: () => (..._ignored: unknown[]) => {
          void _ignored
          return createQueryBuilder()
        },
      }),
  }
)

export const mockStorage = {
  from: () => ({
    upload: () => Promise.resolve({ data: null, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: () => Promise.resolve({ data: null, error: null }),
    list: () => Promise.resolve({ data: [], error: null }),
    createSignedUrl: () => Promise.resolve({ data: null, error: null }),
  }),
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
  from: (table: string) => {
    void table
    return mockDb[table]
  },
  storage: mockStorage,
}

export function createMockClient() {
  return mockSupabase
}
