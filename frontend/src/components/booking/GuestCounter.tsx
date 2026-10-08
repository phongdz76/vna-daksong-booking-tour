import Icon from "../common/Icon";

export default function GuestCounter({
  label,
  description,
  value,
  minimum,
  maximum,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  minimum: number;
  maximum: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="guest-counter">
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <div className="counter-controls">
        <button
          type="button"
          className="icon-button"
          aria-label={`Giảm ${label.toLowerCase()}`}
          disabled={value <= minimum}
          onClick={() => onChange(value - 1)}
        >
          <Icon name="minus" size={17} />
        </button>
        <output aria-label={`Số ${label.toLowerCase()}`}>{value}</output>
        <button
          type="button"
          className="icon-button"
          aria-label={`Tăng ${label.toLowerCase()}`}
          disabled={value >= maximum}
          onClick={() => onChange(value + 1)}
        >
          <Icon name="plus" size={17} />
        </button>
      </div>
    </div>
  );
}
