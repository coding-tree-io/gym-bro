import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function LifterDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "bookings">("dashboard");
  
  const currentUser = useQuery(api.users.getCurrentUser);
  const currentQuota = useQuery(api.quota.getCurrentQuota);
  const userBookings = useQuery(api.bookings.getUserBookings);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const selectedDateTime = new Date(selectedDate).getTime();
  const nextDay = selectedDateTime + 24 * 60 * 60 * 1000;
  const slots = useQuery(api.slots.getSlots, {
    from: selectedDateTime,
    to: nextDay,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {currentUser?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          {currentUser?.experienceLevel} lifter
        </p>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <nav className="flex space-x-8 px-6">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "calendar", label: "Book Sessions" },
            { key: "bookings", label: "My Bookings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === "dashboard" && <DashboardTab quota={currentQuota} bookings={userBookings} />}
      {activeTab === "calendar" && <CalendarTab selectedDate={selectedDate} setSelectedDate={setSelectedDate} slots={slots} />}
      {activeTab === "bookings" && <BookingsTab bookings={userBookings} />}
    </div>
  );
}

function DashboardTab({ quota, bookings }: { quota: any; bookings: any }) {
  const upcomingBookings = bookings?.filter((b: any) => 
    b.status === "booked" && b.slot && b.slot.startsAtUtc > Date.now()
  ).slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Quota Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Quota</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{quota?.used || 0} / {quota?.quota || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${quota ? Math.min((quota.used / quota.quota) * 100, 100) : 0}%` 
                }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {quota?.remaining || 0}
            </div>
            <div className="text-sm text-gray-500">remaining</div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-gray-500">No upcoming sessions. Book a slot to get started!</p>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking: any) => (
              <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">
                    {new Date(booking.slot.startsAtUtc).toLocaleDateString()} at{' '}
                    {new Date(booking.slot.startsAtUtc).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {booking.level}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarTab({ selectedDate, setSelectedDate, slots }: any) {
  const [slidePct, setSlidePct] = useState(0);
  const bookSlot = useMutation(api.bookings.bookSlot);
  const currentUser = useQuery(api.users.getCurrentUser);

  // Preload previous and next day slots
  const selectedDateTime = new Date(selectedDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const prevDayStart = selectedDateTime - dayMs;
  const prevDayEnd = selectedDateTime;
  const nextDayStart = selectedDateTime + dayMs;
  const nextDayEnd = selectedDateTime + 2 * dayMs;

  const prevSlots = useQuery(api.slots.getSlots, { from: prevDayStart, to: prevDayEnd });
  const nextSlots = useQuery(api.slots.getSlots, { from: nextDayStart, to: nextDayEnd });

  const handleBookSlot = async (slotId: Id<"slots">) => {
    try {
      await bookSlot({ slotId });
      toast.success("Slot booked successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to book slot");
    }
  };

  // Swipe handling
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 50; // pixels

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
      const animateTo = (dir: 'next' | 'prev') => {
        setSlidePct(dir === 'next' ? -20 : 20);
        setTimeout(() => {
          const d = new Date(selectedDate);
          d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
          setSelectedDate(d.toISOString().split('T')[0]);
          setSlidePct(0);
        }, 180);
      };
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) > swipeThreshold) {
      if (delta < 0) {
        // swipe left -> next day
        animateTo('next');
      } else {
        // swipe right -> previous day
        animateTo('prev');
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const renderSlotList = (list: any[], dateStr: string) => {
    const isToday = new Date(dateStr).toDateString() === new Date().toDateString();
    const now = Date.now();
    const filtered = (list || []).filter((slot: any) => !isToday || slot.startsAtUtc > now);

    if (!filtered || filtered.length === 0) {
      return <p className="text-gray-500 text-center py-4">No sessions</p>;
    }

    return (
      <div className="grid gap-3">
        {filtered.map((slot: any) => {
          const userLevel = currentUser?.experienceLevel;
          const availableForUser = userLevel === "experienced" ? slot.availableExp : slot.availableInexp;
          const canBook = slot.status === "open" && availableForUser > 0;

          return (
            <div key={slot._id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {formatTime(slot.startsAtUtc)} - {formatTime(slot.endsAtUtc)}
                  </div>
                  <div className="mt-2 flex flex-col space-y-1 text-xs">
                    <span className={`${slot.availableExp > 0 ? 'text-green-700' : 'text-red-700'}`}>Exp: {slot.availableExp}/{slot.capacityExp}</span>
                    <span className={`${slot.availableInexp > 0 ? 'text-green-700' : 'text-red-700'}`}>Inexp: {slot.availableInexp}/{slot.capacityInexp}</span>
                    <span className="text-blue-700">Total: {(slot.availableExp + slot.availableInexp)}/{slot.capacityTotal}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <button
                    onClick={() => void handleBookSlot(slot._id)}
                    disabled={!canBook}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      canBook ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canBook ? 'Book' : 'Full'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Dates for panels
  const prevDateStr = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const nextDateStr = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Available Sessions</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="relative overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="flex items-start transition-transform duration-200 ease-out" style={{ width: '140%', marginLeft: '-20%', transform: `translateX(${slidePct}%)` }}>
            <div className="w-[20%] shrink-0 opacity-60 hover:opacity-80 transition cursor-pointer" onClick={() => { setSlidePct(20); setTimeout(() => { setSelectedDate(prevDateStr); setSlidePct(0); }, 180); }}>
              <div className="bg-white border rounded-lg shadow-sm pointer-events-none">
                <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-center rounded-t-lg truncate">
                  {new Date(prevDateStr).toLocaleDateString(undefined, { weekday: 'long' })}
                </div>
                <div className="px-3 py-2 text-xs text-gray-600 text-center truncate">
                  {new Date(prevDateStr).toLocaleDateString()}
                </div>
                <div className="p-3 border-t hidden sm:block">
                  {renderSlotList(prevSlots || [], prevDateStr)}
                </div>
              </div>
            </div>
            <div className="w-[60%] shrink-0 px-4">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="px-3 py-2 text-sm font-semibold text-gray-900 text-center rounded-t-lg">
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}
                </div>
                <div className="px-3 py-2 text-sm text-gray-700 text-center">
                  {new Date(selectedDate).toLocaleDateString()}
                </div>
                <div className="p-3 border-t">
                  {renderSlotList(slots || [], selectedDate)}
                </div>
              </div>
            </div>
            <div className="w-[20%] shrink-0 opacity-60 hover:opacity-80 transition cursor-pointer" onClick={() => { setSlidePct(-20); setTimeout(() => { setSelectedDate(nextDateStr); setSlidePct(0); }, 180); }}>
              <div className="bg-white border rounded-lg shadow-sm pointer-events-none">
                <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-center rounded-t-lg truncate">
                  {new Date(nextDateStr).toLocaleDateString(undefined, { weekday: 'long' })}
                </div>
                <div className="px-3 py-2 text-xs text-gray-600 text-center truncate">
                  {new Date(nextDateStr).toLocaleDateString()}
                </div>
                <div className="p-3 border-t hidden sm:block">
                  {renderSlotList(nextSlots || [], nextDateStr)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: any }) {
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  // Fetch cancellation cutoff policy to compute UI availability
  const cutoffPolicy = useQuery(api.policies.getPolicy, { key: "cancellationCutoffHours" });
  const cutoffHours = cutoffPolicy ? parseInt(cutoffPolicy.value) || 24 : 24;

  const handleCancelBooking = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      await cancelBooking({ bookingId });
      toast.success("Booking canceled successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "booked":
        return "bg-green-100 text-green-800";
      case "canceled_by_lifter":
      case "canceled_by_admin":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-orange-100 text-orange-800";
      case "attended":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
      
      {!bookings || bookings.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No bookings found.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const canCancel = booking.status === "booked" && 
              booking.slot && 
              booking.slot.startsAtUtc > Date.now();

            return (
              <div key={booking._id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">
                          {booking.slot ? formatDateTime(booking.slot.startsAtUtc) : 'Slot deleted'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-500">
                      Booked: {formatDateTime(booking.createdAt)} • Level: {booking.level}
                    </div>
                  </div>

                  {canCancel && (() => {
                    const msUntilStart = booking.slot.startsAtUtc - Date.now();
                    const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
                    const isUnderCutoff = hoursUntilStart < cutoffHours;

                    return (
                      <div className="ml-4 flex flex-col items-end">
                        <button
                          onClick={() => void handleCancelBooking(booking._id)}
                          disabled={isUnderCutoff}
                          title={isUnderCutoff ? `Cancellation unavailable within ${cutoffHours} hours of start` : 'Cancel booking'}
                          className={`px-3 py-1 text-sm rounded ${
                            isUnderCutoff ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {isUnderCutoff ? 'Unavailable' : 'Cancel'}
                        </button>
                        {isUnderCutoff && (
                          <span className="mt-1 text-xs text-gray-500">
                            Unavailable within {cutoffHours}h of start
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
