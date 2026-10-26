import { ShieldCheck, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Skeleton } from '@project/components/ui/skeleton';
import UsersTab from '../components/admin/UsersTab';
import IpBansTab from '../components/admin/IpBansTab';
import ReportsTab from '../components/admin/ReportsTab';
import { AuditTab } from '../components/admin/ModerationTabs';
import { usePermissions } from '../hooks/usePermissions';

export default function AdminDashboardPage() {
  const { has, loading } = usePermissions();
  if (loading) return <div className="p-6"><Skeleton className="h-64" /></div>;
  if (!has('dashboard.view')) return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6">
      <Lock className="w-8 h-8 text-muted-foreground" />
      <h2 className="font-semibold">Staff only</h2>
      <p className="text-sm text-muted-foreground">You need the Moderator or Admin role to open the dashboard.</p>
    </div>
  );
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Admin Dashboard</h1><p className="text-xs text-muted-foreground">Every action here is logged.</p></div>
      </div>
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="ips">IP bans</TabsTrigger>
          {has('audit.view') && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>
        <TabsContent value="users"><UsersTab canAssign={has('roles.assign')} /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="ips"><IpBansTab /></TabsContent>
        {has('audit.view') && <TabsContent value="audit"><AuditTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
