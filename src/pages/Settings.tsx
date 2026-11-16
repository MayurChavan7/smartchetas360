
import { Settings as SettingsIcon, Database, Bell, Globe } from "lucide-react";
import PageHeader from "../components/common/PageHeader";

function Settings() {
  const sections = [
    { name: "General Configuration", icon: SettingsIcon },
    { name: "Data Source Configuration", icon: Database },
    { name: "Notification Preferences", icon: Bell },
    { name: "Regional Settings", icon: Globe },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure SMART DAM 360 platform preferences."
      />

      <div className="max-w-3xl space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <div
              key={section.name}
              className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <Icon className="text-cyan-400" size={24} />
              <span className="font-medium text-white">
                {section.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Settings;
