"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

interface UserAccountButtonProps {
  clerkEnabled: boolean;
}

function FallbackAvatar() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
      <User className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

export function UserAccountButton({ clerkEnabled }: UserAccountButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!clerkEnabled || !mounted) {
    return <FallbackAvatar />;
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-7 w-7",
        },
      }}
    />
  );
}
