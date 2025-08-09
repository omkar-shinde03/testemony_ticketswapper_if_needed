
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";
import { EnhancedSearchFilters } from "./EnhancedSearchFilters";
import { MobileOptimizedTicketCard } from "./MobileOptimizedTicketCard";
import { EnhancedMessagingSystem } from "../messaging/EnhancedMessagingSystem";
import { TicketGridSkeleton } from "./LoadingStates";
import { EmptyState } from "./EmptyStates";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import EmailVerificationGuard from "./EmailVerificationGuard";
import { isEmailVerified } from "@/utils/emailVerification";
import { sendTransactionNotification } from "@/components/notifications/EnhancedNotificationSystem";

export const AvailableTickets = ({ availableTickets }) => {
  const [filteredTickets, setFilteredTickets] = useState(availableTickets);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [userEmailVerified, setUserEmailVerified] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFilteredTickets(availableTickets);
    
    // Get current user and check email verification
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        if (user) {
          const verified = await isEmailVerified();
          setUserEmailVerified(verified);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getCurrentUser();

    // Listen for global email-verified event to refresh verification state immediately
    const handleVerified = async () => {
      try {
        const verified = await isEmailVerified();
        setUserEmailVerified(verified);
      } catch (err) {
        console.error('Failed updating email verification state:', err);
      }
    };
    window.addEventListener('email-verified', handleVerified);

    return () => {
      window.removeEventListener('email-verified', handleVerified);
    };
  }, [availableTickets]);

  const handleTicketAction = async (ticket, action) => {
    switch (action) {
      case 'buy':
        await handleBuyTicket(ticket);
        break;
      case 'message':
        setSelectedTicket(ticket);
        setShowMessaging(true);
        break;
      case 'view':
        toast({
          title: "View Details",
          description: "Detailed view coming soon",
        });
        break;
    }
  };

  const handleBuyTicket = async (transactionData) => {
    // This function is called after successful purchase from QuickPurchaseButton
    // Refresh the tickets list
    window.location.reload(); // Simple refresh for now
    
    toast({
      title: "Purchase Complete! 🎉",
      description: "Your ticket has been purchased successfully.",
    });
  };

  if (showMessaging && selectedTicket && currentUser) {
    return (
      <ErrorBoundary>
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setShowMessaging(false)}
            className="mb-4"
          >
            ← Back to Tickets
          </Button>
          <EnhancedMessagingSystem
            ticketId={selectedTicket.id}
            currentUserId={currentUser.id}
            otherUserId={selectedTicket.seller_id}
            otherUserName={selectedTicket.seller_name || "Seller"}
            otherUserAvatar={selectedTicket.seller_avatar}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Available Tickets ({filteredTickets.length})</span>
            </CardTitle>
            <CardDescription>
              Browse and purchase bus tickets from other users with enhanced search and filtering
            </CardDescription>
          </CardHeader>
        </Card>

        <EnhancedSearchFilters 
          tickets={availableTickets}
          onFilteredResults={setFilteredTickets}
        />

        {isLoading ? (
          <TicketGridSkeleton />
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            type="search"
            title="No tickets found"
            description="No tickets match your search criteria. Try adjusting your filters."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map((ticket) => (
              <MobileOptimizedTicketCard
                key={ticket.id}
                ticket={ticket}
                onAction={handleTicketAction}
                showActions={true}
                
                showEmailVerificationRequired={!userEmailVerified && currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
