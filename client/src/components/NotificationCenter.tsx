import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  MessageSquare, 
  DollarSign, 
  Star, 
  FileText,
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const response = await fetch("/api/notifications", {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
}

async function fetchUnreadCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread/count", {
    credentials: "include",
  });
  if (!response.ok) return 0;
  const data = await response.json();
  return data.count;
}

async function markAsRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  });
}

async function markAllAsRead(): Promise<void> {
  await fetch("/api/notifications/read-all", {
    method: "POST",
    credentials: "include",
  });
}

async function deleteNotification(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

async function clearAllNotifications(): Promise<void> {
  await fetch("/api/notifications", {
    method: "DELETE",
    credentials: "include",
  });
}

export function NotificationCenter() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread/count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconProps = { className: "h-5 w-5" };
    switch (type) {
      case "new_message":
        return <MessageSquare {...iconProps} />;
      case "application_status_change":
      case "offer_approved":
      case "registration_approved":
        return <Check {...iconProps} className="h-5 w-5 text-green-600" />;
      case "payment_received":
        return <DollarSign {...iconProps} className="h-5 w-5 text-green-600" />;
      case "new_application":
        return <FileText {...iconProps} />;
      case "review_received":
        return <Star {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case "system_announcement":
        return <Bell {...iconProps} className="h-5 w-5 text-blue-600" />;
      case "offer_rejected":
      case "registration_rejected":
        return <X {...iconProps} className="h-5 w-5 text-red-600" />;
      case "work_completion_approval":
        return <Check {...iconProps} className="h-5 w-5 text-green-600" />;
      case "priority_listing_expiring":
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="h-8 text-xs"
                data-testid="button-mark-all-read"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAllMutation.mutate()}
                className="h-8 text-xs"
                data-testid="button-clear-all"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b last:border-0 transition-colors ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
                }`}
              >
                <div className="p-4 hover:bg-accent/50 cursor-pointer group relative">
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    className="pr-8"
                    data-testid="notification-item"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification.id);
                    }}
                    data-testid="button-delete-notification"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
