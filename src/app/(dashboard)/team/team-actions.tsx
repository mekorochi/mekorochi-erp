"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCog, Power, KeyRound } from "lucide-react";
import { toggleUserStatus, resetUserPassword } from "./actions";

export function TeamActions({
  userId,
  isActive,
  role,
}: {
  userId: string;
  isActive: boolean;
  role: string;
}) {
  const handleToggle = async () => {
    if (role === "OWNER") return;
    await toggleUserStatus(userId);
  };

  const handleReset = async () => {
    const result = await resetUserPassword(userId);
    if (result?.tempPassword) {
      alert(`Temporary password: ${result.tempPassword}\nPlease share securely.`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleReset}>
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password
        </DropdownMenuItem>
        {role !== "OWNER" && (
          <DropdownMenuItem
            onClick={handleToggle}
            className={!isActive ? "text-green-700" : "text-destructive"}
          >
            <Power className="h-4 w-4 mr-2" />
            {isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
