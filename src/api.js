import axios from 'axios';
import WebApp from '@twa-dev/sdk';

export const api = axios.create({ timeout: 15000 });

api.interceptors.request.use((config) => {
  const initData = WebApp.initData || '';
  config.headers = config.headers || {};
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  return config;
});
