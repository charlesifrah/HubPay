import { useAuth } from "@/hooks/use-auth";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  onSidebarToggle: () => void;
}

export function Header({ title, onSidebarToggle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSidebarToggle}
        className="px-4 border-r border-gray-200 text-gray-500 md:hidden"
      >
        <Menu />
      </Button>

      <div className="flex-1 flex justify-between px-4">
        <div className="flex-1 flex items-center">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <Button
            variant="ghost"
            size="icon"
            className="p-1 rounded-full text-gray-500 hover:text-gray-700"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <div className="ml-3 relative md:hidden">
            <div className="flex items-center max-w-xs text-sm rounded-full text-gray-700">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-600 font-medium text-sm">
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "U"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
