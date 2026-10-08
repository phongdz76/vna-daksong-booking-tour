import type { Destination } from "../../types/api";
import AppLink from "../common/AppLink";
import Photo from "../common/Photo";
import Icon from "../common/Icon";
import { themeLabels } from "../../utils/format";

export default function DestinationCard({
  destination,
  variant = "cover",
  distanceKm,
  featured = false,
  saved = false,
  onToggleSaved,
}: {
  destination: Destination;
  variant?: "cover" | "explore";
  distanceKm?: number;
  featured?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  if (variant === "explore")
    return (
      <article className="explore-destination-card">
        <AppLink to={`/destinations/${destination._id}`}>
          <div className="explore-destination-image">
            <Photo
              src={destination.images?.[0]?.url}
              alt={destination.images?.[0]?.alt || destination.name}
            />
            {featured && (
              <span className="explore-featured">
                <Icon name="leaf" size={12} /> Hot
              </span>
            )}
          </div>
          <div className="explore-destination-body">
            <h3 title={destination.name}>{destination.name}</h3>
            <p>
              <Icon name="direction" size={14} />
              <span title={destination.address}>
                {distanceKm !== undefined
                  ? `Cách trung tâm ${distanceKm}km`
                  : destination.address || themeLabels[destination.category]}
              </span>
            </p>
          </div>
        </AppLink>
      </article>
    );
  return (
    <AppLink
      className="destination-card"
      to={`/destinations/${destination._id}`}
    >
      <Photo
        src={destination.images?.[0]?.url}
        alt={destination.images?.[0]?.alt || destination.name}
      />
      <div className="destination-overlay">
        <h3>{destination.name}</h3>
      </div>
    </AppLink>
  );
}
