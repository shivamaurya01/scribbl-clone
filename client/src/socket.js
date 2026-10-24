

import { io } from 'socket.io-client';


// No URL = connect to the same server that served the page (works locally via Vite proxy and in production)

export const socket = io(
  import.meta.env.VITE_SERVER_URL || undefined
);