import Icon from "../common/Icon";

export default function BookingSteps({ step }: { step: 1 | 2 }) {
  return (
    <div className="booking-steps" aria-label={`Bước ${step} trên 2`}>
      <div className={step === 1 ? "current" : "done"}>
        <span>{step === 2 ? <Icon name="check" size={16} /> : "1"}</span>
        <p>
          <small>BƯỚC 1</small>Chọn chuyến
        </p>
      </div>
      <i />
      <div className={step === 2 ? "current" : ""}>
        <span>2</span>
        <p>
          <small>BƯỚC 2</small>Kiểm tra
        </p>
      </div>
    </div>
  );
}
