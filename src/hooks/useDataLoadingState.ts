import { useState, useEffect } from 'react';
import { useGoogleAuth } from './useGoogleAuth';
import { useRealtimeMedia } from './useRealtimeMedia';
import { useUserCredits } from './useUserCredits';

interface LoadingState {
  isInitialLoading: boolean;
  isDataLoading: boolean;
  loadingMessage: string;
  showVitrine: boolean;
}

export const useDataLoadingState = () => {
  const { user, isLoading: authLoading, session } = useGoogleAuth();
  const { isLoading: creditsLoading } = useUserCredits();
  
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isInitialLoading: true,
    isDataLoading: false,
    loadingMessage: 'Carregando seus dados...',
    showVitrine: false
  });

  // Controlar loading inicial após login
  useEffect(() => {
    if (authLoading) {
      setLoadingState(prev => ({
        ...prev,
        isInitialLoading: true,
        loadingMessage: 'Autenticando usuário...',
        showVitrine: false
      }));
      return;
    }

    if (user && session) {
      // Usuário logado - carregar dados
      setLoadingState(prev => ({
        ...prev,
        isDataLoading: true,
        loadingMessage: 'Carregando suas mídias e configurações...',
        showVitrine: true
      }));

      // Simular tempo mínimo de carregamento para UX suave
      const minLoadingTime = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          isInitialLoading: false,
          isDataLoading: false
        }));
      }, 1500);

      return () => clearTimeout(minLoadingTime);
    } else {
      // Não logado ou guest - loading rápido
      const quickLoad = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          isInitialLoading: false,
          isDataLoading: false
        }));
      }, 500);

      return () => clearTimeout(quickLoad);
    }
  }, [user, session, authLoading]);

  // Loading adicional para créditos
  useEffect(() => {
    if (creditsLoading && user) {
      setLoadingState(prev => ({
        ...prev,
        isDataLoading: true,
        loadingMessage: 'Sincronizando créditos...'
      }));
    }
  }, [creditsLoading, user]);

  return {
    isLoading: loadingState.isInitialLoading || loadingState.isDataLoading,
    loadingMessage: loadingState.loadingMessage,
    showVitrine: loadingState.showVitrine
  };
};