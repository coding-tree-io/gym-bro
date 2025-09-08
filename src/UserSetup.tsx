import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function UserSetup() {
  const [formData, setFormData] = useState({
    name: "",
    role: "lifter" as "admin" | "lifter",
    experienceLevel: "inexperienced" as "experienced" | "inexperienced",
  });

  const createUserProfile = useMutation(api.users.createUserProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      await createUserProfile({
        name: formData.name,
        email: "user@example.com", // This would come from auth in a real app
        role: formData.role,
        experienceLevel: formData.role === "lifter" ? formData.experienceLevel : undefined,
      });
      
      toast.success("Profile created successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create profile");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Complete Your Profile</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <option value="lifter">Lifter</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {formData.role === "lifter" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience Level
              </label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="inexperienced">Inexperienced</option>
                <option value="experienced">Experienced</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                This determines your booking capacity and weekly quota
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-brand-black text-white py-2 px-4 rounded-md hover:bg-brand-grayDark focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            Complete Setup
          </button>
        </form>
      </div>
    </div>
  );
}
