import axios from "axios";
import type { ListResponse } from "../types/admin";
import { BASE_URL } from "./api";

export const SESSION_KEY = "vna-admin-session";
export const api = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 15000 });
let token: string | null = null;
export function setToken(value: string | null) {
  token = value;
}
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/auth/admin/login"
    )
      window.dispatchEvent(new Event("admin-session-expired"));
    return Promise.reject(error);
  },
);
export function changed() {
  window.dispatchEvent(new Event("admin-data-changed"));
}
export function query(
  path: string,
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return `${path}?${search}`;
}
export async function allPages<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let pages = 1;
  do {
    const { data } = await api.get<ListResponse<T>>(
      query(path, { page, limit: 100 }),
      { signal },
    );
    items.push(...data.data);
    pages = data.pagination.pages;
    page++;
  } while (page <= pages);
  return items;
}
export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error))
    return error instanceof Error
      ? error.message
      : "Chưa thực hiện được thao tác. Vui lòng thử lại.";
  if (!error.response)
    return "Chưa kết nối được với hệ thống. Kiểm tra kết nối rồi thử lại.";
  const status = error.response.status;
  if (status === 401)
    return "Thông tin đăng nhập không đúng hoặc phiên đã hết hạn.";
  if (status === 403) return "Tài khoản không có quyền thực hiện thao tác này.";
  if (status === 404)
    return "Không tìm thấy dữ liệu. Có thể nội dung đã được thay đổi.";
  if (status === 413)
    return "Ảnh vượt quá dung lượng 5 MB. Hãy chọn ảnh nhỏ hơn.";
  if (error.response.data?.code === "REFUND_QUERY_UNVERIFIED" &&
      typeof error.response.data?.message === "string")
    return error.response.data.message;
  if (status === 502)
    return "Chưa xác định được kết quả từ dịch vụ. Hãy kiểm tra trạng thái trước khi thử lại.";
  if (status === 503)
    return "Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ người quản lý hệ thống.";
  if (status >= 500)
    return "Hệ thống chưa xử lý được yêu cầu. Vui lòng thử lại.";
  const raw = error.response.data?.message;
  if (
    typeof raw === "string" &&
    /[À-ỹĐđ]/.test(raw) &&
    !/\/api\/|payload|Mongo|Server|ValidationError/i.test(raw)
  ) {
    const fields: Record<string, string> = {
      maxGuestsPerBooking: "giới hạn khách mỗi đơn",
      bookingDeadline: "hạn nhận đặt",
      departureAt: "giờ khởi hành",
      departureId: "chuyến khởi hành",
      tourId: "tour",
      destinationIds: "điểm đến liên quan",
      durationHours: "thời lượng",
      adultPrice: "giá người lớn",
      childPrice: "giá trẻ em",
      discountType: "hình thức giảm",
      discountValue: "mức giảm",
      maxDiscount: "mức giảm tối đa",
      minOrderValue: "giá trị đơn tối thiểu",
      validFrom: "ngày bắt đầu",
      validUntil: "ngày hết hạn",
      usageLimit: "giới hạn lượt dùng",
      usedCount: "lượt sử dụng",
      isActive: "thiết lập sử dụng",
      status: "trạng thái",
      slug: "đường dẫn",
      sources: "nguồn tham khảo",
      images: "hình ảnh",
      checkedAt: "ngày kiểm tra nguồn",
      zp_trans_id: "mã giao dịch thanh toán",
      boolean: "giá trị bật hoặc tắt",
    };
    return raw.replace(
      /\b(maxGuestsPerBooking|bookingDeadline|departureAt|departureId|tourId|destinationIds|durationHours|adultPrice|childPrice|discountType|discountValue|maxDiscount|minOrderValue|validFrom|validUntil|usageLimit|usedCount|isActive|status|slug|sources|images|checkedAt|zp_trans_id|boolean)\b/g,
      (value) => fields[value],
    );
  }
  return status === 409
    ? "Dữ liệu đã thay đổi hoặc thao tác chưa phù hợp. Hãy tải lại để kiểm tra."
    : "Kiểm tra lại thông tin đã nhập và thử lại.";
}
