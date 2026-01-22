import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'

import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

const queryClient = new QueryClient()

// SW registration handled by ReloadPrompt component

ReactDOM.createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>
) 