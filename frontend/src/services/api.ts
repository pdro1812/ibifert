import axios from 'axios';

export const api = axios.create({
  // O Nginx vai interceptar tudo que tiver '/api' e encaminhar em segredo pro backend
  baseURL: '/api', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});