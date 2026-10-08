import Icon from "../common/Icon";

export default function RatingStars({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  return (
    <span
      className="review-stars"
      role="img"
      aria-label={value.toFixed(1) + " trên 5 sao"}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          className="review-star"
          style={{ width: size, height: size }}
          key={star}
        >
          <Icon name="star" size={size} />
          <span
            className="review-star-fill"
            style={{
              width: Math.max(0, Math.min(1, value - star + 1)) * 100 + "%",
            }}
          >
            <Icon name="star" size={size} />
          </span>
        </span>
      ))}
    </span>
  );
}
