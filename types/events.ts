export interface EventParticipant {
  userId: string;
  firstName: string;
  lastInitial: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'Clinic' | 'Tournament' | 'Private Event' | 'Social Event';
  start: string;
  end: string;
  description?: string;
  location: string;
  isSpotlight?: boolean;
  image_path?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  price?: number;
  isRegistered?: boolean;
  participants?: EventParticipant[];
}

export interface Coach {
  id: string;
  first_name: string;
  last_name: string;
  coaching_rate: number;
  bio?: string;
  description?: string;
  specialties?: string[];
  dupr_rating?: number;
  image_path?: string;
}

export interface Registration {
  id: string;
  type: 'lesson' | 'reservation' | 'event';
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  court_name?: string;
  coach_name?: string;
  deleted_at?: string | null;
}