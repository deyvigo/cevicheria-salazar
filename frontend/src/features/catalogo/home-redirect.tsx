import { Navigate, useLocation } from 'react-router-dom';
import { useCategories } from '@/features/catalogo/use-catalog-queries';

export function HomeRedirect() {
  const location = useLocation();
  const { data } = useCategories();

  if (!data || data.length === 0) return null;
  // Keep the router state so the "Cerraste sesión" notice survives the redirect
  return <Navigate to={`/${data[0].slug}`} replace state={location.state} />;
}
