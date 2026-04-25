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
import { User, Mail, Lock, Globe, Save, Eye, EyeOff } from 'lucide-react';
import { Language } from '../i18n/translations';
import { toast } from 'sonner';
import { api } from '../api/client';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isProfileDirty = user
    ? name !== user.name || email !== user.email
    : false;

  const isChangePasswordValid =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSaveProfile = async () => {
    if (!isProfileDirty) {
      toast.error('No changes to save', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
      return;
    }

    try {
      await api.logActivity({
        type: 'settings',
        title: 'Profile settings updated',
        message: `${user?.name || 'User'} updated profile settings`,
        targetPath: '/settings',
      });
      toast.success('Profile updated successfully', {
        style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to record profile update', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
    }
  };

  const handleChangePassword = async () => {
    if (!isChangePasswordValid) {
      toast.error('Enter matching passwords to change password', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
      return;
    }

    try {
      await api.logActivity({
        type: 'settings',
        title: 'Password changed',
        message: `${user?.name || 'User'} changed account password`,
        targetPath: '/settings',
      });

      toast.success('Password changed successfully', {
        style: { backgroundColor: '#2CB67D', color: '#FFFFFE' },
      });

      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to record password change', {
        style: { backgroundColor: '#E45858', color: '#FFFFFE' },
      });
    }
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
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setShowNewPassword(true)}
                onBlur={() => setShowNewPassword(false)}
                className="border-foreground/20 pr-10"
              />
              {newPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-foreground/60" />
                  ) : (
                    <Eye className="h-4 w-4 text-foreground/60" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setShowConfirmPassword(true)}
                onBlur={() => setShowConfirmPassword(false)}
                className="border-foreground/20 pr-10"
              />
              {confirmPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-foreground/60" />
                  ) : (
                    <Eye className="h-4 w-4 text-foreground/60" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <Button onClick={handleChangePassword} disabled={!isChangePasswordValid}>
            {t.changePassword}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
