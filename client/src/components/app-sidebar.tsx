import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  TrendingUp,
  FileText,
  MessageSquare,
  Heart,
  Settings,
  DollarSign,
  Star,
  Building2,
  Users,
  ShieldCheck,
  Zap,
  ChevronDown,
  LogOut,
} from "lucide-react";

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  const creatorItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Browse Offers",
      url: "/browse",
      icon: TrendingUp,
    },
    {
      title: "My Applications",
      url: "/applications",
      icon: FileText,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: TrendingUp,
    },
    {
      title: "Messages",
      url: "/messages",
      icon: MessageSquare,
    },
    {
      title: "Favorites",
      url: "/favorites",
      icon: Heart,
    },
  ];

  const companyItems = [
    {
      title: "Dashboard",
      url: "/company",
      icon: Home,
    },
    {
      title: "My Offers",
      url: "/company/offers",
      icon: TrendingUp,
    },
    {
      title: "Applications",
      url: "/company/applications",
      icon: FileText,
    },
    {
      title: "Creators",
      url: "/company/creators",
      icon: Users,
    },
    {
      title: "Analytics",
      url: "/company/analytics",
      icon: TrendingUp,
    },
    {
      title: "Messages",
      url: "/company/messages",
      icon: MessageSquare,
    },
    {
      title: "Reviews",
      url: "/company/reviews",
      icon: Star,
    },
  ];

  const adminItems = [
    {
      title: "Dashboard",
      url: "/admin",
      icon: Home,
    },
    {
      title: "Company Approvals",
      url: "/admin/companies",
      icon: Building2,
    },
    {
      title: "Offer Approvals",
      url: "/admin/offers",
      icon: TrendingUp,
    },
    {
      title: "Review Management",
      url: "/admin/reviews",
      icon: Star,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
    },
  ];

  const getMenuItems = () => {
    if (user?.role === 'company') return companyItems;
    if (user?.role === 'admin') return adminItems;
    return creatorItems;
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">CreatorLink</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {user?.role === 'company' ? 'Company Portal' : user?.role === 'admin' ? 'Admin Panel' : 'Creator Portal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/settings'} data-testid="nav-settings">
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === '/payment-settings'} data-testid="nav-payment-settings">
                  <Link href="/payment-settings">
                    <DollarSign className="h-4 w-4" />
                    <span>Payment Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full hover-elevate p-2 rounded-md" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || ''} alt={user?.firstName || 'User'} />
                <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{user?.firstName || user?.email || 'User'}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role || 'creator'}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
