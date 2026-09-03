'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Upload, X, Loader2, ShieldAlert, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Profile, Token } from '@/lib/types';
import {
  fetchCurrentUserProfile,
  updateProfile,
  uploadAvatar,
  changeUsername,
  changeEmail,
  changePassword,
  exportAccountData,
  fetchDeletionPreview,
  deleteAccount,
  DISCOVER_GENRES,
  type DeletionPreview,
} from '@/lib/api';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import Image from 'next/image';

const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [form, setForm] = useState({
    name: '',
    location: '',
    bio: '',
    website: '',
  });
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [favoriteGenre, setFavoriteGenre] = useState('');
  const [token, setToken] = useState<Token | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<DeletionPreview | null>(null);
  const [transferChoices, setTransferChoices] = useState<Record<string, string>>({});
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (tokenString) {
      try {
        const jwt = JSON.parse(tokenString);
        setToken(jwt_decode<Token>(jwt?.token || ''));
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    fetchCurrentUserProfile()
      .then(data => {
        if (data) {
          setProfile(data);
          setForm({
            name: data.name || '',
            location: data.location || '',
            bio: data.bio || '',
            website: data.website || '',
          });
          setAvatarPreview(data.avatar || '');
          setIsPublic(!!data.is_public);
          setSlug(data.slug || '');
          setFavoriteGenre(data.favorite_genre || '');
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push(`${apiHost}/profile`);
      });
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }

      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar || '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
    setSlugError('');
  };

  const handleSave = async () => {
    if (slug && (slug.length < 3 || slug.length > 30)) {
      setSlugError('Profile URL must be 3-30 characters.');
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar || '';

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      await updateProfile({
        ...form,
        avatar: avatarUrl,
        is_public: isPublic,
        slug,
        favorite_genre: favoriteGenre,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      router.push('/profile');
    } catch (error: any) {
      if (error.message?.includes('already taken')) {
        setSlugError('That profile URL is already taken.');
      } else if (error.message?.includes('3-30 characters')) {
        setSlugError('Profile URL must be 3-30 characters: lowercase letters, numbers, and hyphens only.');
      } else {
        toast({
          title: 'Update Failed',
          description: error.message || 'Failed to update your profile. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) return;
    setIsChangingUsername(true);
    try {
      await changeUsername(newUsername.trim());
      toast({ title: 'Username updated' });
      setNewUsername('');
    } catch (error: any) {
      toast({ title: 'Failed to change username', description: error.message, variant: 'destructive' });
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setIsChangingEmail(true);
    try {
      await changeEmail(newEmail.trim());
      toast({ title: 'Check your new email to confirm', description: `We sent a confirmation link to ${newEmail.trim()}.` });
      setNewEmail('');
    } catch (error: any) {
      toast({ title: 'Failed to change email', description: error.message, variant: 'destructive' });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({ title: 'Password updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast({ title: 'Failed to change password', description: error.message, variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportAccountData();
    } catch (error: any) {
      toast({ title: 'Failed to export data', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const openDeleteConfirm = async () => {
    setShowDeleteConfirm(true);
    setIsLoadingPreview(true);
    try {
      const preview = await fetchDeletionPreview();
      setDeletionPreview(preview);
    } catch (error: any) {
      toast({ title: 'Failed to load deletion preview', description: error.message, variant: 'destructive' });
      setShowDeleteConfirm(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const allTransfersChosen = !deletionPreview || deletionPreview.stations_needing_transfer.every(
    s => !!transferChoices[s.station_id]
  );

  const handleDeleteAccount = async () => {
    if (!deletionPreview || !allTransfersChosen || !deleteConfirmValue) return;
    setIsDeletingAccount(true);
    try {
      await deleteAccount({
        currentPassword: token?.has_password ? deleteConfirmValue : undefined,
        confirmationPhrase: !token?.has_password ? deleteConfirmValue : undefined,
        ownershipTransfers: deletionPreview.stations_needing_transfer.map(s => ({
          station_id: s.station_id,
          new_owner_user_id: transferChoices[s.station_id],
        })),
      });
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('authChange'));
      toast({ title: 'Account deleted' });
      router.push('/');
    } catch (error: any) {
      toast({ title: 'Failed to delete account', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Your location"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              rows={4}
            />
          </div>

          <div>
            <Label>Avatar</Label>
            <div className="space-y-4">
              {avatarPreview && (
                <div className="relative w-24 h-24">
                  {avatarPreview.startsWith('data:') ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <Image
                      src={`${apiHost}${avatarPreview}`}
                      alt="Avatar preview"
                      fill
                      className="rounded-full object-cover border-2 border-border"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                    onClick={removeAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {avatarFile ? 'Change Avatar' : 'Upload Avatar'}
                </Button>
                {avatarFile && (
                  <span className="text-sm text-muted-foreground">
                    {avatarFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max file size: 5MB. Supported formats: PNG, JPG, GIF
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="favorite-genre">Favorite Genre</Label>
            <Select value={favoriteGenre} onValueChange={setFavoriteGenre}>
              <SelectTrigger id="favorite-genre" className="mt-1">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {DISCOVER_GENRES.map(genre => (
                  <SelectItem key={genre} value={genre} className="capitalize">{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="slug">Profile URL</Label>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">onwave.andruquinn.com/profile/</span>
              <Input
                id="slug"
                value={slug}
                onChange={handleSlugChange}
                placeholder={profile?.user_id || 'your-name'}
                maxLength={30}
              />
            </div>
            {slugError ? (
              <p className="text-xs text-destructive mt-1">{slugError}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Optional. Leave blank to keep your default link. Lowercase letters, numbers, and hyphens only.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is-public">Public Profile</Label>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? 'Anyone with your profile link can view your name, bio, and badges.'
                  : 'Only you can see your profile. Turn this on to let others view it.'}
              </p>
            </div>
            <Switch id="is-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-username">Username</Label>
            <div className="flex items-center gap-2">
              <Input id="new-username" placeholder="New username" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
              <Button size="sm" onClick={handleChangeUsername} disabled={isChangingUsername || !newUsername.trim()}>
                {isChangingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <p className="text-xs text-muted-foreground">Changing your email requires confirming the new address before it takes effect.</p>
            <div className="flex items-center gap-2">
              <Input id="new-email" type="email" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              <Button size="sm" onClick={handleChangeEmail} disabled={isChangingEmail || !newEmail.trim()}>
                {isChangingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          <Separator />

          {token?.has_password ? (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <Input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <Input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
              >
                {isChangingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Change Password
              </Button>
            </div>
          ) : (
            <div>
              <Label>Password</Label>
              <p className="text-sm text-muted-foreground mt-1">Signed in with Google — no password to change.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Export your data</p>
              <p className="text-sm text-muted-foreground">Download everything associated with your account as a JSON file.</p>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export
            </Button>
          </div>

          <Separator />

          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Delete account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account. This cannot be undone.</p>
              </div>
              <Button variant="destructive" onClick={openDeleteConfirm}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Account
              </Button>
            </div>
          ) : isLoadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your stations...
            </div>
          ) : deletionPreview && (
            <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              {deletionPreview.stations_needing_transfer.map(s => (
                <div key={s.station_id} className="space-y-1">
                  <Label>Who should become the new owner of {s.station_name}?</Label>
                  <Select
                    value={transferChoices[s.station_id] || ''}
                    onValueChange={v => setTransferChoices(prev => ({ ...prev, [s.station_id]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {s.other_members.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.name || 'Unnamed'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {deletionPreview.stations_to_archive.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {deletionPreview.stations_to_archive.map(s => s.station_name).join(', ')} will be archived since you're the only member.
                </p>
              )}

              <div className="space-y-1">
                <Label>{token?.has_password ? 'Enter your current password to confirm' : 'Type DELETE to confirm'}</Label>
                <Input
                  type={token?.has_password ? 'password' : 'text'}
                  value={deleteConfirmValue}
                  onChange={e => setDeleteConfirmValue(e.target.value)}
                  placeholder={token?.has_password ? 'Current password' : 'DELETE'}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || !allTransfersChosen || !deleteConfirmValue}
                >
                  {isDeletingAccount ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Permanently Delete Account
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}