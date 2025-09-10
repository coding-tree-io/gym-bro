import { useState } from "react";
import { gymDayBoundsUtc, localDateTimeToUtc } from "@/utils/time";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

function NavMenuAdmin({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "slots", label: "Manage Slots" },
    { key: "lifters", label: "Manage Lifters" },
    { key: "policies", label: "Policies" },
    { key: "reports", label: "Reports" },
  ] as const;
  return (
    <div className="relative">
      {/* Mobile burger */}
      <div className="flex items-center justify-between md:hidden p-2">
        <span className="text-sm font-medium text-brand-black">Navigate</span>
        <button
          aria-label="Toggle navigation menu"
          aria-controls="admin-nav"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-md border border-gray-200 hover:bg-gray-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Desktop nav */}
      <NavigationMenu className="justify-start hidden md:flex">
        <NavigationMenuList>
          {tabs.map((tab) => (
            <NavigationMenuItem key={tab.key}>
              <NavigationMenuLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab.key);
                }}
                className={
                  "px-3 py-4 border-b-2 font-medium text-sm " +
                  (activeTab === tab.key
                    ? "border-brand-gold text-brand-black"
                    : "border-transparent text-brand-gray hover:text-brand-grayDark")
                }
              >
                {tab.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div id="admin-nav" className="md:hidden border-t">
          <nav className="py-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm ${
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

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "slots" | "lifters" | "policies" | "reports"
  >("overview");

  const dashboardStats = useQuery(api.admin.getDashboardStats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h1 className="text-3xl font-bold text-brand-black">Admin Dashboard</h1>
        <p className="text-brand-gray mt-1">Manage your gym operations</p>
      </Card>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border px-2">
        <NavMenuAdmin activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Content */}
      {activeTab === "overview" && <OverviewTab stats={dashboardStats} />}
      {activeTab === "slots" && <SlotsTab />}
      {activeTab === "lifters" && <LiftersTab />}
      {activeTab === "policies" && <PoliciesTab />}
      {activeTab === "reports" && <ReportsTab />}
    </div>
  );
}

function OverviewTab({ stats }: { stats: any }) {
  const unbookedLifters = useQuery(api.quota.getUnbookedLifters);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-brand-black">
            {stats?.totalLifters || 0}
          </div>
          <div className="text-sm text-gray-500">Total Lifters</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-brand-black">
            {stats?.activeSlots || 0}
          </div>
          <div className="text-sm text-gray-500">Active Slots</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-brand-black">
            {stats?.totalBookings || 0}
          </div>
          <div className="text-sm text-gray-500">Weekly Bookings</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-brand-black">
            {stats?.complianceRate || 0}%
          </div>
          <div className="text-sm text-gray-500">Quota Compliance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-brand-black">
            {stats?.utilizationRate || 0}%
          </div>
          <div className="text-sm text-gray-500">Utilization Rate</div>
        </div>
      </div>

      {/* Unbooked Lifters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">
          Lifters Below Quota This Week
        </h2>
        {!unbookedLifters || unbookedLifters.length === 0 ? (
          <p className="text-gray-500">All lifters are meeting their quota!</p>
        ) : (
          <div className="space-y-3">
            {unbookedLifters.slice(0, 10).map((lifter: any) => (
              <div
                key={lifter._id}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
              >
                <div>
                  <div className="font-medium">{lifter.name}</div>
                  <div className="text-sm text-brand-gray">{lifter.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {lifter.quotaUsed} / {lifter.quotaTotal}
                  </div>
                  <div className="text-xs text-gray-500">
                    {lifter.quotaRemaining} remaining
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotsTab() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [openCreate, setOpenCreate] = useState(false);

  const tzPolicy = useQuery(api.policies.getPolicy, { key: "gymTimezone" });
  const tz = tzPolicy?.value || "America/New_York";

  const bounds = tz ? gymDayBoundsUtc(selectedDate, tz) : null;
  const slots = useQuery(api.slots.getSlots, bounds ? {
    from: bounds.from,
    to: bounds.to,
  } : undefined);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-center mb-6">
          <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
            <Calendar
              className="w-full sm:w-auto"
              mode="single"
              selected={new Date(selectedDate)}
              onSelect={(d) =>
                d && setSelectedDate(d.toISOString().split("T")[0])
              }
            />
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">Create Slot</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Slot</DialogTitle>
                  <DialogDescription>
                    Choose a time range and capacities for{" "}
                    {new Date(selectedDate).toLocaleDateString()}.
                  </DialogDescription>
                </DialogHeader>
                <CreateSlotForm
                  selectedDate={selectedDate}
                  onClose={() => setOpenCreate(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {(() => {
          const renderAdminSlotList = (list: any[]) => {
            if (!list || list.length === 0)
              return (
                <div className="text-center py-4 space-y-3">
                  <p className="text-gray-500">No slots</p>
                  <AutoFillDayButton selectedDateTime={bounds ? bounds.from : new Date(selectedDate).getTime()} />
                </div>
              );
            return (
              <div className="space-y-3">
                {list.map((slot: any) => (
                  <SlotCard key={slot._id} slot={slot} />
                ))}
              </div>
            );
          };

          return (
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
                      {renderAdminSlotList(slots || [])}
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          );
        })()}
      </div>
    </div>
  );
}

function AutoFillDayButton({ selectedDateTime }: { selectedDateTime: number }) {
  const fillDay = useMutation(api.slots.fillDayWithDefaultWorkingHours);
  const [loading, setLoading] = useState(false);

  const handleFill = async () => {
    setLoading(true);
    try {
      const res = await fillDay({ dayStartUtc: selectedDateTime });
      const created = (res as any)?.created ?? 0;
      toast.success(
        `Created ${created} slot${created === 1 ? "" : "s"} from default working hours`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fill day",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={() => void handleFill()} disabled={loading}>
      {loading ? "Filling..." : "Fill day with default working hours"}
    </Button>
  );
}

function CreateSlotForm({
  selectedDate,
  onClose,
}: {
  selectedDate: string;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "10:00",
    capacityTotal: 4,
    capacityExp: 3,
    capacityInexp: 2,
  });

  const createSlot = useMutation(api.slots.createSlot);
  const tzPolicy = useQuery(api.policies.getPolicy, { key: "gymTimezone" });
  const tz = tzPolicy?.value || "America/New_York";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const startDateTime = localDateTimeToUtc(selectedDate, formData.startTime, tz);
      const endDateTime = localDateTimeToUtc(selectedDate, formData.endTime, tz);

      await createSlot({
        startsAtUtc: startDateTime,
        endsAtUtc: endDateTime,
        capacityTotal: formData.capacityTotal,
        capacityExp: formData.capacityExp,
        capacityInexp: formData.capacityInexp,
      });

      toast.success("Slot created successfully!");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create slot",
      );
    }
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-secondary">
      <h3 className="text-lg font-medium mb-4">Create New Slot</h3>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="grid grid-cols-2 gap-4"
      >
        <div>
          <Label htmlFor="start-time">Start Time</Label>
          <Input
            id="start-time"
            type="time"
            value={formData.startTime}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="end-time">End Time</Label>
          <Input
            id="end-time"
            type="time"
            value={formData.endTime}
            onChange={(e) =>
              setFormData({ ...formData, endTime: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="capacity-total">Total Capacity</Label>
          <Input
            id="capacity-total"
            type="number"
            value={formData.capacityTotal}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacityTotal: parseInt(e.target.value),
              })
            }
            min="1"
            required
          />
        </div>
        <div>
          <Label htmlFor="capacity-exp">Experienced Capacity</Label>
          <Input
            id="capacity-exp"
            type="number"
            value={formData.capacityExp}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacityExp: parseInt(e.target.value),
              })
            }
            min="0"
            required
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="capacity-inexp">Inexperienced Capacity</Label>
          <Input
            id="capacity-inexp"
            type="number"
            value={formData.capacityInexp}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacityInexp: parseInt(e.target.value),
              })
            }
            min="0"
            required
          />
        </div>
        <div className="col-span-2 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Slot</Button>
        </div>
      </form>
    </div>
  );
}

function SlotCard({ slot }: { slot: any }) {
  const updateSlot = useMutation(api.slots.updateSlot);
  const deleteSlot = useMutation(api.slots.deleteSlot);
  const cancelBooking = useMutation(api.bookings.cancelBooking);

  const handleStatusChange = async (status: "open" | "closed" | "canceled") => {
    try {
      await updateSlot({ slotId: slot._id, status });
      toast.success("Slot status updated!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update slot",
      );
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this slot? All bookings will be canceled.",
      )
    ) {
      return;
    }

    try {
      await deleteSlot({ slotId: slot._id });
      toast.success("Slot deleted successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete slot",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-yellow-100 text-yellow-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card
      className={
        slot.status === "closed"
          ? "bg-brand-red/10 border-brand-red/40 text-brand-black"
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {formatTime(slot.startsAtUtc)} - {formatTime(slot.endsAtUtc)}
          </CardTitle>
          <Badge className={`${getStatusColor(slot.status)}`}>
            {slot.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-brand-gray">Experienced:</span>
            <Badge
              className={`${slot.availableExp > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {slot.bookedExp} / {slot.capacityExp}
            </Badge>
          </div>
          {Array.isArray(slot.expBookingsList) &&
            slot.expBookingsList.length > 0 && (
              <div className="pl-6 text-xs text-gray-700 break-words space-y-1">
                {slot.expBookingsList.map((b: any) => (
                  <div
                    key={b.bookingId}
                    className="flex items-center justify-left"
                  >
                    <Button
                      onClick={() => {
                        if (confirm(`Cancel booking for ${b.name}?`)) {
                          void cancelBooking({
                            bookingId: b.bookingId as Id<"bookings">,
                          })
                            .then(() =>
                              toast.success(`Canceled booking for ${b.name}`),
                            )
                            .catch((err) =>
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to cancel",
                              ),
                            );
                        }
                      }}
                      title="Cancel booking"
                      aria-label={`Cancel booking for ${b.name}`}
                      variant="ghost"
                      className="mr-2 text-red-700 border border-red-200 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      Cancel
                    </Button>
                    <span>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-brand-gray">Inexperienced:</span>
            <Badge
              className={`${slot.availableInexp > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {slot.bookedInexp} / {slot.capacityInexp}
            </Badge>
          </div>
          {Array.isArray(slot.inexpBookingsList) &&
            slot.inexpBookingsList.length > 0 && (
              <div className="pl-6 text-xs text-gray-700 break-words space-y-1">
                {slot.inexpBookingsList.map((b: any) => (
                  <div
                    key={b.bookingId}
                    className="flex items-center justify-left"
                  >
                    <Button
                      onClick={() => {
                        if (confirm(`Cancel booking for ${b.name}?`)) {
                          void cancelBooking({
                            bookingId: b.bookingId as Id<"bookings">,
                          })
                            .then(() =>
                              toast.success(`Canceled booking for ${b.name}`),
                            )
                            .catch((err) =>
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to cancel",
                              ),
                            );
                        }
                      }}
                      title="Cancel booking"
                      aria-label={`Cancel booking for ${b.name}`}
                      variant="ghost"
                      className="mr-2 text-red-700 border border-red-200 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      Cancel
                    </Button>
                    <span>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-brand-gray">Total:</span>
            <Badge className="bg-brand-gold/20 text-brand-black">
              {slot.totalBooked} / {slot.capacityTotal}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {slot.status === "open" ? (
          <>
            <Button
              onClick={() => void handleStatusChange("closed")}
              title="Close slot"
              aria-label="Close slot"
              className="w-full bg-brand-black text-white hover:bg-black/90"
            >
              Close slot
            </Button>
            <Button
              onClick={() => void handleDelete()}
              title="Delete slot"
              aria-label="Delete slot"
              variant="destructive"
              className="w-full"
            >
              Delete slot
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => void handleStatusChange("open")}
              title="Open slot"
              aria-label="Open slot"
              className="w-full bg-brand-black text-white hover:bg-black/90"
            >
              Open slot
            </Button>
            <Button
              onClick={() => void handleDelete()}
              title="Delete slot"
              aria-label="Delete slot"
              variant="destructive"
              className="w-full"
            >
              Delete slot
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function LiftersTab() {
  const lifters = useQuery(api.users.getAllLifters);
  const updateUserStatus = useMutation(api.users.updateUserStatus);

  const handleStatusChange = async (
    userId: Id<"users">,
    status: "active" | "frozen",
  ) => {
    try {
      await updateUserStatus({ userId, status });
      toast.success("User status updated!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-4">Manage Lifters</h2>

      {!lifters || lifters.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No lifters found.</p>
      ) : (
        <div className="space-y-4">
          {lifters.map((lifter: any) => (
            <Card
              key={lifter._id}
              className={`${
                lifter.status === "active"
                  ? "bg-secondary border-brand-gold/40 text-brand-black"
                  : "bg-brand-red/5 border-brand-red/40 text-brand-black"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{lifter.name}</CardTitle>
                    <CardDescription className="mt-0.5">
                      {lifter.email}
                    </CardDescription>
                    <CardDescription className="mt-1">
                      {lifter.experienceLevel} • Weekly Quota:{" "}
                      {lifter.weeklyQuota || 0} • Joined:{" "}
                      {new Date(lifter.joinedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="justify-end pt-0">
                {lifter.status === "active" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-red-700 border border-red-200 hover:bg-red-50"
                    title="Freeze lifter"
                    aria-label={`Freeze ${lifter.name}`}
                    onClick={() =>
                      void handleStatusChange(lifter._id, "frozen")
                    }
                  >
                    Freeze
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-green-700 border border-green-200 hover:bg-green-50"
                    title="Activate lifter"
                    aria-label={`Activate ${lifter.name}`}
                    onClick={() =>
                      void handleStatusChange(lifter._id, "active")
                    }
                  >
                    Activate
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PoliciesTab() {
  const policies = useQuery(api.policies.getAllPolicies);
  const updatePolicy = useMutation(api.policies.updatePolicy);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEdit = (key: string, value: string) => {
    setEditingPolicy(key);
    setEditValue(value);
  };

  const handleSave = async (key: string) => {
    try {
      await updatePolicy({ key, value: editValue });
      setEditingPolicy(null);
      toast.success("Policy updated!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update policy",
      );
    }
  };

  const getPolicyDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      cancellationCutoffHours:
        "Hours before session start when cancellation is no longer allowed",
      defaultWeeklyQuotaExperienced:
        "Default weekly booking quota for experienced lifters",
      defaultWeeklyQuotaInexperienced:
        "Default weekly booking quota for inexperienced lifters",
      maxFutureBookings: "Maximum number of future bookings a lifter can have",
      waitlistOfferTimeoutMinutes:
        "Minutes a lifter has to accept a waitlist offer",
      gymTimezone: "Timezone for the gym (e.g., America/New_York)",
      defaultWorkingHours:
        "Default working hours per day as comma-separated ranges (e.g., 09:00 - 14:00, 17:00-22:00)",
    };
    return descriptions[key] || "";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-4">System Policies</h2>

      {!policies || policies.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No policies found.</p>
      ) : (
        <div className="space-y-4">
          {policies.map((policy: any) => (
            <div key={policy.key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{policy.key}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {getPolicyDescription(policy.key)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last updated: {new Date(policy.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {editingPolicy === policy.key ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32 px-2 py-1 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleSave(policy.key)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingPolicy(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="font-mono">
                        {policy.value}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleEdit(policy.key, policy.value)}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  });

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthlyReport = useQuery(api.reports.getMonthlyReport, { year, month });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Monthly Reports</h2>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        {!monthlyReport ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {monthlyReport.totalBookings}
                </div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div className="bg-secondary rounded-lg p-4">
                <div className="text-2xl font-bold text-brand-black">
                  {monthlyReport.completedBookings}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="bg-secondary rounded-lg p-4">
                <div className="text-2xl font-bold text-brand-black">
                  {monthlyReport.utilizationRate}%
                </div>
                <div className="text-sm text-gray-500">Utilization Rate</div>
              </div>
              <div className="bg-secondary rounded-lg p-4">
                <div className="text-2xl font-bold text-brand-black">
                  {monthlyReport.uniqueLifters}
                </div>
                <div className="text-sm text-gray-500">Active Lifters</div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Booking Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Canceled by Lifter:</span>
                    <span>{monthlyReport.canceledByLifter}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Canceled by Admin:</span>
                    <span>{monthlyReport.canceledByAdmin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late Cancellations:</span>
                    <span>{monthlyReport.lateCancellations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No Shows:</span>
                    <span>{monthlyReport.noShows}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Capacity Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Slots:</span>
                    <span>{monthlyReport.totalSlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Capacity:</span>
                    <span>{monthlyReport.totalCapacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fill Rate at Cutoff:</span>
                    <span>{monthlyReport.fillRateAtCutoff}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quota Compliance:</span>
                    <span>{monthlyReport.quotaComplianceRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
