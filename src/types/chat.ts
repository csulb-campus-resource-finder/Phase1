export interface Message {
  id: string;
  listingId: string;
  senderId: string;
  receiverId?: string;
  content: string;
  createdAt: string | Date;
}

export interface JoinRoomPayload {
  listingId: string | number;
  userId: string;
}

export interface SendMessagePayload {
  listingId: string | number;
  senderId: string;
  receiverId?: string;
  content: string;
}