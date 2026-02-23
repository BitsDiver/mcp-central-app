import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/endpoints',
    name: 'endpoints',
    component: () => import('@/views/EndpointsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/endpoints/:id',
    name: 'endpoint-detail',
    component: () => import('@/views/EndpointDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tools',
    name: 'tools',
    component: () => import('@/views/ToolsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/keys',
    name: 'keys',
    component: () => import('@/views/KeysView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tenants',
    name: 'tenants',
    component: () => import('@/views/TenantsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/registry',
    name: 'registry',
    component: () => import('@/views/RegistryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
