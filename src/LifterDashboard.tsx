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
                    {new Date(booking.slot.startsAtUtc).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
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
  const bookSlot = useMutation(api.bookings.bookSlot);
  const currentUser = useQuery(api.users.getCurrentUser);

  const handleBookSlot = async (slotId: Id<"slots">) => {
    try {
      await bookSlot({ slotId });
      toast.success("Slot booked successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to book slot");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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

        {!slots || slots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sessions available for this date.</p>
        ) : (
          <div className="grid gap-4">
            {slots.map((slot: any) => {
              const userLevel = currentUser?.experienceLevel;
              const availableForUser = userLevel === "experienced" ? slot.availableExp : slot.availableInexp;
              const canBook = slot.status === "open" && availableForUser > 0;

              return (
                <div key={slot._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-medium text-lg">
                            {formatTime(slot.startsAtUtc)} - {formatTime(slot.endsAtUtc)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Experienced:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            slot.availableExp > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {slot.availableExp} / {slot.capacityExp}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Inexperienced:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            slot.availableInexp > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {slot.availableInexp} / {slot.capacityInexp}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={() => handleBookSlot(slot._id)}
                        disabled={!canBook}
                        className={`px-4 py-2 rounded font-medium ${
                          canBook
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
        )}
      </div>
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: any }) {
  const cancelBooking = useMutation(api.bookings.cancelBooking);

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
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
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

                  {canCancel && (
                    <button
                      onClick={() => handleCancelBooking(booking._id)}
                      className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
