'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/lib/types';
import { fetchCurrentUserProfile } from '@/lib/api';
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

  useEffect(() => {
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

      // Validate file size (max 5MB)
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

  const uploadAvatar = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${apiHost}/profile/avatar`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    const result = await response.json();
    return result.avatarUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar || '';

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const tokenData = localStorage.getItem('token');
      const token = tokenData ? JSON.parse(tokenData).token : null;


      const response = await fetch(`${apiHost}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          avatar: avatarUrl,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
        });
        router.push('/profile');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://..."
            />
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
    </div>
  );
}