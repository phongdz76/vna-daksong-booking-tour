import Photo from "./Photo";
import type { ImageAsset } from "../../types/api";
import { imageCaption } from "../../utils/imageUrl";

export interface ImageGalleryProps {
  images: ImageAsset[];
  title?: string;
  className?: string;
}

export default function ImageGallery({
  images,
  title,
  className = "",
}: ImageGalleryProps) {
  if (!images?.length) return null;

  return (
    <div className={`destination-gallery ${className}`}>
      {images.map((image, index) => {
        const caption = image.alt?.trim() || imageCaption(image.url);
        return (
        <figure className="destination-gallery-item" key={`${image.url}-${index}`}>
          <Photo
            className="destination-gallery-photo"
            src={image.url}
            alt={caption || title || `Ảnh du lịch Đắk Song ${index + 1}`}
          />
          {caption && (
            <figcaption className="destination-gallery-caption">
              {caption}
            </figcaption>
          )}
        </figure>
        );
      })}
    </div>
  );
}
