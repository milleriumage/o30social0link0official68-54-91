import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Crown, DollarSign, Lock, Unlock, Eye, EyeOff, Share2, ArrowLeft, Settings, User, ArrowRight, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useUserCredits } from "@/hooks/useUserCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { useVisibilitySettings } from "@/hooks/useVisibilitySettings";
// Logo removida - usando nova logo inline
import { EnhancedChat } from "@/components/EnhancedChat";
import { MediaShowcase } from "@/components/MediaShowcase";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { UserFloatingDialog } from "@/components/UserFloatingDialog";
import { AddCreditsDialog } from "@/components/AddCreditsDialog";
import { PremiumPlansManager } from "@/components/PremiumPlansManager";
import { CreditSuccessNotification } from "@/components/CreditSuccessNotification";
import { SubscriptionSuccessNotification } from "@/components/SubscriptionSuccessNotification";
import { ActivePlanIndicator } from "@/components/ActivePlanIndicator";
import { VisibilitySettingsDialog } from "@/components/VisibilitySettingsDialog";
import { getMediaUrl } from "@/lib/mediaUtils";
import { fixMediaPolicies } from "@/utils/fixMediaPolicies";
import { useCreatorPermissions } from "@/hooks/useCreatorPermissions";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Badge } from "@/components/ui/badge";

const VisitanteLivre = () => {
  // Estrutura interna e lógica do componente UserView
  const {
    creatorId: rawCreatorId
  } = useParams<{
    creatorId: string;
  }>();
  // Mapeia "default" para um ID de usuário de template para evitar conflito com dados de visitantes
  const creatorId = rawCreatorId === 'default' ? '509bdca7-b48f-47ab-8150-261585a125c2' : rawCreatorId;
  const isViewingCreatorPage = !!creatorId;
  const { user } = useGoogleAuth();
  const {
    messages,
    sendMessage
  } = useRealtimeMessages();
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const {
    credits,
    isLoading: creditsLoading,
    addCredits,
    isLoggedIn
  } = useUserCredits();
  const {
    subscribed,
    subscription_tier,
    checkSubscription
  } = useSubscription();
  const {
    settings: visibilitySettings
  } = useVisibilitySettings(creatorId);
  const {
    isCreator,
    canEdit
  } = useCreatorPermissions(creatorId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [addedCredits, setAddedCredits] = useState(0);
  const [showSubscriptionSuccess, setShowSubscriptionSuccess] = useState(false);
  const [subscribedPlan, setSubscribedPlan] = useState('');
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
  const navigate = useNavigate();

  // Carregar dados do criador e suas mídias
  useEffect(() => {
    const loadCreatorData = async () => {
      if (!creatorId || !isViewingCreatorPage) {
        console.log('🚫 DEBUG: No valid creatorId provided for UserView', {
          creatorId,
          isViewingCreatorPage
        });
        return;
      }
      console.log('📊 DEBUG: Loading creator data for:', creatorId);
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        console.log('👤 DEBUG: Current user auth status:', {
          isLoggedIn: !!user,
          userId: user?.id
        });

        console.log('🔍 DEBUG: Fetching creator profile...');
        const {
          data: profileData,
          error: profileError
        } = await supabase.from('profiles').select('*').eq('user_id', creatorId).single();
        if (profileError) {
          console.error('❌ DEBUG: Error loading creator profile:', profileError);
          console.log('🔍 DEBUG: Profile error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details
          });
          toast.error('❌ Criador não encontrado');
          return;
        }
        console.log('✅ DEBUG: Creator profile loaded:', profileData);
        setCreatorProfile(profileData);

        console.log('🎬 DEBUG: Fetching creator media items...');
        const {
          data: mediaData,
          error: mediaError
        } = await supabase.from('media_items').select('*').eq('user_id', creatorId).order('created_at', {
          ascending: false
        });
        if (mediaError) {
          console.error('❌ DEBUG: Error loading creator media:', mediaError);
          console.log('🔍 DEBUG: Media error details:', {
            code: mediaError.code,
            message: mediaError.message,
            details: mediaError.details,
            hint: mediaError.hint
          });
          if (mediaError.code === '42501' || mediaError.message?.includes('policy')) {
            console.log('🚫 DEBUG: RLS policy blocking media access for anonymous users');
            toast.error('❌ Acesso às mídias bloqueado por política de segurança');
          } else {
            toast.error('❌ Erro ao carregar mídias do criador');
          }
          setMediaItems([]);
        } else {
          console.log('✅ DEBUG: Media items loaded:', {
            count: mediaData?.length || 0,
            items: mediaData?.map(item => ({
              id: item.id,
              type: item.type,
              is_main: item.is_main,
              storage_path: item.storage_path?.substring(0, 50) + '...'
            }))
          });
          setMediaItems(mediaData || []);
        }
      } catch (error) {
        console.error('💥 DEBUG: Unexpected error loading creator data:', error);
        toast.error('❌ Erro ao carregar dados do criador');
      }
    };
    loadCreatorData();
  }, [creatorId, isViewingCreatorPage]);

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const creditsParam = searchParams.get('credits');
    const subscriptionSuccess = searchParams.get('subscription_success');
    const planParam = searchParams.get('plan');
    if (paymentSuccess === 'true' && creditsParam) {
      const creditsAmount = parseInt(creditsParam);
      setAddedCredits(creditsAmount);
      setShowSuccessNotification(true);
      addCredits(creditsAmount);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('payment_success');
      newSearchParams.delete('credits');
      setSearchParams(newSearchParams, {
        replace: true
      });
    }
    if (subscriptionSuccess === 'true' && planParam) {
      setSubscribedPlan(planParam);
      setShowSubscriptionSuccess(true);
      checkSubscription();
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('subscription_success');
      newSearchParams.delete('plan');
      setSearchParams(newSearchParams, {
        replace: true
      });
      setTimeout(() => {
        setShowSubscriptionSuccess(false);
      }, 30000);
    }
  }, [searchParams, setSearchParams, addCredits, checkSubscription]);
  const streamerImage = "/lovable-uploads/7503b55d-e8fe-47c3-9366-ca734fd0c867.png";
  const mainMedia = mediaItems.find(item => item.is_main) || {
    storage_path: streamerImage,
    is_blurred: false,
    price: "",
    type: 'image' as const
  };
  const handleShare = async () => {
    if (!rawCreatorId) return;
    const shareUrl = `${window.location.origin}/user/${rawCreatorId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("🔗 Link copiado para a área de transferência!");
    } catch {
      if ((navigator as any).share) {
        try {
          await (navigator as any).share({
            url: shareUrl,
            title: "AuraLink"
          });
          return;
        } catch {}
      }
      toast.error("❌ Não foi possível copiar o link");
    }
  };

  // Carregando dados
  if (!creatorProfile) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 text-center">
          <div>Carregando perfil do criador...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200">
          <Button onClick={() => navigate('/')} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
        </Card>

        {/* Tela Principal - SEMPRE VISÍVEL NO TESTE */}
        {mediaItems.length > 0 && (() => {
          const mainMedia = mediaItems.find(media => media.is_main) || mediaItems[0];
          return (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📺 Tela Principal (Visualização do Visitante)
              </h3>
              <div className="relative">
                {mainMedia && (
                  <div className="flex justify-center">
                    {mainMedia.type === 'video' ? (
                      <video
                        src={getMediaUrl(mainMedia.storage_path)}
                        controls
                        className={`w-full max-h-80 md:max-h-96 lg:max-h-[500px] object-contain rounded-lg transition-all duration-300 ${
                          mainMedia.is_blurred ? 'blur-md hover:blur-none' : ''
                        }`}
                        title={mainMedia.name || "Tela principal"}
                        onError={(e) => {
                          console.error('Erro ao carregar vídeo principal:', mainMedia.storage_path);
                        }}
                      />
                  ) : (
                    <img
                      src={getMediaUrl(mainMedia.storage_path)}
                      alt="Tela Principal"
                      className={`w-full max-h-80 md:max-h-96 lg:max-h-[500px] object-contain rounded-lg transition-all duration-300 ${
                        mainMedia.is_blurred ? 'blur-md hover:blur-none' : ''
                      }`}
                      title={mainMedia.name || "Tela principal"}
                      onError={(e) => {
                        console.error('Erro ao carregar imagem principal:', mainMedia.storage_path);
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                      loading="lazy"
                    />
                  )}
                  {/* Price overlay na tela principal */}
                  {mainMedia.price && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-black/80 text-white">
                        {typeof mainMedia.price === 'string' ? JSON.parse(mainMedia.price).text : mainMedia.price}
                      </Badge>
                    </div>
                  )}
                  {/* Main indicator */}
                  {mainMedia.is_main && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default" className="bg-yellow-500">
                        ⭐ Principal
                      </Badge>
                    </div>
                  )}
                  </div>
                )}
              </div>
            </Card>
          );
        })()}
      </div>
    </div>
  );
};

export default VisitanteLivre;