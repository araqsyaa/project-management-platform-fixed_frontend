import React, { useState } from 'react';
import { t } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { User, Mail, Lock, Globe, Save } from 'lucide-react';
import { Language } from '../i18n/translations';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isProfileDirty = user
    ? name !== user.name || email !== user.email
    : false;

  const isChangePasswordValid =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSaveProfile = () => {
    if (!isProfileDirty) {
      toast.error('No changes to save', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
      return;
    }

    // Here you would normally send the patch to an API.
    toast.success('Profile updated successfully', {
      style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
    });
  };

  const handleChangePassword = () => {
    if (!isChangePasswordValid) {
      toast.error('Enter matching passwords to change password', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
      return;
    }

    toast.success('Password changed successfully', {
      style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
    });

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl">{t.settings}</h1>

      {/* Profile Section */}
      <Card className="border-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t.profile}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback 
                className="text-2xl"
                style={{ backgroundColor: '#6246EA', color: '#FFFFFE' }}
              >
                {user?.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{user?.name}</h3>
              <p className="text-sm text-foreground/60 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>

          <Separator className="bg-foreground/10" />

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-foreground/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-foreground/20"
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={!isProfileDirty}>
            <Save className="mr-2 h-4 w-4" />
            {t.saveChanges}
          </Button>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="border-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t.changePassword}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="border-foreground/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-foreground/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-foreground/20"
            />
          </div>

          <Button onClick={handleChangePassword} disabled={!isChangePasswordValid}>
            {t.changePassword}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}