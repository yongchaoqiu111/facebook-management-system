import { createRouter, createWebHistory } from 'vue-router';
import Market from '../views/Market.vue';
import Trade from '../views/Trade.vue';
import OrderHistory from '../views/OrderHistory.vue';
import Profile from '../views/Profile.vue';

const routes = [
  {
    path: '/',
    name: 'Market',
    component: Market
  },
  {
    path: '/trade',
    name: 'Trade',
    component: Trade
  },
  {
    path: '/orders',
    name: 'OrderHistory',
    component: OrderHistory
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;