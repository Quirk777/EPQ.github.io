'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import '../../../globals.css';

interface BrandingSettings {
  has_logo: boolean;
  active_variant: 'original' | 'transparent' | 'monochrome';
  logo_url: string;
  accent_color: string;
  use_accent_color: boolean;
  watermark: {
    enabled: boolean;
    opacity: number;
    position: string;
  };
  company_name: string;
  uploaded_at?: string;
}

interface UploadResponse {
  success: boolean;
  variants: Record<string, string>;
  metadata: {
    dimensions: { width: number; height: number };
    has_transparency: boolean;
    dominant_color: string;
  };
  preview_urls: Record<string, string>;
}

export default function BrandingPage() {
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [preview, setPreview] = useState<UploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string>('transparent');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      const res = await fetch('/api/employer/branding', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.branding);
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
      const res = await fetch('/api/employer/branding/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Upload failed');
      }
      
      const data = await res.json();
      setPreview(data);
      setSelectedVariant('transparent');
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const applyVariant = async () => {
    try {
      const res = await fetch('/api/employer/branding/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_variant: selectedVariant }),
        credentials: 'include'
      });

      if (res.ok) {
        alert('Logo variant applied! Refresh the page to see changes.');
        setPreview(null);
        loadBranding();
      }
    } catch (err) {
      alert('Failed to apply variant');
    }
  };

  const deleteBranding = async () => {
    if (!confirm('Are you sure you want to remove your company logo?')) return;

    try {
      const res = await fetch('/api/employer/branding', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Logo removed successfully');
        loadBranding();
      }
    } catch (err) {
      alert('Failed to delete logo');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="surface-texture-fine" style={{ 
        minHeight: '60vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'var(--surface-0)',
        color: 'var(--text-secondary)'
      }}>
        Loading branding settings...
      </div>
    );
  }

  return (
    <div className="surface-texture-fine" style={{ 
      backgroundColor: 'var(--surface-0)', 
      minHeight: '100vh' 
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 40 }}>
        {/* Navigation Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-default)'
        }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/employer/dashboard" style={navigationButton()}>
              ← Dashboard
            </Link>
            <Link href="/employer/profile" style={navigationButton()}>
              Profile
            </Link>
            <span style={{
              padding: '6px 12px',
              backgroundColor: 'var(--accent-blue)',
              color: 'var(--surface-0)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600
            }}>
              Branding
            </span>
          </nav>
        </div>

        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 800, 
          marginBottom: 8, 
          color: 'var(--text-primary)' 
        }}>
          Company Branding
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: 40, 
          fontSize: 15 
        }}>
          Customize your workspace with your company logo. It will appear in the dashboard,
          navigation, and reports.
        </p>

        {/* Upload Section */}
        <section style={styles.card} className="surface-texture-subtle">
          <h2 style={{ 
            fontSize: 20, 
            fontWeight: 700, 
            marginBottom: 16,
            color: 'var(--text-primary)'
          }}>
            Company Logo
          </h2>
          
          {!settings?.has_logo && !preview ? (
            <div 
              style={{
                ...styles.uploadZone,
                border: dragActive ? '2px dashed var(--accent-blue)' : '2px dashed var(--border-default)',
                backgroundColor: dragActive ? 'var(--accent-blue-glow)' : 'var(--surface-2)'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                id="logo-upload"
                disabled={uploading}
              />
              <label htmlFor="logo-upload" style={styles.uploadButton}>
                {uploading ? 'Processing...' : '📁 Choose File or Drag & Drop'}
              </label>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-secondary)', 
                marginTop: 12 
              }}>
                PNG or JPG • Max 5MB • Recommended: 800×200px
              </p>
            </div>
          ) : settings?.has_logo && !preview ? (
            <div>
              <div style={{ 
                border: '1px solid var(--border-default)', 
                padding: 20, 
                borderRadius: 8, 
                backgroundColor: 'var(--surface-2)', 
                display: 'inline-block' 
              }}>
                <Image 
                  src={settings.logo_url} 
                  alt="Company logo" 
                  width={300} 
                  height={75} 
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                  id="logo-replace"
                  disabled={uploading}
                />
                <label htmlFor="logo-replace" style={{ ...styles.button, ...styles.buttonSecondary, cursor: 'pointer' }}>
                  Replace Logo
                </label>
                <button onClick={deleteBranding} style={{ ...styles.button, ...styles.buttonDanger }}>
                  Remove Logo
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Preview Variants */}
        {preview && (
          <section style={styles.card} className="surface-texture-subtle">
            <h2 style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              marginBottom: 8,
              color: 'var(--text-primary)'
            }}>
              Choose Logo Variant
            </h2>
            <p style={{ 
              fontSize: 14, 
              color: 'var(--text-secondary)', 
              marginBottom: 20 
            }}>
              We've automatically generated variations. Select which one to use:
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {['original', 'transparent', 'monochrome'].map(variant => (
                <div 
                  key={variant} 
                  style={{
                    ...styles.variantCard,
                    border: selectedVariant === variant ? '2px solid var(--accent-blue)' : '1px solid var(--border-default)',
                    backgroundColor: selectedVariant === variant ? 'var(--accent-blue-glow)' : 'var(--surface-2)'
                  }}
                  onClick={() => setSelectedVariant(variant)}
                  className="surface-texture-micro"
                >
                  <div style={{ 
                    backgroundColor: 'var(--surface-0)', 
                    padding: 20, 
                    borderRadius: 4, 
                    marginBottom: 12, 
                    minHeight: 80, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Image 
                      src={preview.preview_urls[variant]} 
                      alt={variant}
                      width={200}
                      height={50}
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </div>
                  <h3 style={{ 
                    fontSize: 15, 
                    fontWeight: 600, 
                    marginBottom: 4,
                    color: 'var(--text-primary)'
                  }}>
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </h3>
                  <p style={{ 
                    fontSize: 13, 
                    color: 'var(--text-secondary)' 
                  }}>
                    {variant === 'transparent' ? 'Background removed' : 
                     variant === 'monochrome' ? 'Grayscale version' : 
                     'Original upload'}
                  </p>
                </div>
              ))}
            </div>
            
            <button 
              onClick={applyVariant}
              style={{ ...styles.button, ...styles.buttonPrimary, marginTop: 20 }}
            >
              Apply Selected Variant
            </button>
          </section>
        )}

        {/* Info Section */}
        {settings?.has_logo && (
          <section style={styles.card} className="surface-texture-subtle">
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              marginBottom: 12,
              color: 'var(--text-primary)'
            }}>
              Where Your Logo Appears
            </h3>
            <ul style={{ 
              fontSize: 14, 
              color: 'var(--text-secondary)', 
              lineHeight: 1.8, 
              paddingLeft: 20 
            }}>
              <li>Dashboard navigation header</li>
              <li>Sidebar (when expanded)</li>
              <li>PDF reports (future)</li>
            </ul>
            
            {settings.uploaded_at && (
              <p style={{ 
                fontSize: 13, 
                color: 'var(--text-tertiary)', 
                marginTop: 16 
              }}>
                Uploaded: {new Date(settings.uploaded_at).toLocaleDateString()}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--surface-1)',
    border: '1px solid var(--border-default)',
    borderRadius: 12,
    padding: 32,
    marginBottom: 24,
    position: 'relative' as const,
    backdropFilter: 'blur(8px)',
  } as const,
  
  uploadZone: {
    border: '2px dashed var(--border-default)',
    borderRadius: 8,
    padding: 60,
    textAlign: 'center' as const
  },
  
  uploadButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: 'var(--accent-blue)',
    color: 'var(--surface-0)',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    border: 'none',
    transition: 'all 0.2s'
  } as const,
  
  variantCard: {
    borderRadius: 8,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s'
  } as const,
  
  button: {
    padding: '10px 20px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  } as const,
  
  buttonPrimary: {
    backgroundColor: 'var(--accent-blue)',
    color: 'var(--surface-0)'
  } as const,
  
  buttonSecondary: {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)'
  } as const,
  
  buttonDanger: {
    backgroundColor: 'rgba(196, 137, 137, 0.15)',
    color: 'var(--color-error)',
    border: '1px solid rgba(196, 137, 137, 0.3)'
  } as const
};

function navigationButton() {
  return {
    padding: '6px 12px',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid var(--border-default)',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4
  } as const;
}
