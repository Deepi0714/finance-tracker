import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

const api = axios.create({ baseURL: BASE });

// ── Attach bearer token ────────────────────────────────────
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ────────────────────────────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('accessToken',  data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch {
        localStorage.clear();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

const d = <T>(p: Promise<{ data: T }>) => p.then(r => r.data);

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  register:      (body: any) => d(api.post('/auth/register', body)),
  login:         (body: any) => d(api.post('/auth/login',    body)),
  logout:        (token: string) => api.post('/auth/logout', { refreshToken: token }),
  getProfile:    () => d(api.get('/auth/profile')),
  updateProfile: (body: any) => d(api.put('/auth/profile', body)),
};

// ── Transactions ──────────────────────────────────────────
export const txApi = {
  dashboard: ()           => d(api.get('/transactions/dashboard')),
  list:      (p?: any)    => d(api.get('/transactions', { params: p })),
  create:    (body: any)  => d(api.post('/transactions',     body)),
  update:    (id: string, body: any) => d(api.put(`/transactions/${id}`, body)),
  remove:    (id: string) => d(api.delete(`/transactions/${id}`)),
};

// ── Budgets ───────────────────────────────────────────────
export const budgetApi = {
  list:   (p?: any)    => d(api.get('/budgets', { params: p })),
  upsert: (body: any)  => d(api.post('/budgets', body)),
  remove: (id: string) => d(api.delete(`/budgets/${id}`)),
};

// ── Subscriptions ─────────────────────────────────────────
export const subApi = {
  list:   ()           => d(api.get('/subscriptions')),
  create: (body: any)  => d(api.post('/subscriptions',     body)),
  update: (id: string, body: any) => d(api.put(`/subscriptions/${id}`, body)),
  remove: (id: string) => d(api.delete(`/subscriptions/${id}`)),
};

// ── Categories ────────────────────────────────────────────
export const catApi = {
  list:   ()           => d(api.get('/categories')),
  create: (body: any)  => d(api.post('/categories', body)),
  remove: (id: string) => d(api.delete(`/categories/${id}`)),
};

// ── Insights ──────────────────────────────────────────────
export const insightApi = {
  get:    ()       => d(api.get('/insights')),
  report: (p?: any) => d(api.get('/insights/report', { params: p })),
};

// ── Savings ───────────────────────────────────────────────
export const savingsApi = {
  list:   ()           => d(api.get('/savings')),
  create: (body: any)  => d(api.post('/savings',     body)),
  update: (id: string, body: any) => d(api.put(`/savings/${id}`, body)),
  remove: (id: string) => d(api.delete(`/savings/${id}`)),
};

// ── Notifications ─────────────────────────────────────────
export const notifApi = {
  list:       () => d(api.get('/notifications')),
  readAll:    () => d(api.put('/notifications/read-all')),
  readOne:    (id: string) => d(api.put(`/notifications/${id}/read`)),
};
