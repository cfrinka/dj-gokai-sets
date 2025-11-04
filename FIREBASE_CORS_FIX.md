# Fix Firebase Storage CORS Error

The download button is failing due to CORS (Cross-Origin Resource Sharing) restrictions on Firebase Storage.

## Solution: Configure CORS on Firebase Storage

### Prerequisites
- Install Google Cloud SDK (gcloud CLI)
- Download from: https://cloud.google.com/sdk/docs/install

### Steps to Fix

1. **Install Google Cloud SDK** (if not already installed)
   - Windows: Download and run the installer from the link above
   - Follow the installation wizard

2. **Authenticate with Google Cloud**
   ```bash
   gcloud auth login
   ```

3. **Set your Firebase project**
   ```bash
   gcloud config set project bene-brasil-533af
   ```

4. **Apply CORS configuration**
   ```bash
   gcloud storage buckets update gs://bene-brasil-533af.firebasestorage.app --cors-file=cors.json
   ```

   Or use the older gsutil command:
   ```bash
   gsutil cors set cors.json gs://bene-brasil-533af.firebasestorage.app
   ```

5. **Verify the configuration**
   ```bash
   gcloud storage buckets describe gs://bene-brasil-533af.firebasestorage.app --format="default(cors_config)"
   ```

### What the CORS file does

The `cors.json` file allows:
- All origins (`*`) to access your files
- GET and HEAD methods (for downloading/viewing)
- Caches the CORS policy for 1 hour

### Alternative: Restrict to specific domains

If you want to restrict access to only your domain, edit `cors.json`:

```json
[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

Then reapply the configuration.

## After Applying CORS

Once CORS is configured, the Download button in the admin page will work without errors.
