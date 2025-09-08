import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

function MobileNavLifter({
  activeTab,
  setActiveTab,
}: {
  activeTab: "dashboard" | "calendar" | "bookings";
  setActiveTab: (tab: "dashboard" | "calendar" | "bookings") => void;
}) {
  const [open, setOpen] = useState(false);
  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "calendar", label: "Book Sessions" },
    { key: "bookings", label: "My Bookings" },
  ] as const;
  return (
    <div className="relative">
      <button
        aria-label="Toggle navigation menu"
        aria-controls="lifter-nav"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md border border-gray-200 hover:bg-gray-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div id="lifter-nav" className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow z-20">
          <nav className="py-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${
                  activeTab === tab.key
                    ? "bg-brand-cream text-brand-black"
                    : "text-brand-gray hover:bg-gray-50 hover:text-brand-grayDark"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

export function LifterDashboard() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "calendar" | "bookings"
  >("dashboard");

  const currentUser = useQuery(api.users.getCurrentUser);
  const currentQuota = useQuery(api.quota.getCurrentQuota);
  const userBookings = useQuery(api.bookings.getUserBookings);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
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
        <h1 className="text-3xl font-bold text-brand-black">
          Welcome, {currentUser?.name}!
        </h1>
        <p className="text-brand-gray mt-1">
          Lifter
        </p>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border px-2">
        {/* Mobile burger */}
        <div className="flex items-center justify-between md:hidden p-2">
          <span className="text-sm font-medium text-brand-black">Navigate</span>
          <MobileNavLifter activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Desktop nav */}
        <NavigationMenu className="justify-start hidden md:flex">
          <NavigationMenuList>
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "calendar", label: "Book Sessions" },
              { key: "bookings", label: "My Bookings" },
            ].map((tab) => (
              <NavigationMenuItem key={tab.key}>
                <NavigationMenuLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(tab.key as any);
                  }}
                  className={`px-3 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? "border-brand-gold text-brand-black"
                      : "border-transparent text-brand-gray hover:text-brand-grayDark"
                  }`}
                >
                  {tab.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Content */}
      {activeTab === "dashboard" && (
        <DashboardTab quota={currentQuota} bookings={userBookings} />
      )}
      {activeTab === "calendar" && (
        <CalendarTab
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          slots={slots}
          bookings={userBookings}
        />
      )}
      {activeTab === "bookings" && <BookingsTab bookings={userBookings} />}
    </div>
  );
}

function DashboardTab({ quota, bookings }: { quota: any; bookings: any }) {
  const upcomingBookings =
    bookings
      ?.filter(
        (b: any) =>
          b.status === "booked" && b.slot && b.slot.startsAtUtc > Date.now(),
      )
      .slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Quota Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Quota</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-brand-gray mb-1">
              <span>Progress</span>
              <span>
                {quota?.used || 0} / {quota?.quota || 0}
              </span>
            </div>
            <div className="w-full bg-brand-cream rounded-full h-2">
              <div
                className="bg-brand-gold h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${quota ? Math.min((quota.used / quota.quota) * 100, 100) : 0}%`,
                }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {quota?.remaining || 0}
            </div>
            <div className="text-sm text-brand-gray">remaining</div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-gray-500">
            No upcoming sessions. Book a slot to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking: any) => (
              <div
                key={booking._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {new Date(booking.slot.startsAtUtc).toLocaleDateString()} at{" "}
                    {new Date(booking.slot.startsAtUtc).toLocaleTimeString(
                      undefined,
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      },
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">{booking.level}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarTab({ selectedDate, setSelectedDate, slots, bookings }: any) {
  const bookSlot = useMutation(api.bookings.bookSlot);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const currentUser = useQuery(api.users.getCurrentUser);
  const cutoffPolicy = useQuery(api.policies.getPolicy, { key: "cancellationCutoffHours" });
  const cutoffHours = cutoffPolicy ? parseInt(cutoffPolicy.value) || 24 : 24;

  const handleBookSlot = async (slotId: Id<"slots">) => {
    try {
      await bookSlot({ slotId });
      toast.success("Slot booked successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to book slot",
      );
    }
  };

  const handleCancelSlot = async (bookingId: Id<"bookings">) => {
    try {
      await cancelBooking({ bookingId });
      toast.success("Booking canceled successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel booking",
      );
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const renderSlotList = (list: any[], dateStr: string) => {
    const isToday =
      new Date(dateStr).toDateString() === new Date().toDateString();
    const now = Date.now();
    const filtered = (list || []).filter(
      (slot: any) => !isToday || slot.startsAtUtc > now,
    );

    if (!filtered || filtered.length === 0) {
      return <p className="text-gray-500 text-center py-4">No sessions</p>;
    }

    return (
      <div className="grid gap-3">
        {filtered.map((slot: any) => {
          const userLevel = currentUser?.experienceLevel;
          const availableForUser =
            userLevel === "experienced"
              ? slot.availableExp
              : slot.availableInexp;
          const canBook = slot.status === "open" && availableForUser > 0;

          const bookedForSlot = (bookings || []).find(
            (b: any) => b.slotId === slot._id && b.status === "booked",
          );
          const isBooked = Boolean(bookedForSlot);
          const msUntilStart = slot.startsAtUtc - Date.now();
          const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
          const canCancelHere = isBooked && hoursUntilStart >= cutoffHours;

          const cardClasses = `p-3 border rounded-lg ${
            isBooked ? "bg-brand-cream border-brand-gold" : ""
          }`;

          return (
            <Card key={slot._id} className={cardClasses}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <span>
                      {formatTime(slot.startsAtUtc)} - {formatTime(slot.endsAtUtc)}
                    </span>
                    {isBooked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-gold text-brand-black">
                        Booked
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-col space-y-1 text-xs">
                    <span className="text-brand-gold">
                      Spots available: {slot.availableExp + slot.availableInexp}/{slot.capacityTotal}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  {!isBooked && (
                    <button
                      onClick={() => void handleBookSlot(slot._id)}
                      disabled={!canBook}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        canBook
                          ? "bg-brand-black text-white hover:bg-brand-grayDark"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      aria-label={canBook ? "Book slot" : "Slot full"}
                    >
                      {canBook ? "Book" : "Full"}
                    </button>
                  )}

                  {isBooked && canCancelHere && (
                    <button
                      onClick={() => void handleCancelSlot(bookedForSlot._id)}
                      className="px-3 py-1 rounded text-sm font-medium bg-brand-red text-white hover:opacity-90"
                      aria-label="Cancel booking"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">Available Sessions</h2>
          <Calendar
            className="w-full sm:w-auto"
            mode="single"
            selected={new Date(selectedDate)}
            onSelect={(d) =>
              d && setSelectedDate(d.toISOString().split("T")[0])
            }
          />
        </div>

        <Carousel
          onPrev={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}
          onNext={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }}
        >
          <CarouselContent className="w-full">
            <CarouselItem className="w-[90%] px-4 mx-auto">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="px-3 py-2 text-sm font-semibold text-brand-black text-center rounded-t-lg">
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    weekday: "long",
                  })}
                </div>
                <div className="px-3 py-2 text-sm text-brand-grayDark text-center">
                  {new Date(selectedDate).toLocaleDateString()}
                </div>
                <div className="p-3 border-t">
                  {renderSlotList(slots || [], selectedDate)}
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: any }) {
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  // Fetch cancellation cutoff policy to compute UI availability
  const cutoffPolicy = useQuery(api.policies.getPolicy, {
    key: "cancellationCutoffHours",
  });
  const cutoffHours = cutoffPolicy ? parseInt(cutoffPolicy.value) || 24 : 24;

  const handleCancelBooking = async (bookingId: Id<"bookings">) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      await cancelBooking({ bookingId });
      toast.success("Booking canceled successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel booking",
      );
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
            const canCancel =
              booking.status === "booked" &&
              booking.slot &&
              booking.slot.startsAtUtc > Date.now();

            return (
              <div key={booking._id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">
                          {booking.slot
                            ? formatDateTime(booking.slot.startsAtUtc)
                            : "Slot deleted"}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(booking.status)}`}>
                        {booking.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      Booked: {formatDateTime(booking.createdAt)}
                    </div>
                  </div>

                  {canCancel &&
                    (() => {
                      const msUntilStart =
                        booking.slot.startsAtUtc - Date.now();
                      const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
                      const isUnderCutoff = hoursUntilStart < cutoffHours;

                      return (
                        <div className="ml-4 flex flex-col items-end">
                          <button
                            onClick={() =>
                              void handleCancelBooking(booking._id)
                            }
                            disabled={isUnderCutoff}
                            title={
                              isUnderCutoff
                                ? `Cancellation unavailable within ${cutoffHours} hours of start`
                                : "Cancel booking"
                            }
                            className={`px-3 py-1 text-sm rounded ${
                              isUnderCutoff
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {isUnderCutoff ? "Unavailable" : "Cancel"}
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
