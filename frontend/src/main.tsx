import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import '@/styles/global.css';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { router } from '@/router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
