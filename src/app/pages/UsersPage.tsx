import React, { useState } from 'react';
import { t } from '../i18n/translations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Role, User } from '../data/mockData';
import { useUsers } from '../api/useApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { users, loading, error } = useUsers();

  const [userList, setUserList] = useState<User[]>(users);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('team_member');

  React.useEffect(() => {
    setUserList(users);
  }, [users]);

  const filteredUsers = userList.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'administrator': return '#E45858';
      case 'project_manager': return '#6246EA';
      case 'team_member': return '#2CB67D';
      case 'viewer': return '#D1D1E9';
      default: return '#2B2C34';
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'administrator': return t.administrator;
      case 'project_manager': return t.projectManager;
      case 'team_member': return t.teamMember;
      case 'viewer': return t.viewer;
      default: return role;
    }
  };

  const handleCreateUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
    };

    setUserList((prev) => [newUser, ...prev]);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('team_member');
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{t.usersAndRoles}</h1>
        <Button onClick={() => setIsAddUserOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t.addUser}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        <Input
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-foreground/20"
        />
      </div>

      {/* Users Table */}
      <div className="border rounded-lg border-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>{t.role}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback 
                        style={{ 
                          backgroundColor: '#6246EA', 
                          color: '#FFFFFE' 
                        }}
                      >
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    style={{
                      backgroundColor: getRoleColor(user.role) + '20',
                      color: getRoleColor(user.role)
                    }}
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      style={{ color: '#E45858' }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-foreground/60">{t.noData}</p>
        </div>
      )}

      {isAddUserOpen && (
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.addUser}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Name</Label>
                <Input
                  id="new-user-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter name"
                  className="border-foreground/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email</Label>
                <Input
                  id="new-user-email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Enter email"
                  className="border-foreground/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-role">Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger className="border-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">{t.administrator}</SelectItem>
                    <SelectItem value="project_manager">{t.projectManager}</SelectItem>
                    <SelectItem value="team_member">{t.teamMember}</SelectItem>
                    <SelectItem value="viewer">{t.viewer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleCreateUser}>{t.saveChanges}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}