import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000/api', // Matches your server.js routes (using port 8000 from .env)
});

export default API;