
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bus, LogOut, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuickSellForm from "@/components/dashboard/QuickSellForm";
import TicketCard from "@/components/dashboard/TicketCard";
import { KYCCompletion } from "@/components/dashboard/KYCCompletion";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";

import { MessagesList } from "@/components/messaging/MessagesList";
import { MessagingIntegration } from "@/components/messaging/MessagingIntegration";
import { RealtimeMessagingProvider } from "@/components/messaging/RealtimeMessagingProvider";
import { MessageNotificationBadge } from "@/components/messaging/MessageNotificationBadge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useToast } from "@/hooks/use-toast";
import { PaymentSettings } from "@/components/dashboard/PaymentSettings";
import { PendingPayouts } from "@/components/dashboard/PendingPayouts";
import { EmailVerificationStatus } from "@/components/dashboard/EmailVerificationStatus";


const Dashboard = () => {
  const [showKYC, setShowKYC] = useState(false);
  const [activeTab, setActiveTab] = useState('sell');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const {
    user,
    profile,
    tickets,
    availableTickets,
    isLoading,
    handleLogout
  } = useDashboardData();
  
  const { toast } = useToast();

  const handleTicketAdded = () => {
    // This will trigger a refresh through the real-time subscription
    toast({
      title: "Success!",
      description: "Your ticket has been listed successfully.",
    });
  };

  const handleBuyTicket = (transactionData) => {
    // Refresh dashboard data after successful purchase
    window.location.reload();
    toast({
      title: "Purchase Successful!",
      description: "Your ticket has been purchased successfully.",
    });
  };

  const handleTicketAction = (ticket, action) => {
    switch (action) {
      case 'buy':
        handleBuyTicket(ticket);
        break;
      case 'message':
        // This will be handled by the MessagingIntegration component
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bus className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <RealtimeMessagingProvider currentUserId={user?.id}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <Bus className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">TicketSwap</h1>
                  <p className="text-sm text-gray-500">Welcome, {profile?.full_name || user?.email}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email Verification Banner */}
        <EmailVerificationBanner />
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900">Your Tickets</h3>
            <p className="text-3xl font-bold text-blue-600">{tickets.length}</p>
            <p className="text-sm text-gray-500">Total listed</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900">Available</h3>
            <p className="text-3xl font-bold text-green-600">{availableTickets.length}</p>
            <p className="text-sm text-gray-500">Tickets to buy</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900">KYC Status</h3>
            <p className="text-lg font-semibold text-orange-600 capitalize">{profile?.kyc_status || 'Not Verified'}</p>
            <p className="text-sm text-gray-500 mb-3">Verification</p>
            {(!profile?.kyc_status || profile?.kyc_status === 'not_verified') && (
              <Button 
                onClick={() => setShowKYC(true)}
                size="sm"
                className="w-full"
              >
                Complete KYC
              </Button>
            )}
            {profile?.kyc_status === 'pending' && (
              <Button 
                onClick={() => setShowKYC(true)}
                size="sm"
                className="w-full"
                variant="outline"
              >
                Complete KYC
              </Button>
            )}
          </div>
        </div>

        {/* KYC Completion Section */}
        {(showKYC || (!profile?.kyc_status || profile?.kyc_status === 'not_verified')) && (
          <KYCCompletion 
            profile={profile} 
            onUpdate={() => {
              setShowKYC(false);
              window.location.reload();
            }} 
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sell">Sell Tickets</TabsTrigger>
            <TabsTrigger value="buy">Buy Tickets</TabsTrigger>
            <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              <MessageNotificationBadge currentUserId={user?.id} className="absolute -top-1 -right-1" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sell" className="space-y-6">
            <QuickSellForm user={user} onTicketAdded={handleTicketAdded} />
          </TabsContent>

          <TabsContent value="buy" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Available Tickets</h2>
              {availableTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tickets available at the moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableTickets.map((ticket) => (
                    <div key={ticket.id} className="space-y-3">
                      <TicketCard
                        ticket={ticket}
                        onBuyClick={handleBuyTicket}
                        isOwner={false}
                      />
                      <MessagingIntegration
                        ticket={ticket}
                        currentUserId={user?.id}
                        triggerText="Message Seller"
                        triggerVariant="outline"
                        triggerSize="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-tickets" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Listed Tickets</h2>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">You haven't listed any tickets yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      isOwner={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <PaymentSettings />
              <PendingPayouts />
            </div>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <EmailVerificationStatus />
          </TabsContent>
          <TabsContent value="messages" className="space-y-6">
            <MessagesList currentUserId={user?.id} />
          </TabsContent>

        </Tabs>
      </div>
        
      </div>
    </RealtimeMessagingProvider>
  );
};

export default Dashboard;
