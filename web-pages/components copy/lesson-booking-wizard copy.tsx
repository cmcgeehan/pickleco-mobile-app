'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ChevronLeft, ChevronRight, Clock, MapPin, User, DollarSign, CalendarDays, GraduationCap, Users, Info, Star } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/contexts/auth';
import { useLocation } from '@/contexts/location-context';
import { useSupabase } from '@/hooks/use-supabase';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Image from 'next/image';
import { Coach } from '@/types/coach';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Court {
  id: string;
  name: string;
  location: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  coach_id?: string;
  available_coaches?: Array<{
    id: string;
    name: string;
    rate: number;
  }>;
}

interface BookingData {
  coach_id?: string;
  date?: Date;
  time?: string;
  court_id?: string;
  duration: number;
}

interface LessonBookingWizardProps {
  initialCoachId?: string;
  onClose: () => void;
}

interface Step {
  id: number;
  title: string;
  description: string;
}

export function LessonBookingWizard({ initialCoachId, onClose }: LessonBookingWizardProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const { user } = useAuthStore();
  const { selectedLocation } = useLocation();
  const { supabase, isLoading: supabaseLoading } = useSupabase();

  const STEPS: Step[] = [
    { id: 1, title: t('lessons', 'chooseCoach'), description: t('lessons', 'chooseCoachDescription') },
    { id: 2, title: t('lessons', 'dateAndTime'), description: t('lessons', 'dateAndTimeDescription') },
    { id: 3, title: t('lessons', 'courtSelection'), description: t('lessons', 'courtSelectionDescription') },
    { id: 4, title: t('lessons', 'confirmation'), description: t('lessons', 'confirmationDescription') },
  ];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [bookingData, setBookingData] = useState<BookingData>({
    coach_id: initialCoachId,
    duration: 60, // Default 60 minutes
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const loadCoaches = useCallback(async () => {
    if (loading || !supabase) return;
    
    try {
      setLoadingCoaches(true);
      const { data: coachesData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, coaching_rate, bio, specialties, image_path, dupr_rating')
        .eq('is_coach', true)
        .is('deleted_at', null);

      if (error) throw error;

      setCoaches(coachesData || []);
      
      // If initialCoachId is provided, set the selected coach
      if (initialCoachId && coachesData) {
        const coach = coachesData.find((c: Coach) => c.id === initialCoachId);
        if (coach) {
          setSelectedCoach(coach);
          setBookingData(prev => ({ ...prev, coach_id: coach.id }));
        }
      }
    } catch (error) {
      console.error('Error loading coaches:', error);
      toast.error(t('lessons', 'failedToLoadCoaches'), {
        description: t('lessons', 'failedToLoadCoachesDescription')
      });
    } finally {
      setLoadingCoaches(false);
    }
  }, [loading, initialCoachId, t, supabase]);

  // Load coaches on mount and when location changes
  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const loadTimeSlots = useCallback(async () => {
    if (!bookingData.coach_id || !bookingData.date || !supabase) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/lessons/availability?date=${bookingData.date.toISOString()}&coach_id=${bookingData.coach_id}&duration=${bookingData.duration}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load time slots');
      }
      
      const data = await response.json();
      setTimeSlots(data.time_slots || []);
    } catch (error) {
      console.error('Error loading time slots:', error);
      toast.error(t('lessons', 'failedToLoadTimeSlots'));
    } finally {
      setLoading(false);
    }
  }, [bookingData.coach_id, bookingData.date, bookingData.duration, t, supabase]);

  useEffect(() => {
    if (bookingData.coach_id && bookingData.date) {
      loadTimeSlots();
    }
  }, [bookingData.coach_id, bookingData.date, loadTimeSlots]);

  const loadCourts = useCallback(async () => {
    if (!bookingData.date || !bookingData.time || !supabase) return;

    setLoading(true);
    try {
      const startTime = new Date(bookingData.date);
      const [hours, minutes] = bookingData.time.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + bookingData.duration);

      const { data, error } = await supabase
        .rpc('get_available_courts', {
          p_start_time: startTime.toISOString(),
          p_end_time: endTime.toISOString(),
          p_location_id: selectedLocation?.id
        });

      if (error) {
        throw error;
      }

      setCourts(data || []);
    } catch (error) {
      console.error('Error loading courts:', error);
      toast.error(t('lessons', 'failedToLoadCourts'));
    } finally {
      setLoading(false);
    }
  }, [bookingData.date, bookingData.time, bookingData.duration, supabase, selectedLocation?.id, t]);

  useEffect(() => {
    if (bookingData.date && bookingData.time) {
      loadCourts();
    }
  }, [bookingData.date, bookingData.time, loadCourts]);

  const calculatePrice = useCallback(async () => {
    if (!bookingData.coach_id || !supabase || !coaches.length) return;

    try {
      const coach = coaches.find(c => c.id === bookingData.coach_id);
      if (!coach) return;

      const { data: price, error } = await supabase
        .rpc('calculate_lesson_price', {
          p_user_id: user?.id,
          p_coach_rate: coach.coaching_rate,
          p_duration_hours: bookingData.duration
        });

      if (error) {
        throw error;
      }

      if (price !== null) {
        setCalculatedPrice(price);
      }
    } catch (error) {
      console.error('Error calculating price:', error);
      toast.error(t('lessons', 'failedToCalculatePrice'));
    }
  }, [bookingData.coach_id, bookingData.duration, coaches, supabase, user?.id, t]);

  useEffect(() => {
    if (bookingData.coach_id && coaches.length > 0) {
      calculatePrice();
    }
  }, [bookingData.coach_id, bookingData.duration, coaches, calculatePrice]);

  const handleCoachSelect = (coach: Coach) => {
    setSelectedCoach(coach);
    setBookingData(prev => ({ ...prev, coach_id: coach.id }));
    setStep(2);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setBookingData(prev => ({ ...prev, date }));
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimeSlot(timeSlots.find(slot => slot.time === time) || null);
    setBookingData(prev => ({ ...prev, time }));
    setStep(3);
  };

  const handleCourtSelect = (courtId: string) => {
    setBookingData(prev => ({ ...prev, court_id: courtId }));
    setStep(4);
  };

  const handleBookLesson = async () => {
    if (!user) {
      toast.error(t('auth', 'signInRequired'), {
        description: t('lessons', 'signInToBook')
      });
      router.push('/login' as const);
      return;
    }

    if (!bookingData.coach_id || !bookingData.date || !bookingData.time || !bookingData.court_id || !supabase) {
      toast.error(t('lessons', 'incompleteBookingDetails'), {
        description: t('lessons', 'incompleteBookingDetailsDescription')
      });
      return;
    }

    try {
      setLoading(true);
      const startTime = new Date(bookingData.date);
      const [hours, minutes] = bookingData.time.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + bookingData.duration);

      const { data, error } = await supabase
        .rpc('book_lesson', {
          p_user_id: user.id,
          p_coach_id: bookingData.coach_id,
          p_court_id: bookingData.court_id,
          p_start_time: startTime.toISOString(),
          p_end_time: endTime.toISOString(),
          p_duration_hours: bookingData.duration
        });

      if (error) {
        throw error;
      }

      toast.success(t('lessons', 'lessonBookedSuccessfully'));

      if (onClose) {
        onClose();
      } else {
        router.push('/account');
      }
    } catch (error) {
      console.error('Error booking lesson:', error);
      toast.error(t('lessons', 'failedToBookLesson'), {
        description: error instanceof Error ? error.message : t('lessons', 'failedToBookLessonDescription')
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (loadingCoaches && step === 1) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {coaches.map((coach) => (
                <div key={coach.id} className="relative perspective-1000">
                  <div className={cn(
                    "relative w-full transition-transform duration-500 transform-style-preserve-3d",
                    selectedCoach?.id === coach.id ? "rotate-y-180" : ""
                  )}>
                    {/* Front of card */}
                    <Card className="w-full backface-hidden">
                      <div className="aspect-[4/5] relative overflow-hidden rounded-t-lg">
                        {coach.image_path ? (
                          <Image
                            src={coach.image_path}
                            alt={`${coach.first_name} ${coach.last_name}`}
                            width={160}
                            height={200}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-xl font-bold text-muted-foreground">
                              {coach.first_name[0]}{coach.last_name[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 space-y-2">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm truncate">
                            {coach.first_name} {coach.last_name}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>${coach.coaching_rate}/hr</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1 text-xs py-1 h-7"
                            onClick={() => {
                              setSelectedCoach(coach);
                              setBookingData(prev => ({ ...prev, coach_id: coach.id }));
                            }}
                          >
                            <Info className="h-3 w-3 mr-1" />
                            Info
                          </Button>
                          <Button 
                            className="flex-1 text-xs py-1 h-7"
                            size="sm"
                            onClick={() => {
                              setSelectedCoach(coach);
                              setBookingData(prev => ({ ...prev, coach_id: coach.id }));
                              handleTimeSelect(timeSlots[0].time);
                            }}
                          >
                            {t('lessons', 'bookNow')}
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Back of card */}
                    <Card className="w-full absolute top-0 rotate-y-180 backface-hidden">
                      <div className="p-2 h-full flex flex-col">
                        <h3 className="font-semibold text-sm mb-1">
                          {coach.first_name} {coach.last_name}
                        </h3>
                        {coach.bio ? (
                          <p className="text-xs text-muted-foreground flex-grow mb-2 line-clamp-[10]">
                            {coach.bio}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground flex-grow mb-2 italic">
                            No description available
                          </p>
                        )}
                        {coach.specialties && coach.specialties.length > 0 && (
                          <div className="mb-2">
                            <h4 className="font-medium text-xs mb-1">{t('lessons', 'coachSpecialties')}:</h4>
                            <div className="flex flex-wrap gap-1">
                              {coach.specialties.map((specialty, index) => (
                                <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-1 mt-auto">
                          <Button 
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs py-1 h-7"
                            onClick={() => {
                              setSelectedCoach(null);
                              setBookingData(prev => ({ ...prev, coach_id: undefined }));
                            }}
                          >
                            <Info className="h-3 w-3 mr-1" />
                            Back
                          </Button>
                          <Button 
                            className="flex-1 text-xs py-1 h-7"
                            size="sm"
                            onClick={() => {
                              setSelectedCoach(coach);
                              setBookingData(prev => ({ ...prev, coach_id: coach.id }));
                              handleTimeSelect(timeSlots[0].time);
                            }}
                          >
                            {t('lessons', 'bookNow')}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ))}
            </div>

            {/* Any Available Coach Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
                onClick={() => {
                  setSelectedCoach(null);
                  setBookingData(prev => ({ ...prev, coach_id: undefined }));
                  handleTimeSelect(timeSlots[0].time);
                }}
              >
                <Users className="h-5 w-5" />
                {t('lessons', 'lessonWizardAnyCoach')}
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label>{t('lessons', 'selectDate')}</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  handleDateSelect(date);
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                className="rounded-md border"
              />
            </div>
            {selectedDate && (
              <div>
                <Label>{t('lessons', 'selectTime')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTimeSlot?.time === slot.time ? 'default' : 'outline'}
                      disabled={!slot.available}
                      onClick={() => {
                        handleTimeSelect(slot.time);
                      }}
                    >
                      {slot.time}
                      {slot.available_coaches && slot.available_coaches.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({slot.available_coaches.length} {t('lessons', 'availableCoaches')})
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courts.map((court) => (
                <Card
                  key={court.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-accent',
                    bookingData.court_id === court.id && 'border-primary'
                  )}
                  onClick={() => handleCourtSelect(court.id)}
                >
                  <CardHeader>
                    <CardTitle>{court.name}</CardTitle>
                    <CardDescription>
                      <MapPin className="h-4 w-4 inline mr-1" />
                      {court.location}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {selectedCoach && (
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  {selectedCoach.image_path ? (
                    <Image
                      src={selectedCoach.image_path}
                      alt={`${selectedCoach.first_name} ${selectedCoach.last_name}`}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground">
                        {selectedCoach.first_name[0]}{selectedCoach.last_name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{`${selectedCoach.first_name} ${selectedCoach.last_name}`}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCoach.specialties?.join(', ')}</p>
                </div>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('lessons', 'date')}</span>
                <span>{selectedDate?.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('lessons', 'time')}</span>
                <span>{selectedTimeSlot?.time}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('lessons', 'duration')}</span>
                <span>{t('common', 'hours', { count: bookingData.duration })}</span>
              </div>
              {calculatedPrice !== null && (
                <div className="flex justify-between font-medium">
                  <span>{t('lessons', 'totalPrice')}</span>
                  <span>{t('common', 'price', { price: calculatedPrice })}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!bookingData.coach_id;
      case 2:
        return !!selectedDate && !!selectedTimeSlot;
      case 3:
        return !!bookingData.court_id;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Tracker */}
      <div className="relative pt-4 pb-8">
        {/* Step Circles */}
        <div className="relative flex justify-between">
          {/* Progress Line - positioned relative to the circles container */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {STEPS.map((stepItem) => (
            <div key={stepItem.id} className="flex flex-col items-center">
              <div 
                className={cn(
                  "relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors border-2 bg-background",
                  step > stepItem.id 
                    ? "border-primary text-primary"
                    : step === stepItem.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted text-muted-foreground"
                )}
              >
                {stepItem.id}
              </div>
              <span className="mt-2 text-xs font-medium text-center max-w-[100px]">{stepItem.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{STEPS[step - 1].title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1].description}</p>
        </div>
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common', 'previous')}
        </Button>
        <Button
          onClick={() => setStep(step + 1)}
          disabled={!canProceed()}
          className="flex items-center gap-2"
        >
          {step === STEPS.length ? t('lessons', 'bookLesson') : t('common', 'next')}
          {step !== STEPS.length && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
} 