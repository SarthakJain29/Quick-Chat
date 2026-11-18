import { v2 as cloudinary } from "cloudinary";
import type { Config } from "../config.js";
import { badRequest } from "../errors.js";

const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export interface MediaService {
  readonly kind: "cloudinary" | "inline";
  upload(dataUrl: string): Promise<string>;
}

/** Validates an image data URL: type allow-list + decoded size cap. */
export function validateImageDataUrl(dataUrl: string): void {
  if (!DATA_URL.test(dataUrl)) throw badRequest("Only PNG, JPEG, WebP or GIF images are supported");
  const bytes = Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  if (bytes > MAX_IMAGE_BYTES) throw badRequest("Image is too large (max 3 MB)");
}

export function createMedia(cfg: Config["cloudinary"]): MediaService {
  if (cfg.cloudName && cfg.apiKey && cfg.apiSecret) {
    cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret });
    return {
      kind: "cloudinary",
      async upload(dataUrl) {
        validateImageDataUrl(dataUrl);
        try {
          return (await cloudinary.uploader.upload(dataUrl, { folder: "quickchat" })).secure_url;
        } catch {
          throw new Error("Image upload failed, please try again");
        }
      },
    };
  }
  // No Cloudinary: keep the image inline. Fine for demos, see developer.md for trade-offs.
  return {
    kind: "inline",
    async upload(dataUrl) {
      validateImageDataUrl(dataUrl);
      return dataUrl;
    },
  };
}
