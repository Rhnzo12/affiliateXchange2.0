import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import XHRUpload from "@uppy/xhr-upload";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface CloudinaryUploadParams {
  uploadUrl: string;
  uploadPreset?: string;
  signature?: string;
  timestamp?: number;
  apiKey?: string;
  folder?: string;
}

interface CloudinaryUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<CloudinaryUploadParams>;
  onComplete?: (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => void;
  buttonClassName?: string;
  children: ReactNode;
  allowedFileTypes?: string[];
}

export function CloudinaryUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 524288000, // 500MB for videos
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  allowedFileTypes = ['video/*', 'image/*'],
}: CloudinaryUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : undefined,
      },
      autoProceed: false,
    })
      .use(XHRUpload, {
        endpoint: 'placeholder', // Will be set dynamically
        method: 'POST',
        formData: true,
        fieldName: 'file',
        getResponseData: (responseText: string) => {
          const response = JSON.parse(responseText);
          return {
            uploadURL: response.secure_url,
            publicId: response.public_id,
          };
        },
      })
      .on('file-added', async () => {
        // Get upload parameters when file is added
        const params = await onGetUploadParameters();

        // Update the endpoint
        const xhrUpload = uppy.getPlugin('XHRUpload');
        if (xhrUpload) {
          // @ts-ignore - accessing private property
          xhrUpload.opts.endpoint = params.uploadUrl;
        }

        // Set form data fields for Cloudinary
        uppy.setMeta({
          upload_preset: params.uploadPreset,
          signature: params.signature,
          timestamp: params.timestamp,
          api_key: params.apiKey,
          folder: params.folder,
        });
      })
      .on('upload', (data) => {
        // Add Cloudinary parameters to each file
        data.fileIDs.forEach((fileId) => {
          const file = uppy.getFile(fileId);
          const meta = uppy.getState().meta;

          // Build form data for Cloudinary
          const formData: Record<string, any> = {};

          if (meta.upload_preset) {
            formData.upload_preset = meta.upload_preset;
          } else if (meta.signature) {
            formData.signature = meta.signature;
            formData.timestamp = meta.timestamp;
            formData.api_key = meta.apiKey;
          }

          if (meta.folder) {
            formData.folder = meta.folder;
          }

          uppy.setFileMeta(fileId, formData);
        });
      })
      .on('complete', (result) => {
        onComplete?.(result);
      })
  );

  return (
    <div>
      <Button
        onClick={() => setShowModal(true)}
        className={buttonClassName}
        data-testid="button-upload"
        type="button"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
