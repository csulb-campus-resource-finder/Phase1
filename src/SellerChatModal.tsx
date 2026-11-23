import React, { useState, useEffect } from 'react';
import chatService from './services/chatService.js';
import { getActiveMarketplaceSession, buildMarketplaceHeaders } from './utils/marketplaceAuth.js';
import { Message } from './types/chat.js';

interface Listing {
  id: number | string;
  title: string;
  price: number;
  seller_email?: string;
  sellerId?: string;
  sellerName?: string;
  image_data?: string | null;
}

interface SellerChatModalProps {
  listing: Listing;
  currentUserEmail?: string;
  currentUserRole?: string;
  onBack: () => void;
}

interface ChatMessageItem {
  id?: string | number;
  sender_email: string;
  message_text: string;
  sent_at?: string;
}

function normalizeMessage(raw: any): ChatMessageItem {
  return {
    id: raw?.id,
    sender_email: raw?.sender_email || raw?.senderId || '',
    message_text: raw?.message_text ?? raw?.content ?? '',
    sent_at: raw?.sent_at || raw?.createdAt,
  };
}

export const SellerChatModal: React.FC<SellerChatModalProps> = ({
  listing,
  currentUserEmail: propEmail,
  currentUserRole: propRole,
  onBack,
}) => {
  const session = getActiveMarketplaceSession();
  const activeEmail = (session?.email || propEmail || '').trim().toLowerCase();
  const activeRole = (session?.role || propRole || '').trim();
  const hasValidSession = Boolean(session && activeEmail && activeRole);

  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedSpot, setSelectedSpot] = useState<string>('University Student Union');
  const [confirmedSpot, setConfirmedSpot] = useState<boolean>(false);
  const [viewState, setViewState] = useState<'chat' | 'checkout' | 'success'>('chat');
  const [loading, setLoading] = useState<boolean>(hasValidSession);

  // Payment & error states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const sellerEmail = (
    listing.seller_email ||
    listing.sellerId ||
    listing.sellerName ||
    'nadhirah.michael-ho01@student.csulb.edu'
  ).trim();

  const appendUniqueMessage = (incoming: any) => {
    const normalized = normalizeMessage(incoming);
    if (!normalized.message_text) return;

    setMessages((prev) => {
      if (normalized.id !== undefined && prev.some((m) => String(m.id) === String(normalized.id))) {
        return prev;
      }
      return [...prev, normalized];
    });
  };

  // 1. Initialize or find the chat thread on mount
  useEffect(() => {
    if (!hasValidSession) {
      setLoading(false);
      return;
    }

    async function initChat() {
      try {
        const res = await fetch('/api/v1/marketplace/chats', {
          method: 'POST',
          headers: buildMarketplaceHeaders(true),
          body: JSON.stringify({
            listingId: listing.id,
            sellerEmail,
          }),
        });
        const data = await res.json();
        if (data.success && data.chat) {
          setChatId(data.chat.id);
        }
      } catch (err) {
        console.error('Failed to initialize chat session', err);
      } finally {
        setLoading(false);
      }
    }
    initChat();
  }, [listing, hasValidSession, sellerEmail]);

  // 2. Fetch existing messages when chatId is ready
  useEffect(() => {
    if (!chatId || !hasValidSession) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/v1/marketplace/chats/${chatId}/messages`, {
          headers: buildMarketplaceHeaders(false),
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data.map(normalizeMessage) : [];
          setMessages(list);
        }
      } catch (err) {
        console.error('Error fetching messages', err);
      }
    };

    fetchMessages();
  }, [chatId, hasValidSession]);

  // 3. Connect Socket.io room for real-time cross-device updates
  useEffect(() => {
    if (!hasValidSession) {
      chatService.disconnect();
      return;
    }

    const phase2ServerUrl =
      (import.meta as any).env?.VITE_CHAT_SERVER_URL ||
      (import.meta as any).env?.VITE_API_URL ||
      `${window.location.protocol}//${window.location.hostname}:3001`;

    const socket = chatService.connect(phase2ServerUrl);
    if (!socket) return;

    chatService.joinRoom({
      listingId: String(listing.id),
      userId: activeEmail,
      role: activeRole,
    });

    chatService.onMessageReceived((newMessage: Message | any) => {
      if (newMessage?.listingId && String(newMessage.listingId) !== String(listing.id)) {
        return;
      }
      appendUniqueMessage(newMessage);
    });

    return () => {
      chatService.offMessageReceived();
    };
  }, [listing.id, hasValidSession, activeEmail, activeRole]);

  const postMessageToDB = async (senderEmail: string, text: string) => {
    if (!chatId || !hasValidSession) return;
    const res = await fetch(`/api/v1/marketplace/chats/${chatId}/messages`, {
      method: 'POST',
      headers: buildMarketplaceHeaders(true),
      body: JSON.stringify({
        text,
        senderEmail,
        listingId: listing.id,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.message) {
        appendUniqueMessage(data.message);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!hasValidSession) {
      const msg = '[Chat Send Blocked] Missing active marketplace session (email or role).';
      console.error(msg);
      setSendError('Please sign in with an email and role before sending messages.');
      return;
    }

    if (!chatId) {
      const msg = '[Chat Send Blocked] chatId is null — /api/v1/marketplace/chats did not return a chat ID.';
      console.error(msg, { listingId: listing.id, sellerEmail });
      setSendError('Chat room is not ready yet. Check that the backend server is running.');
      return;
    }

    if (!chatService.isConnected) {
      const msg = '[Chat Send Blocked] Socket.IO is not connected to the server.';
      console.error(msg, { chatId, listingId: listing.id });
      setSendError('Real-time chat disconnected. Reconnecting to server...');
      return;
    }

    setSendError(null);
    const userText = inputMessage;
    setInputMessage('');

    const receiverEmail =
      activeEmail === sellerEmail.toLowerCase() ? sellerEmail : sellerEmail;

    chatService.sendMessage({
      listingId: String(listing.id),
      chatId,
      senderId: activeEmail,
      receiverId: receiverEmail,
      role: activeRole,
      content: userText,
    });
  };

  const handleConfirmSpot = async () => {
    if (!hasValidSession) return;
    setConfirmedSpot(true);
    if (!chatId) return;

    const spotMessage = `📍 Agreed Meetup Spot: ${selectedSpot}`;
    chatService.sendMessage({
      listingId: String(listing.id),
      chatId,
      senderId: activeEmail,
      receiverId: sellerEmail,
      role: activeRole,
      content: spotMessage,
    });
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidSession) return;
    setProcessingPayment(true);

    setTimeout(async () => {
      try {
        const storageKey = `csulb_perk_points_${activeEmail}`;
        const currentSaved = Number(localStorage.getItem(storageKey) || '345');
        const nextPoints = (Number.isNaN(currentSaved) ? 345 : currentSaved) + 50;
        localStorage.setItem(storageKey, String(nextPoints));
        window.dispatchEvent(
          new CustomEvent('csulb:points-updated', {
            detail: { email: activeEmail, pointsDelta: 50, points: nextPoints },
          })
        );
      } catch (err) {
        console.error('Failed to persist awarded points locally:', err);
      }

      try {
        await fetch('/api/rewards/award', {
          method: 'POST',
          headers: buildMarketplaceHeaders(true),
          body: JSON.stringify({
            userId: activeEmail,
            points: 50,
            reason: `Marketplace checkout: ${listing.title}`,
          }),
        });
      } catch (err) {
        console.error('Failed to sync awarded points with backend:', err);
      }

      setProcessingPayment(false);
      setViewState('success');
      alert('Secure payment successful! +50 Gamification points awarded.');

      if (chatId) {
        await postMessageToDB(activeEmail, `💳 Paid $${Number(listing.price).toFixed(2)} via Secure Checkout!`);
        await postMessageToDB(
          sellerEmail,
          `Payment confirmed! Thanks for using CSULB Campus Resource Finder.`
        );
      }
    }, 1500);
  };

  if (!hasValidSession) {
    return (
      <div
        style={{
          maxWidth: '520px',
          margin: '48px auto',
          background: '#FFFFFF',
          padding: '32px',
          borderRadius: '16px',
          border: '1px solid #CBD5E1',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', color: '#002B49', fontSize: '20px', fontWeight: '900' }}>
          🔐 Sign In Required for Seller Chat
        </h3>
        <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
          You must be logged in with <strong>both a valid email address and an account role</strong> to
          message sellers, confirm meetups, or check out.
        </p>
        <button
          onClick={onBack}
          style={{
            background: '#002B49',
            color: '#FFC72C',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ← Back to Marketplace
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '16px', color: '#4B5563' }}>
        Loading secure session...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '88vh',
        background: '#EFEAE2',
        maxWidth: '750px',
        margin: '20px auto',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Professional Header */}
      <div
        style={{
          background: '#002B49',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          borderBottom: '1px solid #001F35',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBack}
            style={{
              border: 'none',
              background: '#00406B',
              color: '#FFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💬 CSULB Verified Seller Chat</span>
              <span
                style={{
                  fontSize: '11px',
                  background: '#10B981',
                  color: '#FFF',
                  padding: '2px 8px',
                  borderRadius: '1rem',
                  fontWeight: '600',
                }}
              >
                Active ({activeRole})
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '2px' }}>
              Item: <strong style={{ color: '#FFC72C' }}>{listing.title}</strong> ($
              {Number(listing.price).toFixed(2)}) • Seller: {sellerEmail}
            </div>
          </div>
        </div>

        {viewState === 'chat' && confirmedSpot && (
          <button
            onClick={() => setViewState('checkout')}
            style={{
              background: '#10B981',
              color: '#FFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            🔒 Proceed to Checkout
          </button>
        )}
      </div>

      {/* Main View Router */}
      {viewState === 'chat' && (
        <>
          {/* Chat Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: '#EFEAE2',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: '#4B5563',
                  fontSize: '14px',
                  margin: 'auto',
                  background: '#FFF3CD',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #FFEEBA',
                }}
              >
                <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Start a conversation with the seller.
                </p>
                <p style={{ fontSize: '13px' }}>
                  Ask questions about condition, price, or meetup availability!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe =
                  (msg.sender_email || '').trim().toLowerCase() === activeEmail;
                return (
                  <div
                    key={msg.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      alignItems: 'flex-end',
                      gap: '8px',
                      width: '100%',
                    }}
                  >
                    {!isMe && (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#002B49',
                          color: '#FFC72C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        💬
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '12px 16px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '14px',
                        backgroundColor: isMe ? '#D9FDD3' : '#FFFFFF',
                        color: '#111827',
                        border: isMe ? '1px solid #B4E8A8' : '1px solid #D1D5DB',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        lineHeight: '1.5',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#6B7280',
                          marginBottom: '4px',
                          fontWeight: '700',
                        }}
                      >
                        {msg.sender_email}
                      </div>
                      {msg.message_text}
                      <div
                        style={{
                          fontSize: '9px',
                          color: '#9CA3AF',
                          textAlign: 'right',
                          marginTop: '4px',
                        }}
                      >
                        ✓✓
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Meetup Selector Card */}
            {!confirmedSpot && (
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '20px',
                  borderRadius: '12px',
                  margin: '16px auto',
                  width: '90%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #CBD5E1',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: '#002B49',
                    marginBottom: '12px',
                    textAlign: 'center',
                    fontWeight: '800',
                  }}
                >
                  📍 Choose Secure Campus Meetup Spot
                </div>
                {['University Student Union', 'Horn Center', 'CSULB University Bookstore'].map((spot) => (
                  <label
                    key={spot}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: '#1F2937',
                      fontWeight: '600',
                      background: selectedSpot === spot ? '#F3F4F6' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="meetup"
                      value={spot}
                      checked={selectedSpot === spot}
                      onChange={() => setSelectedSpot(spot)}
                    />
                    {spot}
                  </label>
                ))}
                <button
                  onClick={handleConfirmSpot}
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    background: '#FFC72C',
                    color: '#002B49',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Meetup Location
                </button>
              </div>
            )}
          </div>

          {/* Send Error Banner */}
          {sendError && (
            <div
              role="alert"
              style={{
                background: '#FEF2F2',
                color: '#B91C1C',
                borderTop: '1px solid #FECACA',
                padding: '8px 24px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {sendError}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              background: '#F0F2F5',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderTop: '1px solid #D1D5DB',
            }}
          >
            <input
              type="text"
              placeholder="Type your message to seller..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              style={{
                flex: 1,
                border: '1px solid #9CA3AF',
                borderRadius: '8px',
                outline: 'none',
                padding: '12px 16px',
                fontSize: '14px',
                background: '#FFFFFF',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#002B49',
                color: '#FFC72C',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </>
      )}

      {/* Secure Checkout / Payment Screen */}
      {viewState === 'checkout' && (
        <div
          style={{
            flex: 1,
            padding: '32px',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0F172A', fontWeight: '800' }}>
              🔒 CSULB Secure Checkout
            </h3>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
              Complete your transaction for <strong>{listing.title}</strong>
            </p>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                padding: '16px',
                borderRadius: '10px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: '#334151', fontWeight: '600' }}>
                Total Amount
              </span>
              <span style={{ fontSize: '20px', color: '#059669', fontWeight: '900' }}>
                ${Number(listing.price).toFixed(2)}
              </span>
            </div>

            <form onSubmit={handleProcessPayment}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#334151',
                    marginBottom: '6px',
                  }}
                >
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#334151',
                      marginBottom: '6px',
                    }}
                  >
                    Expires (MM/YY)
                  </label>
                  <input
                    type="text"
                    placeholder="12/28"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#334151',
                      marginBottom: '6px',
                    }}
                  >
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    placeholder="123"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setViewState('chat')}
                  style={{
                    flex: 1,
                    background: '#E2E8F0',
                    color: '#334151',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Back to Chat
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  style={{
                    flex: 2,
                    background: '#059669',
                    color: '#FFF',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    cursor: 'pointer',
                  }}
                >
                  {processingPayment
                    ? 'Processing Securely...'
                    : `Pay $${Number(listing.price).toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success View */}
      {viewState === 'success' && (
        <div
          style={{
            flex: 1,
            padding: '40px',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#0F172A', fontWeight: '900', fontSize: '24px', margin: '0 0 8px 0' }}>
            Payment Successful!
          </h2>
          <p style={{ color: '#64748B', fontSize: '15px', maxWidth: '400px', marginBottom: '24px' }}>
            Your transaction has been processed securely. <strong>+50 Gamification points</strong>{' '}
            have been added to your profile!
          </p>
          <button
            onClick={onBack}
            style={{
              background: '#002B49',
              color: '#FFC72C',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Return to Marketplace
          </button>
        </div>
      )}
    </div>
  );
};