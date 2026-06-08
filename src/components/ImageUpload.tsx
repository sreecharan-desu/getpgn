import React, { useState, useRef } from 'react';
import { ImagePlus, X, AlertTriangle, RefreshCw } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  imageUrl: string | null;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelected,
  imageUrl,
  onClear,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const validateAndSelectFile = (file: File | undefined) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a JPG, JPEG, or PNG image.');
      return;
    }
    const limitBytes = 10 * 1024 * 1024;
    if (file.size > limitBytes) {
      setError('File size too large. Please upload an image smaller than 10MB.');
      return;
    }
    setError(null);
    onImageSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full text-ink">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png"
        onChange={handleChange}
      />

      {!imageUrl ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`group relative flex min-h-[min(400px,58vh)] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border px-6 py-12 transition-all duration-300 select-none ${
            isDragActive
              ? 'border-ink/30 bg-surface shadow-[var(--shadow-pop)]'
              : 'border-line/60 bg-surface/30 hover:border-line-strong hover:bg-surface/50'
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,var(--color-paper)_0%,transparent_55%)] opacity-80"
            aria-hidden
          />

          <div
            className={`relative mb-5 grid h-12 w-12 place-items-center rounded-full border transition-all duration-300 ${
              isDragActive
                ? 'border-ink bg-ink text-paper'
                : 'border-line bg-paper text-muted group-hover:border-line-strong group-hover:text-ink'
            }`}
          >
            <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <h3 className="relative mb-1.5 text-center text-[16px] font-semibold tracking-tight text-ink">
            {isDragActive ? 'Drop to upload' : 'Upload scoresheet'}
          </h3>

          <p className="relative max-w-[16rem] text-center text-[13px] leading-relaxed text-muted">
            Drag and drop or click to browse. A clear, well-lit photo works best.
          </p>

          <p className="relative mt-5 text-[11px] font-medium tracking-wide text-muted-2">
            JPG · PNG · up to 10MB
          </p>

          {error && (
            <div className="relative mt-6 flex max-w-sm items-center gap-2 rounded-xl border border-[#fda4af] bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger gp-fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="group relative overflow-hidden rounded-[20px] border border-line/50 bg-surface-2/20">
            <div className="flex min-h-[min(320px,48vh)] items-center justify-center p-4 sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Scoresheet preview"
                className="max-h-[min(440px,48vh)] w-full rounded-xl object-contain shadow-[var(--shadow-soft)]"
              />
            </div>

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
              <span className="rounded-full border border-line/60 bg-paper/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted backdrop-blur-md">
                Preview
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={onButtonClick}
                  title="Replace image"
                  aria-label="Replace image"
                  className="grid h-8 w-8 place-items-center rounded-full border border-line/60 bg-paper/90 text-muted backdrop-blur-md transition-colors hover:border-line-strong hover:text-ink cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  title="Remove image"
                  aria-label="Remove image"
                  className="grid h-8 w-8 place-items-center rounded-full border border-line/60 bg-paper/90 text-muted backdrop-blur-md transition-colors hover:border-danger hover:bg-danger-bg hover:text-danger cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
