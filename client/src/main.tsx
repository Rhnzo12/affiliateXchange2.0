// DISABLE WebSocket - Use this if you don't need real-time features
if (import.meta.env.DEV) {
  // @ts-ignore - Block all WebSocket connections
  window.WebSocket = function(url, protocols) {
    console.warn('[WebSocket BLOCKED]', url?.toString());
    
    // Return a fake closed WebSocket
    return {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      readyState: 3,
      send: () => {},
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      url: url?.toString() || '',
      protocol: '',
      extensions: '',
      bufferedAmount: 0,
      binaryType: 'blob' as BinaryType,
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    } as WebSocket;
  };
  
  console.log('[Dev Mode] WebSocket connections DISABLED');
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);