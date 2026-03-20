import { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { LogOut, Settings, SlidersHorizontal, User as UserIcon } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface UserMenuUser {
  name: string;
  email: string;
  profile_photo_url?: string | null;
}

interface Props {
  user: UserMenuUser;
}

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-brand-dark/30"
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.profile_photo_url ? (
          <img
            src={user.profile_photo_url}
            alt={user.name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <span className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-brand-dark/10 text-sm font-semibold text-brand-dark ring-2 ring-white/20">
            {getInitials(user.name)}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute end-0 z-50 mt-2 w-52 rounded-xl border border-border bg-popover py-1 shadow-lg duration-150">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>

          <Link
            href={route('profile.edit')}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            Profile
          </Link>

          <Link
            href={route('profile.edit')}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </Link>

          <Link
            href={route('notification-preferences.index')}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Notification preferences
          </Link>

          <div className="mt-1 border-t border-border pt-1">
            <Link
              href={route('logout')}
              method="post"
              as="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => setOpen(false)}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

