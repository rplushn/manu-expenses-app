# 🚀 Quick Start: Company Logo Feature

## Step 1: Run Database Migration

Open Supabase SQL Editor and run:

```sql
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS empresa_logo_url TEXT;
```

## Step 2: Create Storage Bucket

**In Supabase Dashboard:**

1. Go to **Storage** → **Create new bucket**
2. Configuration:
   - **Name:** `company-logos`
   - **Public bucket:** ✅ Yes (enable public access)
   - **File size limit:** `2097152` (2MB)
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg`
3. Click **Create bucket**

**Or via SQL:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
);
```

## Step 3: Set Storage Policies

Run in Supabase SQL Editor:

```sql
-- Public read access
CREATE POLICY "Public read access for company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Users can upload their own logos
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 4: Upload Logo in App

1. Open app → Go to **Profile** tab
2. Tap **Información de empresa**
3. **NEW!** See "Logo de la empresa" section at top
4. Tap **Subir logo** button
5. Grant photo library permission (if asked)
6. Select image from gallery
7. Crop to square (1:1 aspect ratio)
8. Wait for upload (shows loading)
9. ✅ Logo preview appears!

## Step 5: View Logo in Invoice

1. Go to **Facturas** tab
2. Tap any invoice
3. **NEW!** See your logo at top of invoice header!

```
┌─────────────────────────┐
│      ┌─────────┐        │
│      │  LOGO   │        │ ← Your logo!
│      └─────────┘        │
│                         │
│  RPLUS INVERSIONES...   │
│  RTN: 08011990123456    │
│  CAI: ABC-123...        │
└─────────────────────────┘
```

## What's New?

### ✨ Logo Upload in Profile

**Location:** Profile → Información de empresa → Top of form

**Features:**
- Upload button
- Logo preview (100x100px)
- File validation (PNG/JPG, max 2MB)
- Square cropping (1:1 aspect ratio)
- Replace existing logo

### 📄 Logo in Invoices

**Invoice Detail Screen:**
- Logo at top of company header
- Centered, 100x100px
- Above company name

**PDF Export:**
- Logo included in PDF
- Professional appearance
- Print-ready

## File Requirements

| Property | Value |
|----------|-------|
| **Format** | PNG, JPEG, JPG |
| **Max size** | 2MB |
| **Aspect ratio** | 1:1 (square) |
| **Recommended** | 200x200px or larger |
| **Display size** | 100x100px |

## Upload Flow

```
Tap "Subir logo"
    ↓
Grant permissions
    ↓
Select image from gallery
    ↓
Crop to square
    ↓
Upload to Supabase Storage
    ↓
Save URL to database
    ↓
Logo appears in preview
    ↓
Logo appears in invoices
```

## Storage Structure

```
Supabase Storage
└── company-logos/
    ├── {your-user-id}/
    │   └── logo.png
    └── {other-user-id}/
        └── logo.jpg
```

**URL Format:**
```
https://{project}.supabase.co/storage/v1/object/public/company-logos/{user-id}/logo.png
```

## Examples

### Example 1: Upload PNG Logo
```
1. Tap "Subir logo"
2. Select company-logo.png (500KB)
3. Crop to square
4. Upload ✅
5. Logo displays in profile
6. Logo displays in invoices
```

### Example 2: Replace Existing Logo
```
1. See current logo in preview
2. Tap "Cambiar logo"
3. Select new-logo.jpg (1.5MB)
4. Crop to square
5. Upload ✅
6. New logo replaces old one
```

### Example 3: File Too Large
```
1. Tap "Subir logo"
2. Select huge-logo.png (3MB)
3. ❌ Alert: "El archivo es muy grande. Máximo 2MB."
4. Select smaller file
```

## Troubleshooting

### Logo not uploading?
**Check:**
1. File size < 2MB
2. File type is PNG or JPG
3. Internet connection active
4. Storage bucket created
5. Storage policies set

### Logo not showing in invoice?
**Check:**
1. Logo uploaded successfully
2. empresa_logo_url saved in database
3. Reload invoice detail screen
4. Check console for errors

### Permission denied error?
**Check:**
1. Granted photo library access
2. Storage policies created
3. User is authenticated
4. Bucket is public

### Logo looks stretched?
**Solution:**
- Use square images (1:1 aspect ratio)
- Crop during upload
- Recommended: 200x200px or larger

## Console Output

### Successful Upload
```
📤 Uploading logo: abc123-def456/logo.png
✅ Logo uploaded: https://...supabase.co/.../logo.png
```

### Failed Upload
```
📤 Uploading logo: abc123-def456/logo.png
❌ Upload error: {
  message: "File size exceeds limit",
  code: "413"
}
```

## Files Changed

- ✅ `add_empresa_logo_field.sql` - Database & storage setup
- ✅ `src/lib/store.ts` - Type definition
- ✅ `src/app/(tabs)/profile.tsx` - Upload UI
- ✅ `src/app/invoices/[id].tsx` - Display logo

## Dependencies

- ✅ `expo-image-picker` - Already installed
- ✅ `expo-image` - Already installed
- ✅ Supabase Storage - Already configured

## Summary

**Before:**
- No logo support
- Text-only invoice headers
- Basic company branding

**After:**
- ✅ Logo upload in profile
- ✅ Logo in invoice headers
- ✅ Logo in PDF exports
- ✅ Professional branding
- ✅ Secure storage
- ✅ Easy to use

**Status:** Ready to use! 🎉

---

**Next Steps:**
1. Run database migration
2. Create storage bucket
3. Set storage policies
4. Upload your company logo!

