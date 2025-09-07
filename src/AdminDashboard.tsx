import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "slots" | "lifters" | "policies" | "reports">("overview");
  
  const dashboardStats = useQuery(api.admin.getDashboardStats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your gym operations</p>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <nav className="flex space-x-8 px-6">
          {[
            { key: "overview", label: "Overview" },
            { key: "slots", label: "Manage Slots" },
            { key: "lifters", label: "Manage Lifters" },
            { key: "policies", label: "Policies" },
            { key: "reports", label: "Reports" },
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
          <div className="text-2xl font-bold text-gray-900">{stats?.totalLifters || 0}</div>
          <div className="text-sm text-gray-500">Total Lifters</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-gray-900">{stats?.activeSlots || 0}</div>
          <div className="text-sm text-gray-500">Active Slots</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-gray-900">{stats?.totalBookings || 0}</div>
          <div className="text-sm text-gray-500">Weekly Bookings</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-gray-900">{stats?.complianceRate || 0}%</div>
          <div className="text-sm text-gray-500">Quota Compliance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-2xl font-bold text-gray-900">{stats?.utilizationRate || 0}%</div>
          <div className="text-sm text-gray-500">Utilization Rate</div>
        </div>
      </div>

      {/* Unbooked Lifters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Lifters Below Quota This Week</h2>
        {!unbookedLifters || unbookedLifters.length === 0 ? (
          <p className="text-gray-500">All lifters are meeting their quota!</p>
        ) : (
          <div className="space-y-3">
            {unbookedLifters.slice(0, 10).map((lifter: any) => (
              <div key={lifter._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{lifter.name}</div>
                  <div className="text-sm text-gray-600">{lifter.email}</div>
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
    return today.toISOString().split('T')[0];
  });
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const selectedDateTime = new Date(selectedDate).getTime();
  const nextDay = selectedDateTime + 24 * 60 * 60 * 1000;
  const slots = useQuery(api.slots.getSlots, {
    from: selectedDateTime,
    to: nextDay,
  });

  // Preload prev/next day slots for swipe preview
  const dayMs = 24 * 60 * 60 * 1000;
  const prevSlots = useQuery(api.slots.getSlots, { from: selectedDateTime - dayMs, to: selectedDateTime });
  const nextSlots = useQuery(api.slots.getSlots, { from: nextDay, to: nextDay + dayMs });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Manage Slots</h2>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create Slot
            </button>
          </div>
        </div>

        {showCreateForm && (
          <CreateSlotForm 
            selectedDate={selectedDate}
            onClose={() => setShowCreateForm(false)} 
          />
        )}

        {(() => {
          let touchStartX = 0;
          let touchEndX = 0;
          const swipeThreshold = 50;
          const onTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
          const onTouchMove = (e: React.TouchEvent) => { touchEndX = e.touches[0].clientX; };
          const onTouchEnd = () => {
            const delta = touchEndX - touchStartX;
            if (Math.abs(delta) > swipeThreshold) {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + (delta < 0 ? 1 : -1));
              setSelectedDate(d.toISOString().split('T')[0]);
            }
          };

          const prevDateStr = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
          const nextDateStr = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();

          const renderAdminSlotList = (list: any[]) => {
            if (!list || list.length === 0) return <p className="text-gray-500 text-center py-4">No slots</p>;
            return (
              <div className="space-y-3">
                {list.map((slot: any) => (
                  <SlotCard key={slot._id} slot={slot} />
                ))}
              </div>
            );
          };

          return (
            <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <div className="flex items-start gap-4">
                <div className="basis-1/3 opacity-60 hover:opacity-80 transition" onClick={() => setSelectedDate(prevDateStr)}>
                  <div className="bg-white border rounded-lg shadow-sm">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-700 text-center rounded-t-lg">
                      {new Date(prevDateStr).toLocaleDateString(undefined, { weekday: 'long' })}
                    </div>
                    <div className="px-3 py-2 text-sm text-gray-600 text-center">
                      {new Date(prevDateStr).toLocaleDateString()}
                    </div>
                    <div className="p-3 border-t">
                      {renderAdminSlotList(prevSlots || [])}
                    </div>
                  </div>
                </div>
                <div className="basis-1/3">
                  <div className="bg-white border rounded-lg shadow-sm">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-900 text-center rounded-t-lg">
                      {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}
                    </div>
                    <div className="px-3 py-2 text-sm text-gray-700 text-center">
                      {new Date(selectedDate).toLocaleDateString()}
                    </div>
                    <div className="p-3 border-t">
                      {renderAdminSlotList(slots || [])}
                    </div>
                  </div>
                </div>
                <div className="basis-1/3 opacity-60 hover:opacity-80 transition" onClick={() => setSelectedDate(nextDateStr)}>
                  <div className="bg-white border rounded-lg shadow-sm">
                    <div className="px-3 py-2 text-sm font-semibold text-gray-700 text-center rounded-t-lg">
                      {new Date(nextDateStr).toLocaleDateString(undefined, { weekday: 'long' })}
                    </div>
                    <div className="px-3 py-2 text-sm text-gray-600 text-center">
                      {new Date(nextDateStr).toLocaleDateString()}
                    </div>
                    <div className="p-3 border-t">
                      {renderAdminSlotList(nextSlots || [])}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function CreateSlotForm({ selectedDate, onClose }: { selectedDate: string; onClose: () => void }) {
  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "10:00",
    capacityTotal: 10,
    capacityExp: 5,
    capacityInexp: 5,
  });

  const createSlot = useMutation(api.slots.createSlot);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const startDateTime = new Date(`${selectedDate}T${formData.startTime}`).getTime();
      const endDateTime = new Date(`${selectedDate}T${formData.endTime}`).getTime();

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
      toast.error(error instanceof Error ? error.message : "Failed to create slot");
    }
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Create New Slot</h3>
      <form onSubmit={(e) => { void handleSubmit(e); }} className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Capacity</label>
          <input
            type="number"
            value={formData.capacityTotal}
            onChange={(e) => setFormData({ ...formData, capacityTotal: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experienced Capacity</label>
          <input
            type="number"
            value={formData.capacityExp}
            onChange={(e) => setFormData({ ...formData, capacityExp: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            required
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Inexperienced Capacity</label>
          <input
            type="number"
            value={formData.capacityInexp}
            onChange={(e) => setFormData({ ...formData, capacityInexp: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            required
          />
        </div>
        <div className="col-span-2 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Slot
          </button>
        </div>
      </form>
    </div>
  );
}

function SlotCard({ slot }: { slot: any }) {
  const updateSlot = useMutation(api.slots.updateSlot);
  const deleteSlot = useMutation(api.slots.deleteSlot);

  const handleStatusChange = async (status: "open" | "closed" | "canceled") => {
    try {
      await updateSlot({ slotId: slot._id, status });
      toast.success("Slot status updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update slot");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this slot? All bookings will be canceled.")) {
      return;
    }

    try {
      await deleteSlot({ slotId: slot._id });
      toast.success("Slot deleted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete slot");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
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
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div>
              <div className="font-medium text-lg">
                {formatTime(slot.startsAtUtc)} - {formatTime(slot.endsAtUtc)}
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(slot.status)}`}>
              {slot.status}
            </span>
          </div>
          
          <div className="mt-3 flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Experienced:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                slot.availableExp > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {slot.bookedExp} / {slot.capacityExp}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Inexperienced:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                slot.availableInexp > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {slot.bookedInexp} / {slot.capacityInexp}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {slot.totalBooked} / {slot.capacityTotal}
              </span>
            </div>
          </div>
        </div>

        <div className="ml-4 flex items-center space-x-2">
          <select
            value={slot.status}
            onChange={(e) => void handleStatusChange(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="canceled">Canceled</option>
          </select>
          <button
            onClick={() => void handleDelete()}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function LiftersTab() {
  const lifters = useQuery(api.users.getAllLifters);
  const updateUserStatus = useMutation(api.users.updateUserStatus);

  const handleStatusChange = async (userId: Id<"users">, status: "active" | "frozen") => {
    try {
      await updateUserStatus({ userId, status });
      toast.success("User status updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
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
            <div key={lifter._id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-lg">{lifter.name}</div>
                  <div className="text-sm text-gray-600">{lifter.email}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {lifter.experienceLevel} • Weekly Quota: {lifter.weeklyQuota || 0} • 
                    Joined: {new Date(lifter.joinedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    lifter.status === "active" ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {lifter.status}
                  </span>
                  <select
                    value={lifter.status}
                    onChange={(e) => void handleStatusChange(lifter._id, e.target.value as any)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="active">Active</option>
                    <option value="frozen">Frozen</option>
                  </select>
                </div>
              </div>
            </div>
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
      toast.error(error instanceof Error ? error.message : "Failed to update policy");
    }
  };

  const getPolicyDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      cancellationCutoffHours: "Hours before session start when cancellation is no longer allowed",
      defaultWeeklyQuotaExperienced: "Default weekly booking quota for experienced lifters",
      defaultWeeklyQuotaInexperienced: "Default weekly booking quota for inexperienced lifters",
      maxFutureBookings: "Maximum number of future bookings a lifter can have",
      waitlistOfferTimeoutMinutes: "Minutes a lifter has to accept a waitlist offer",
      gymTimezone: "Timezone for the gym (e.g., America/New_York)",
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
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded w-32"
                      />
                      <button
                        onClick={() => void handleSave(policy.key)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPolicy(null)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {policy.value}
                      </span>
                      <button
                        onClick={() => handleEdit(policy.key, policy.value)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
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
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthlyReport = useQuery(api.reports.getMonthlyReport, { year, month });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Monthly Reports</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {!monthlyReport ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{monthlyReport.totalBookings}</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{monthlyReport.completedBookings}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{monthlyReport.utilizationRate}%</div>
                <div className="text-sm text-gray-500">Utilization Rate</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{monthlyReport.uniqueLifters}</div>
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
