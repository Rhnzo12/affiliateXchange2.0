import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UppyFile, UploadResult } from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import XHRUpload from "@uppy/xhr-upload";
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
    }).use(XHRUpload, {
      endpoint: "placeholder", // Will be updated before upload
      method: "POST",
      formData: true,
      fieldName: "file",
      responseType: "json",
      allowedMetaFields: [
        "upload_preset",
        "signature",
        "timestamp",
        "api_key",
        "folder",
        "resource_type",
      ],
      getResponseData: (xhr: XMLHttpRequest) => {
        try {
          const text = xhr.responseText;
          const parsed = text ? JSON.parse(text) : xhr.response;
          if (parsed && typeof parsed === "object") {
            return {
              ...parsed,
              uploadURL: parsed.secure_url || parsed.url,
            };
          }
          return parsed ?? {};
        } catch (error) {
          console.error("Failed to parse upload response", error, xhr.responseText);
          return xhr.response ?? {};
        }
      },
    })
  );

  useEffect(() => {
    const handleFileAdded = async (file: UppyFile) => {
      try {
        const params = await onGetUploadParameters();
        const xhrUpload = uppy.getPlugin<XHRUpload>("XHRUpload") as XHRUpload | undefined;

        if (xhrUpload) {
          xhrUpload.setOptions({ endpoint: params.uploadUrl });
        }

        const meta: Record<string, any> = {};
        if (params.uploadPreset) {
          meta.upload_preset = params.uploadPreset;
        } else if (params.signature) {
          meta.signature = params.signature;
          if (params.timestamp) {
            meta.timestamp = params.timestamp.toString();
          }
          if (params.apiKey) {
            meta.api_key = params.apiKey;
          }
        }

        if (params.folder) {
          meta.folder = params.folder;
        }

        const resourceType = file.type?.startsWith("video")
          ? "video"
          : file.type?.startsWith("image")
            ? "image"
            : "auto";
        meta.resource_type = resourceType;

        uppy.setFileMeta(file.id, meta);
      } catch (error) {
        console.error("Failed to get upload parameters", error);
        uppy.info("Failed to prepare upload. Please try again.", "error", 5000);
        uppy.removeFile(file.id);
      }
    };

    const handleComplete = (
      result: UploadResult<Record<string, unknown>, Record<string, unknown>>
    ) => {
      if (result.failed.length > 0 && result.successful.length === 0) {
        uppy.info("Upload failed. Please try again.", "error", 5000);
        return;
      }

      if (result.successful.length > 0) {
        setShowModal(false);
        onComplete?.(result);
        uppy.reset();
      }
    };

    const handleUploadError = (
      file: UppyFile,
      error: Error,
      response?: { status?: number; body?: Record<string, unknown> }
    ) => {
      const cloudinaryMessage =
        (response?.body as { error?: { message?: string } })?.error?.message;
      const message = cloudinaryMessage || error.message || "Upload failed. Please try again.";
      console.error("Upload error", error, response, file);
      uppy.info(message, "error", 7000);
    };

    uppy.on("file-added", handleFileAdded);
    uppy.on("complete", handleComplete);
    uppy.on("upload-error", handleUploadError);

    return () => {
      uppy.off("file-added", handleFileAdded);
      uppy.off("complete", handleComplete);
      uppy.off("upload-error", handleUploadError);
    };
  }, [onComplete, onGetUploadParameters, uppy]);

  useEffect(() => {
    return () => {
      uppy.close({ reason: "unmount" });
    };
  }, [uppy]);

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
